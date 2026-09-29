import { z, ZodError } from "zod";
import {
  enquirySchema,
  statuses,
  terminal,
  followUpDue,
} from "../shared/domain";
import { analyse, type AIProvider } from "./ai";
import {
  event,
  nowFor,
  seedStatements,
  uid,
  unpack,
  type Row,
  type Workspace,
} from "./store";

export interface Env {
  DB: D1Database;
  AI?: AIProvider;
  AI_MODE?: string;
  AI_MODEL?: string;
  AI_DAILY_LIMIT?: string;
}
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const json = (value: unknown, status = 200) => Response.json(value, { status });
const keySchema = z.string().uuid();
const draftSchema = z
  .string()
  .max(2000)
  .refine(
    (value) => value.trim().length > 0,
    "Write a reply before approving.",
  );

async function body(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Use a JSON request.");
  if (Number(request.headers.get("content-length")) > 16000)
    throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is missing.");
  let text = "";
  let size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16000) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    text += decoder.decode(value, { stream: true });
  }
  try {
    return JSON.parse(text + decoder.decode());
  } catch {
    throw new HttpError(400, "Request is not valid JSON.");
  }
}

async function consume(
  db: D1Database,
  bucket: string,
  max: number,
  expires: number,
) {
  const result = await db
    .prepare(
      "INSERT INTO usage(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<? RETURNING count",
    )
    .bind(bucket, expires, max)
    .first();
  if (!result)
    throw new HttpError(
      429,
      "The demo request limit has been reached. Please try again later.",
    );
}
async function workspace(
  request: Request,
  env: Env,
): Promise<{ ws: Workspace; cookie?: string }> {
  const existing = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)rivergum=([a-f0-9-]{36})(?:;|$)/)?.[1];
  if (existing) {
    const ws = await env.DB.prepare(
      "SELECT id,offset_ms FROM workspaces WHERE id=?",
    )
      .bind(existing)
      .first<Workspace>();
    if (ws) return { ws };
  }
  await consume(
    env.DB,
    `workspaces:${Math.floor(Date.now() / 86400000)}`,
    200,
    Date.now() + 2 * 86400000,
  );
  const ws: Workspace = { id: uid(), offset_ms: 0 };
  const time = nowFor(ws);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO workspaces(id,created_at) VALUES(?,?)").bind(
      ws.id,
      time,
    ),
    ...seedStatements(env.DB, ws.id, time),
  ]);
  return {
    ws,
    cookie: `rivergum=${ws.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}
async function getRow(db: D1Database, ws: string, id: string) {
  const row = await db
    .prepare("SELECT * FROM enquiries WHERE workspace_id=? AND id=?")
    .bind(ws, id)
    .first<Row>();
  if (!row)
    throw new HttpError(404, "This enquiry is not in your demo workspace.");
  return row;
}

async function route(request: Request, env: Env, ws: Workspace) {
  const db = env.DB,
    path = new URL(request.url).pathname,
    method = request.method,
    time = nowFor(ws);
  if (method === "GET" && path === "/api/dashboard") {
    const results = await db.batch([
      db
        .prepare(
          "SELECT * FROM enquiries WHERE workspace_id=? ORDER BY updated_at DESC",
        )
        .bind(ws.id),
      db
        .prepare("SELECT * FROM tasks WHERE workspace_id=? ORDER BY due_at")
        .bind(ws.id),
      db
        .prepare(
          "SELECT * FROM outbox WHERE workspace_id=? ORDER BY created_at DESC",
        )
        .bind(ws.id),
    ]);
    return json({
      enquiries: (results[0].results as unknown as Row[]).map(unpack),
      tasks: results[1].results,
      outbox: results[2].results,
      now: time,
      offset: ws.offset_ms,
      mode: env.AI_MODE === "live" ? "live" : "template",
      aiConnected: !!env.AI,
    });
  }
  if (method === "POST" && path === "/api/enquiries") {
    const data = z
      .object({ input: enquirySchema, key: keySchema })
      .strict()
      .parse(await body(request));
    const existing = await db
      .prepare(
        "SELECT * FROM enquiries WHERE workspace_id=? AND submission_key=?",
      )
      .bind(ws.id, data.key)
      .first<Row>();
    if (existing) {
      if (existing.input !== JSON.stringify(data.input))
        throw new HttpError(
          409,
          "This submission was already saved with different details.",
        );
      return json({ id: existing.id });
    }
    const id = uid();
    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO enquiries(id,workspace_id,input,created_at,updated_at,submission_key) VALUES(?,?,?,?,?,?)",
        )
        .bind(id, ws.id, JSON.stringify(data.input), time, time, data.key),
      db
        .prepare(
          "INSERT INTO events(id,workspace_id,enquiry_id,kind,detail,created_at) SELECT ?,?,?, 'submitted','Enquiry saved. No appointment has been booked.',? WHERE EXISTS(SELECT 1 FROM enquiries WHERE id=? AND workspace_id=?)",
        )
        .bind(uid(), ws.id, id, time, id, ws.id),
    ]);
    const saved = await db
      .prepare(
        "SELECT id FROM enquiries WHERE workspace_id=? AND submission_key=?",
      )
      .bind(ws.id, data.key)
      .first<{ id: string }>();
    return json(saved, 201);
  }
  if (method === "POST" && path === "/api/clock") {
    z.object({})
      .strict()
      .parse(await body(request));
    await db
      .prepare(
        "UPDATE workspaces SET offset_ms=MIN(offset_ms+172800000,31536000000) WHERE id=?",
      )
      .bind(ws.id)
      .run();
    return json({ ok: true });
  }
  if (method === "POST" && path === "/api/reset") {
    z.object({ confirm: z.literal(true) })
      .strict()
      .parse(await body(request));
    await consume(
      db,
      `reset:${ws.id}:${Math.floor(Date.now() / 3600000)}`,
      10,
      Date.now() + 86400000,
    );
    await db.batch([
      db.prepare("DELETE FROM enquiries WHERE workspace_id=?").bind(ws.id),
      db.prepare("UPDATE workspaces SET offset_ms=0 WHERE id=?").bind(ws.id),
      ...seedStatements(db, ws.id, new Date().toISOString()),
    ]);
    return json({ ok: true });
  }
  const match = path.match(
    /^\/api\/enquiries\/([a-f0-9-]{36})(?:\/(analysis|draft|approval|status|complete))?$/,
  );
  if (!match) throw new HttpError(404, "Not found.");
  const [, id, action] = match;
  const row = await getRow(db, ws.id, id);
  if (method === "GET" && !action) {
    const results = await db.batch([
      db
        .prepare(
          "SELECT * FROM tasks WHERE workspace_id=? AND enquiry_id=? ORDER BY created_at DESC",
        )
        .bind(ws.id, id),
      db
        .prepare(
          "SELECT * FROM events WHERE workspace_id=? AND enquiry_id=? ORDER BY created_at DESC,rowid DESC",
        )
        .bind(ws.id, id),
      db
        .prepare(
          "SELECT * FROM outbox WHERE workspace_id=? AND enquiry_id=? ORDER BY created_at DESC",
        )
        .bind(ws.id, id),
    ]);
    const enquiry = unpack(row);
    if (
      row.analysis_status === "processing" &&
      Date.now() - (row.analysis_started ?? 0) > 30000
    ) {
      enquiry.analysis_status = "failed";
      enquiry.analysis_error =
        "Analysis was interrupted. Your enquiry is saved; please retry.";
    }
    return json({
      enquiry,
      tasks: results[0].results,
      events: results[1].results,
      outbox: results[2].results,
      now: time,
      offset: ws.offset_ms,
      mode: env.AI_MODE === "live" ? "live" : "template",
      aiConnected: !!env.AI,
    });
  }
  if (method !== "POST") throw new HttpError(405, "Method not allowed.");
  const data = await body(request);
  if (action === "analysis") {
    z.object({}).strict().parse(data);
    if (row.attempts >= 5)
      throw new HttpError(
        429,
        "This enquiry has reached its five analysis attempts. You can still edit and approve a reply.",
      );
    await consume(db, `analysis:${ws.id}`, 500, Date.now() + 8 * 86400000);
    if (env.AI_MODE === "live") {
      await consume(
        db,
        `ai:${ws.id}:${Math.floor(Date.now() / 3600000)}`,
        10,
        Date.now() + 86400000,
      );
      await consume(
        db,
        `ai-global:${Math.floor(Date.now() / 86400000)}`,
        Math.max(1, Math.min(100, Number(env.AI_DAILY_LIMIT) || 50)),
        Date.now() + 2 * 86400000,
      );
    }
    const token = uid();
    const acquired = await db
      .prepare(
        "UPDATE enquiries SET analysis_token=?,analysis_started=?,analysis_status='processing',analysis_error=NULL,attempts=attempts+1 WHERE id=? AND workspace_id=? AND attempts<5 AND (analysis_status!='processing' OR analysis_started<?)",
      )
      .bind(token, Date.now(), id, ws.id, Date.now() - 30000)
      .run();
    if (!acquired.meta.changes)
      throw new HttpError(
        409,
        "Analysis is already running. Please wait briefly and refresh.",
      );
    try {
      const analysis = await analyse(JSON.parse(row.input), {
        mode: env.AI_MODE ?? "template",
        model: env.AI_MODEL,
        provider: env.AI,
      });
      await db.batch([
        db
          .prepare(
            "INSERT INTO events(id,workspace_id,enquiry_id,kind,detail,created_at) SELECT ?,?,?,'analysis',?,? WHERE EXISTS(SELECT 1 FROM enquiries WHERE id=? AND workspace_id=? AND analysis_token=?)",
          )
          .bind(
            uid(),
            ws.id,
            id,
            `${analysis.mode === "live" ? "Live AI" : "Template"} suggestion prepared. Existing edits retained.`,
            time,
            id,
            ws.id,
            token,
          ),
        db
          .prepare(
            "UPDATE enquiries SET analysis=?,analysis_status='complete',analysis_error=NULL,analysis_token=NULL,draft=CASE WHEN draft='' AND draft_edited=0 THEN ? ELSE draft END,updated_at=? WHERE id=? AND workspace_id=? AND analysis_token=?",
          )
          .bind(
            JSON.stringify(analysis),
            analysis.reply,
            time,
            id,
            ws.id,
            token,
          ),
      ]);
      return json({ ok: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Analysis failed. Please retry.";
      await db
        .prepare(
          "UPDATE enquiries SET analysis_status='failed',analysis_error=?,analysis_token=NULL WHERE id=? AND workspace_id=? AND analysis_token=?",
        )
        .bind(message.slice(0, 300), id, ws.id, token)
        .run();
      return json({ error: message }, 502);
    }
  }
  if (action === "draft") {
    const { draft } = z
      .object({ draft: z.string().max(2000) })
      .strict()
      .parse(data);
    await db.batch([
      db
        .prepare(
          "UPDATE enquiries SET draft=?,draft_edited=1,updated_at=? WHERE id=? AND workspace_id=?",
        )
        .bind(draft, time, id, ws.id),
      event(db, ws.id, id, "draft", "Reply draft saved by owner.", time),
    ]);
    return json({ ok: true });
  }
  if (action === "approval") {
    const { draft, key } = z
      .object({ draft: draftSchema, key: keySchema })
      .strict()
      .parse(data);
    const existing = await db
      .prepare(
        "SELECT enquiry_id,body FROM outbox WHERE workspace_id=? AND action_key=?",
      )
      .bind(ws.id, key)
      .first<{ enquiry_id: string; body: string }>();
    if (existing) {
      if (existing.enquiry_id !== id || existing.body !== draft)
        throw new HttpError(
          409,
          "This approval key has already been used for a different reply.",
        );
      return json({ ok: true });
    }
    if (terminal(row.status))
      throw new HttpError(
        409,
        "Reopen this enquiry before approving another reply.",
      );
    const outboxId = uid(),
      input = JSON.parse(row.input);
    // Each dependent write is conditional on this new outbox ID. A racing retry
    // loses INSERT OR IGNORE and therefore performs none of the side effects.
    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO outbox(id,workspace_id,enquiry_id,action_key,body,channel,recipient,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM enquiries WHERE id=? AND workspace_id=? AND status NOT IN ('Won','Closed'))",
        )
        .bind(
          outboxId,
          ws.id,
          id,
          key,
          draft,
          input.contact,
          input.contact === "email" ? input.email : input.phone,
          time,
          id,
          ws.id,
        ),
      db
        .prepare(
          "UPDATE enquiries SET draft=?,draft_edited=1,updated_at=? WHERE id=? AND workspace_id=? AND EXISTS(SELECT 1 FROM outbox WHERE id=?)",
        )
        .bind(draft, time, id, ws.id, outboxId),
      db
        .prepare(
          "INSERT INTO events(id,workspace_id,enquiry_id,kind,detail,created_at) SELECT ?,?,?,'approval','Reply approved to simulated outbox. Nothing was delivered.',? WHERE EXISTS(SELECT 1 FROM outbox WHERE id=?)",
        )
        .bind(uid(), ws.id, id, time, outboxId),
      db
        .prepare(
          "INSERT INTO tasks(id,workspace_id,enquiry_id,due_at,state,created_at) SELECT ?,?,?,?,'open',? WHERE EXISTS(SELECT 1 FROM outbox WHERE id=?) AND NOT EXISTS(SELECT 1 FROM tasks WHERE enquiry_id=? AND workspace_id=? AND state='open')",
        )
        .bind(uid(), ws.id, id, followUpDue(time), time, outboxId, id, ws.id),
    ]);
    const approved = await db
      .prepare(
        "SELECT enquiry_id,body FROM outbox WHERE workspace_id=? AND action_key=?",
      )
      .bind(ws.id, key)
      .first<{ enquiry_id: string; body: string }>();
    if (!approved || approved.enquiry_id !== id || approved.body !== draft)
      throw new HttpError(
        409,
        "The enquiry changed during approval. Refresh and review it before trying again.",
      );
    return json({ ok: true });
  }
  if (action === "status") {
    const { status } = z
      .object({ status: z.enum(statuses) })
      .strict()
      .parse(data);
    const statements = [
      db
        .prepare(
          "UPDATE enquiries SET status=?,updated_at=? WHERE id=? AND workspace_id=?",
        )
        .bind(status, time, id, ws.id),
      event(
        db,
        ws.id,
        id,
        "status",
        status === "Quote sent"
          ? "Owner recorded Quote sent (demo status only; no quote generated or sent)."
          : `Owner changed status to ${status}.`,
        time,
      ),
    ];
    if (terminal(status))
      statements.push(
        db
          .prepare(
            "UPDATE tasks SET state='cancelled' WHERE enquiry_id=? AND workspace_id=? AND state='open'",
          )
          .bind(id, ws.id),
      );
    await db.batch(statements);
    return json({ ok: true });
  }
  if (action === "complete") {
    const { taskId } = z.object({ taskId: keySchema }).strict().parse(data);
    await db.batch([
      db
        .prepare(
          "INSERT INTO events(id,workspace_id,enquiry_id,kind,detail,created_at) SELECT ?,?,?,'follow-up','Owner completed follow-up.',? WHERE EXISTS(SELECT 1 FROM tasks WHERE id=? AND enquiry_id=? AND workspace_id=? AND state='open')",
        )
        .bind(uid(), ws.id, id, time, taskId, id, ws.id),
      db
        .prepare(
          "UPDATE enquiries SET updated_at=? WHERE id=? AND workspace_id=? AND EXISTS(SELECT 1 FROM tasks WHERE id=? AND enquiry_id=? AND workspace_id=? AND state='open')",
        )
        .bind(time, id, ws.id, taskId, id, ws.id),
      db
        .prepare(
          "UPDATE tasks SET state='completed' WHERE id=? AND enquiry_id=? AND workspace_id=? AND state='open'",
        )
        .bind(taskId, id, ws.id),
    ]);
    return json({ ok: true });
  }
  throw new HttpError(404, "Not found.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    let cookie: string | undefined;
    let response: Response;
    try {
      if (request.method !== "GET") {
        const origin = request.headers.get("origin");
        if (
          (origin && origin !== new URL(request.url).origin) ||
          request.headers.get("sec-fetch-site") === "cross-site"
        )
          throw new HttpError(403, "Requests must come from this demo.");
      }
      const session = await workspace(request, env);
      cookie = session.cookie;
      response = await route(request, env, session.ws);
    } catch (error) {
      if (error instanceof ZodError)
        response = json(
          {
            error: error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join(" "),
          },
          400,
        );
      else if (error instanceof HttpError)
        response = json({ error: error.message }, error.status);
      else if (
        error instanceof Error &&
        error.message.includes("limit reached")
      )
        response = json(
          {
            error:
              "Your demo workspace is full. Reset your demo to start again.",
          },
          429,
        );
      else {
        console.error(
          "Request failed",
          error instanceof Error ? error.message : "unknown error",
        );
        response = json(
          {
            error:
              "We could not save or load this request. Your form input is retained; please retry.",
          },
          500,
        );
      }
    }
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    if (cookie) headers.set("Set-Cookie", cookie);
    return new Response(response.body, { status: response.status, headers });
  },
  async scheduled(_event: ScheduledEvent, env: Env) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM workspaces WHERE created_at<?").bind(
        new Date(Date.now() - 7 * 86400000).toISOString(),
      ),
      env.DB.prepare("DELETE FROM usage WHERE expires_at<?").bind(Date.now()),
    ]);
  },
};
