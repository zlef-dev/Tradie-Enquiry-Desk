import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFile } from "node:fs/promises";
import worker, { type Env } from "../worker";
import { sampleEnquiry } from "../shared/domain";

let mf: Miniflare;
let env: Env;
let cookie = "";
async function request(
  path: string,
  data?: unknown,
  options: Partial<Env> = {},
) {
  const response = await worker.fetch(
    new Request(`https://demo.example${path}`, {
      method: data === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
    { ...env, ...options },
  );
  if (response.headers.has("set-cookie"))
    cookie = response.headers.get("set-cookie")!.split(";")[0];
  return response;
}
beforeAll(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: "test",
          modules: true,
          script: 'export default {fetch(){return new Response("test")}}',
          compatibilityDate: "2026-09-29",
          d1Databases: ["DB"],
        },
      ],
    }),
  );
  const db = await mf.getD1Database("DB");
  const migration = await readFile("migrations/0001_initial.sql", "utf8");
  for (const statement of migration
    .split(/;\s*(?:\r?\n|$)/)
    .filter((s) => s.trim()))
    await db.prepare(statement).run();
  env = { DB: db as unknown as D1Database, AI_MODE: "template" };
}, 30000);
afterAll(async () => {
  await mf?.dispose();
});

describe("Worker HTTP API and real local D1", () => {
  it("reports live configuration honestly when the binding is missing", async () => {
    const response = await request("/api/dashboard", undefined, {
      AI_MODE: "live",
      AI: undefined,
    });
    const data = (await response.json()) as {
      mode: string;
      aiConnected: boolean;
    };
    expect(data.mode).toBe("live");
    expect(data.aiConnected).toBe(false);
    cookie = "";
  });
  it("issues a secure production cookie and seeds only once", async () => {
    const first = await request("/api/dashboard");
    expect(first.headers.get("set-cookie")).toContain(
      "HttpOnly; SameSite=Lax; Max-Age=604800; Secure",
    );
    expect(
      ((await first.json()) as { enquiries: unknown[] }).enquiries,
    ).toHaveLength(6);
    expect(
      (
        (await (await request("/api/dashboard")).json()) as {
          enquiries: unknown[];
        }
      ).enquiries,
    ).toHaveLength(6);
  });
  it.each(["malformed", "quota", "missing"])(
    "preserves saved input and edited drafts when live AI fails: %s",
    async (kind) => {
      const { id } = (await (
        await request("/api/enquiries", {
          input: sampleEnquiry,
          key: crypto.randomUUID(),
        })
      ).json()) as { id: string };
      await request(`/api/enquiries/${id}/draft`, {
        draft: "Owner edited this exact draft.",
      });
      const AI =
        kind === "missing"
          ? undefined
          : {
              run: async () => {
                if (kind === "quota") throw new Error("quota exceeded");
                return { response: "not valid JSON" };
              },
            };
      const result = await request(
        `/api/enquiries/${id}/analysis`,
        {},
        { AI_MODE: "live", AI },
      );
      expect(result.status).toBe(502);
      const detail = (await (await request(`/api/enquiries/${id}`)).json()) as {
        enquiry: {
          input: unknown;
          draft: string;
          analysis_status: string;
          analysis: unknown;
        };
      };
      expect(detail.enquiry.input).toEqual(sampleEnquiry);
      expect(detail.enquiry.draft).toBe("Owner edited this exact draft.");
      expect(detail.enquiry.analysis_status).toBe("failed");
      expect(detail.enquiry.analysis).toBeNull();
    },
  );
  it("saves a validated live fixture separately from authoritative fields", async () => {
    const { id } = (await (
      await request("/api/enquiries", {
        input: sampleEnquiry,
        key: crypto.randomUUID(),
      })
    ).json()) as { id: string };
    const AI = {
      run: async () => ({
        response: {
          summary: "Customer reports a dripping kitchen tap.",
          service: "Tap repairs",
          details: ["Dripping since Sunday"],
          missing: ["Property access"],
          reply: "Thanks for your enquiry. Please share the property address.",
        },
      }),
    };
    expect(
      (
        await request(
          `/api/enquiries/${id}/analysis`,
          {},
          { AI_MODE: "live", AI },
        )
      ).status,
    ).toBe(200);
    const detail = (await (await request(`/api/enquiries/${id}`)).json()) as {
      enquiry: { input: unknown; analysis: { mode: string } };
    };
    expect(detail.enquiry.analysis.mode).toBe("live");
    expect(detail.enquiry.input).toEqual(sampleEnquiry);
  });
  it("retries an intake action without duplicating the saved enquiry", async () => {
    const data = { input: sampleEnquiry, key: crypto.randomUUID() };
    const a = await (await request("/api/enquiries", data)).json();
    const b = await (await request("/api/enquiries", data)).json();
    expect(a).toEqual(b);
    expect(
      (
        await request("/api/enquiries", {
          ...data,
          input: { ...sampleEnquiry, name: "Changed Name" },
        })
      ).status,
    ).toBe(409);
  });
  it("rejects invalid input and cross-origin mutations", async () => {
    expect(
      (
        await request("/api/enquiries", {
          input: { ...sampleEnquiry, phone: "" },
          key: crypto.randomUUID(),
        })
      ).status,
    ).toBe(400);
    const result = await worker.fetch(
      new Request("https://demo.example/api/reset", {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: '{"confirm":true}',
      }),
      env,
    );
    expect(result.status).toBe(403);
  });
  it("limits repeated analysis without preventing manual drafting", async () => {
    const { id } = (await (
      await request("/api/enquiries", {
        input: sampleEnquiry,
        key: crypto.randomUUID(),
      })
    ).json()) as { id: string };
    for (let i = 0; i < 5; i++)
      expect((await request(`/api/enquiries/${id}/analysis`, {})).status).toBe(
        200,
      );
    expect((await request(`/api/enquiries/${id}/analysis`, {})).status).toBe(
      429,
    );
    expect(
      (
        await request(`/api/enquiries/${id}/draft`, {
          draft: "Manual work remains available.",
        })
      ).status,
    ).toBe(200);
  });
  it("enforces per-workspace live limits using real time even after advancing the clock", async () => {
    cookie = "";
    await request("/api/dashboard");
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const result = (await (
        await request("/api/enquiries", {
          input: sampleEnquiry,
          key: crypto.randomUUID(),
        })
      ).json()) as { id: string };
      ids.push(result.id);
    }
    for (let i = 0; i < 10; i++)
      expect(
        (
          await request(
            `/api/enquiries/${ids[Math.floor(i / 5)]}/analysis`,
            {},
            { AI_MODE: "live", AI: undefined },
          )
        ).status,
      ).toBe(502);
    await request("/api/clock", {});
    expect(
      (
        await request(
          `/api/enquiries/${ids[2]}/analysis`,
          {},
          { AI_MODE: "live", AI: undefined },
        )
      ).status,
    ).toBe(429);
    expect(
      (
        await request(`/api/enquiries/${ids[2]}/draft`, {
          draft: "Still usable.",
        })
      ).status,
    ).toBe(200);
  });
  it("enforces the enquiry cap without claiming persistence succeeded", async () => {
    cookie = "";
    await request("/api/dashboard");
    for (let i = 0; i < 94; i++)
      expect(
        (
          await request("/api/enquiries", {
            input: sampleEnquiry,
            key: crypto.randomUUID(),
          })
        ).status,
      ).toBe(201);
    expect(
      (
        await request("/api/enquiries", {
          input: sampleEnquiry,
          key: crypto.randomUUID(),
        })
      ).status,
    ).toBe(429);
    const data = (await (await request("/api/dashboard")).json()) as {
      enquiries: unknown[];
    };
    expect(data.enquiries).toHaveLength(100);
  }, 15000);
});
