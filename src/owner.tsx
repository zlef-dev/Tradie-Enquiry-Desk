import { useEffect, useRef, useState } from "react";
import {
  services,
  statuses,
  serviceArea,
  terminal,
  type Dashboard,
  type Detail,
  type Enquiry,
  type Status,
} from "../shared/domain";
import { api, formatDate } from "./api";

function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}
    >
      <span aria-hidden="true">●</span> {status}
    </span>
  );
}
function Loading() {
  return (
    <main id="main" tabIndex={-1} className="shell owner-shell">
      <div className="loading" role="status">
        <span className="spinner" /> Opening your enquiry desk…
      </div>
    </main>
  );
}
function LoadError({ error, retry }: { error: string; retry: () => void }) {
  return (
    <main id="main" tabIndex={-1} className="shell owner-shell">
      <div className="empty">
        <h1>Let’s try that again.</h1>
        <p role="alert">{error}</p>
        <button className="button" onClick={retry}>
          Retry loading
        </button>
        <a className="text-link" href="#/owner">
          Return to dashboard
        </a>
      </div>
    </main>
  );
}
function ModeNote({ mode, connected }: { mode: string; connected: boolean }) {
  return (
    <div className="mode-note">
      <span className="dot" />
      <span>
        {mode === "live"
          ? connected
            ? "Live AI configured — suggestions need owner review"
            : "Live AI unavailable — connection is not configured"
          : "Template mode — live AI not connected"}
      </span>
      <span className="mode-extra">Your own isolated demo workspace</span>
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<Dashboard>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [service, setService] = useState("");
  const [tab, setTab] = useState("enquiries");
  const load = async () => {
    setError("");
    try {
      setData(await api<Dashboard>("/dashboard"));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const act = async (path: string, body: unknown, message: string) => {
    setBusy(true);
    setError("");
    try {
      await api(path, body);
      await load();
      setNotice(message);
      setConfirmReset(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!data)
    return error ? <LoadError error={error} retry={load} /> : <Loading />;
  const openTasks = data.tasks.filter((t) => t.state === "open");
  const due = openTasks.filter((t) => t.due_at <= data.now);
  const filtered = data.enquiries.filter(
    (e) =>
      (!status || e.status === status) &&
      (!service || e.input.service === service) &&
      `${e.input.name} ${e.input.suburb} ${e.input.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const byId = (id: string) => data.enquiries.find((e) => e.id === id);
  return (
    <main id="main" tabIndex={-1} className="shell owner-shell">
      <ModeNote mode={data.mode} connected={data.aiConnected} />
      <div className="owner-heading">
        <div>
          <p className="eyebrow">RIVERGUM / OWNER DEMO</p>
          <h1>A little less admin.</h1>
          <p>Your enquiries, replies and next steps. All in one place.</p>
        </div>
        <a className="button" href="#/enquire">
          New enquiry <span aria-hidden="true">+</span>
        </a>
      </div>
      <div className="metrics">
        <article>
          <span>New enquiries</span>
          <strong>
            {data.enquiries
              .filter((e) => e.status === "New")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <span className="metric-foot">
            Ready for a first look <span aria-hidden="true">↗</span>
          </span>
        </article>
        <article>
          <span>Need a few details</span>
          <strong>
            {data.enquiries
              .filter((e) => e.status === "Needs details")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <span className="metric-foot">
            Keep the conversation going <span aria-hidden="true">↗</span>
          </span>
        </article>
        <article className="metric-accent">
          <span>Follow-ups due</span>
          <strong>{due.length.toString().padStart(2, "0")}</strong>
          <span className="metric-foot">
            A small nudge, right on time <span aria-hidden="true">↗</span>
          </span>
        </article>
      </div>
      <div className="clock-bar">
        <div>
          <span aria-hidden="true">◷</span>
          <strong>Demo clock</strong>
          <span>{formatDate(data.now)} · Brisbane</span>
          {data.offset > 0 && (
            <b className="clock-badge">
              Simulated time +{data.offset / 3600000}h
            </b>
          )}
        </div>
        <button
          disabled={busy}
          onClick={() =>
            act(
              "/clock",
              {},
              "Demo clock advanced by 48 hours. Follow-up counts have been refreshed.",
            )
          }
        >
          Advance 48 hours <span aria-hidden="true">→</span>
        </button>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert" role="status">
          {notice}
        </div>
      )}
      <div className="desk-layout">
        <section className="desk-main">
          <div className="tabs" role="tablist" aria-label="Desk sections">
            <button
              role="tab"
              aria-selected={tab === "enquiries"}
              onClick={() => setTab("enquiries")}
            >
              Enquiries <span>{data.enquiries.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={tab === "outbox"}
              onClick={() => setTab("outbox")}
            >
              Demo outbox <span>{data.outbox.length}</span>
            </button>
          </div>
          {tab === "enquiries" ? (
            <>
              <div className="filters">
                <label className="search-field">
                  <span className="sr-only">Search enquiries</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, suburb or description…"
                    type="search"
                  />
                </label>
                <label>
                  <span className="sr-only">Filter by status</span>
                  <select
                    aria-label="Filter by status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Filter by service</span>
                  <select
                    aria-label="Filter by service"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                  >
                    <option value="">All services</option>
                    {services.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="list-heading">
                <span>CUSTOMER & REQUEST</span>
                <span>STATUS / LAST ACTIVITY</span>
              </div>
              {filtered.length ? (
                <div className="enquiry-list">
                  {filtered.map((e) => (
                    <a
                      className="enquiry-row"
                      href={`#/owner/${e.id}`}
                      key={e.id}
                    >
                      <span className="avatar" aria-hidden="true">
                        {e.input.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div className="row-info">
                        <div>
                          <strong>{e.input.name}</strong>
                          {e.sample && (
                            <span className="sample-tag">Sample</span>
                          )}
                        </div>
                        <p>
                          {e.input.service} <span>·</span> {e.input.suburb}
                        </p>
                        <span className="row-preview">
                          {e.input.description}
                        </span>
                      </div>
                      <div className="row-status">
                        <StatusPill status={e.status} />
                        <time>{formatDate(e.updated_at)}</time>
                      </div>
                      <span className="row-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <h3>No enquiries match.</h3>
                  <p>Try another search or clear the filters.</p>
                  <button
                    onClick={() => {
                      setSearch("");
                      setStatus("");
                      setService("");
                    }}
                    className="text-link"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="outbox-list">
              <div className="alert">
                Simulated outbox only. Nothing here was emailed, texted or
                delivered.
              </div>
              {data.outbox.length ? (
                data.outbox.map((o) => (
                  <article className="outbox-item" key={o.id}>
                    <div className="outbox-heading">
                      <a href={`#/owner/${o.enquiry_id}`}>
                        {byId(o.enquiry_id)?.input.name}
                      </a>
                      <span className="sample-tag">Simulated</span>
                    </div>
                    <p className="muted">
                      {o.channel} · {o.recipient} · {formatDate(o.created_at)}
                    </p>
                    <p className="preserve">{o.body}</p>
                  </article>
                ))
              ) : (
                <div className="empty">
                  <span className="empty-symbol" aria-hidden="true">
                    ↗
                  </span>
                  <h3>A reply starts with your review.</h3>
                  <p>
                    Approve an enquiry’s draft to add an immutable copy here.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
        <aside className="followup-panel">
          <div className="panel-heading">
            <h2>Next on your list</h2>
            <span>{openTasks.length}</span>
          </div>
          <p className="muted">Follow up 48 hours after a reply is approved.</p>
          {openTasks.length ? (
            openTasks.map((t) => (
              <article className="task-card" key={t.id}>
                <span
                  className={t.due_at <= data.now ? "due-label" : "eyebrow"}
                >
                  {t.due_at <= data.now ? "● DUE NOW" : "UPCOMING"}
                </span>
                <h3>
                  <a href={`#/owner/${t.enquiry_id}`}>
                    {byId(t.enquiry_id)?.input.name}
                  </a>
                </h3>
                <p>{byId(t.enquiry_id)?.input.service}</p>
                <time>{formatDate(t.due_at)}</time>
                <button
                  className="task-action"
                  disabled={busy}
                  onClick={() =>
                    act(
                      `/enquiries/${t.enquiry_id}/complete`,
                      { taskId: t.id },
                      "Follow-up completed.",
                    )
                  }
                >
                  Mark complete <span aria-hidden="true">✓</span>
                </button>
              </article>
            ))
          ) : (
            <div className="empty compact">
              <h3>All clear for now.</h3>
              <p>Open follow-ups appear here after an approval.</p>
            </div>
          )}
          <div className="side-note">
            <strong>A quick way to explore</strong>
            <p>
              Open an enquiry, review the draft and approve it. Then advance the
              demo clock to see its follow-up become due.
            </p>
          </div>
        </aside>
      </div>
      <div className="reset-row">
        <p>
          Seeded enquiries are fictional samples. Dates are shown in Brisbane
          time.
        </p>
        {confirmReset ? (
          <div className="reset-confirm">
            <span>Remove your records and restore samples?</span>
            <button
              className="danger"
              disabled={busy}
              onClick={() =>
                act(
                  "/reset",
                  { confirm: true },
                  "Your demo has been reset. Other visitors’ workspaces are unaffected.",
                )
              }
            >
              Confirm reset
            </button>
            <button disabled={busy} onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button disabled={busy} onClick={() => setConfirmReset(true)}>
            Reset my demo ↻
          </button>
        )}
      </div>
    </main>
  );
}

export function DetailPage({ id }: { id: string }) {
  const [data, setData] = useState<Detail>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("New");
  const [busy, setBusy] = useState("");
  const approval = useRef<{ key: string; draft: string } | null>(null);
  const load = async (updateDraft = true) => {
    setError("");
    try {
      const d = await api<Detail>(`/enquiries/${id}`);
      setData(d);
      setStatus(d.enquiry.status);
      if (updateDraft) setDraft(d.enquiry.draft);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void load();
  }, [id]);
  const action = async (
    name: string,
    path: string,
    body: unknown,
    message: string,
  ) => {
    setBusy(name);
    setError("");
    setNotice("");
    try {
      await api(`/enquiries/${id}/${path}`, body);
      if (path === "approval") approval.current = null;
      await load(false);
      setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const retry = async () => {
    setBusy("analysis");
    setError("");
    setNotice("");
    try {
      await api(`/enquiries/${id}/draft`, { draft });
      await api(`/enquiries/${id}/analysis`, {});
      await load(false);
      setNotice(
        "A new suggestion is ready. Your edited draft has been preserved.",
      );
    } catch (e) {
      const message = (e as Error).message;
      await load(false);
      setError(message);
    } finally {
      setBusy("");
    }
  };
  const approve = () => {
    if (!approval.current || approval.current.draft !== draft)
      approval.current = { key: crypto.randomUUID(), draft };
    void action(
      "approval",
      "approval",
      approval.current,
      "Approved to demo outbox. No message was sent. The follow-up is scheduled.",
    );
  };
  if (!data)
    return error ? (
      <LoadError error={error} retry={() => load()} />
    ) : (
      <Loading />
    );
  const e: Enquiry = data.enquiry;
  const a = e.analysis;
  const open = data.tasks.find((t) => t.state === "open");
  const fields = [
    ["Contact email", e.input.email],
    ["Phone", e.input.phone || "Not provided"],
    ["Preferred contact", e.input.contact],
    ["Suburb", e.input.suburb],
    ["Postcode", e.input.postcode || "Not provided"],
    ["Requested service", e.input.service],
    ["Preferred day / time", e.input.availability || "Not provided"],
  ];
  return (
    <main id="main" tabIndex={-1} className="shell owner-shell">
      <a className="back-link" href="#/owner">
        ← Return to dashboard
      </a>
      <ModeNote mode={data.mode} connected={data.aiConnected} />
      {data.offset > 0 && (
        <p className="detail-clock">
          <strong>Simulated time +{data.offset / 3600000}h</strong> ·{" "}
          {formatDate(data.now)} Brisbane
        </p>
      )}
      <div className="detail-heading">
        <div>
          <p className="eyebrow">
            ENQUIRY / {e.sample ? "FICTIONAL SAMPLE" : "YOUR DEMO"}
          </p>
          <h1>{e.input.name}</h1>
          <p>
            {e.input.service} · {e.input.suburb} · Received{" "}
            {formatDate(e.created_at)}
          </p>
        </div>
        <StatusPill status={e.status} />
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert" role="status">
          {notice}
        </div>
      )}
      <div className="detail-grid">
        <div>
          <section className="detail-card original">
            <div className="card-eyebrow">
              <span>01 / THE ORIGINAL ENQUIRY</span>
              <span aria-hidden="true">↙</span>
            </div>
            <h2>In the customer’s words.</h2>
            <blockquote>{e.input.description}</blockquote>
            <dl className="customer-fields">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="field-help">
              Original form fields are authoritative. A preferred time is a
              request, not a booking.
            </p>
          </section>
          <section className="detail-card">
            <div className="card-eyebrow">
              <span>OWNER CONTROLS</span>
            </div>
            <h2>Keep things moving.</h2>
            <label className="field">
              Enquiry status
              <select
                value={status}
                onChange={(ev) => setStatus(ev.target.value as Status)}
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <p className="field-help">
              “Quote sent” records a manual demo status. No quote is generated
              or sent. Won and Closed cancel open follow-ups.
            </p>
            <button
              className="button secondary"
              disabled={!!busy || status === e.status}
              onClick={() =>
                action(
                  "status",
                  "status",
                  { status },
                  `Status changed to ${status}.`,
                )
              }
            >
              {terminal(e.status) && !terminal(status)
                ? "Reopen enquiry"
                : "Change status"}
            </button>
            <div className="followup-detail">
              <h3>Follow-up task</h3>
              {open ? (
                <>
                  <p>
                    <strong>
                      {open.due_at <= data.now ? "Due now" : "Upcoming"}
                    </strong>{" "}
                    · {formatDate(open.due_at)} Brisbane
                  </p>
                  <button
                    className="text-link"
                    disabled={!!busy}
                    onClick={() =>
                      action(
                        "complete",
                        "complete",
                        { taskId: open.id },
                        "Follow-up completed.",
                      )
                    }
                  >
                    Complete follow-up ✓
                  </button>
                </>
              ) : (
                <p>
                  {data.tasks.length
                    ? `Last follow-up: ${data.tasks[0].state}.`
                    : "Approve a reply to schedule a follow-up in 48 hours."}
                </p>
              )}
            </div>
          </section>
        </div>
        <div>
          <section className="detail-card analysis-card">
            <div className="card-eyebrow">
              <span>02 / THE JOB BRIEF</span>
              <span className="sample-tag">
                {a
                  ? a.mode === "live"
                    ? "Live AI result"
                    : "Template result"
                  : "No result yet"}
              </span>
            </div>
            <h2>A clearer starting point.</h2>
            <p className="analysis-state">
              {a
                ? a.mode === "live"
                  ? "Live AI suggestion — review against the original"
                  : "Saved template suggestion — prepared without live AI"
                : "No suggestion has been prepared yet."}
            </p>
            <p>
              <strong>Processing:</strong>{" "}
              {busy === "analysis"
                ? "Preparing suggestion…"
                : e.analysis_status}
            </p>
            {e.analysis_error && (
              <div className="alert error">{e.analysis_error}</div>
            )}
            {a ? (
              <>
                <p>{a.summary}</p>
                <div className="brief-category">
                  <span>Suggested service</span>
                  <strong>{a.service}</strong>
                </div>
                <h3>Details to review</h3>
                <ul className="detail-list">
                  {a.details.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
                <h3>Still to clarify</h3>
                {a.missing.length ? (
                  <ul className="detail-list">
                    {a.missing.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    No missing information suggested. The owner still needs to
                    review the request.
                  </p>
                )}
              </>
            ) : (
              <p>
                Your original enquiry is saved. Prepare the brief or write a
                reply yourself.
              </p>
            )}
            <div
              className={`area-check ${serviceArea(e.input.suburb) ? "" : "outside"}`}
            >
              <strong>
                {serviceArea(e.input.suburb)
                  ? "✓ Within the sample service area"
                  : "↗ Outside the sample service area"}
              </strong>
              <p>
                {e.input.suburb} ·{" "}
                {serviceArea(e.input.suburb)
                  ? "Availability remains subject to owner confirmation."
                  : "Owner review is needed before offering service."}
              </p>
            </div>
            <button className="text-link" disabled={!!busy} onClick={retry}>
              {busy === "analysis" ? "Preparing…" : "Retry analysis ↻"}
            </button>
            <p className="field-help">
              Up to five attempts per enquiry. Your edited draft is saved before
              retrying.
            </p>
          </section>
          <section className="detail-card reply-card">
            <div className="card-eyebrow">
              <span>03 / YOUR REPLY</span>
              <span>OWNER REVIEW</span>
            </div>
            <h2>
              A personal reply.
              <br />
              With the final word from you.
            </h2>
            <label className="field">
              Reply draft
              <textarea
                rows={9}
                maxLength={2000}
                value={draft}
                onChange={(ev) => {
                  setDraft(ev.target.value);
                  setNotice("");
                }}
              />
            </label>
            <div className="draft-meta">
              <span>{draft === e.draft ? "Saved draft" : "Unsaved edits"}</span>
              <span>{draft.length}/2000</span>
            </div>
            {a && a.reply !== draft && (
              <details className="suggestion">
                <summary>
                  View latest {a.mode === "live" ? "AI" : "template"} suggestion
                </summary>
                <p className="preserve">{a.reply}</p>
                <button
                  className="text-link"
                  disabled={!!busy}
                  onClick={() => {
                    setDraft(a.reply);
                    setNotice(
                      "Suggestion placed in the editor. Save or approve to keep it.",
                    );
                  }}
                >
                  Replace draft with this suggestion
                </button>
              </details>
            )}
            <div className="reply-actions">
              <button
                className="button secondary"
                disabled={!!busy}
                onClick={() =>
                  action("draft", "draft", { draft }, "Draft saved.")
                }
              >
                {busy === "draft" ? "Saving…" : "Save draft"}
              </button>
              <button
                className="button"
                disabled={!!busy || !draft.trim() || terminal(e.status)}
                onClick={approve}
              >
                {busy === "approval"
                  ? "Approving…"
                  : "Approve to demo outbox ↗"}
              </button>
            </div>
            <p className="field-help">
              Approval saves this exact reply as an immutable simulated record.
              Nothing is delivered.{" "}
              {terminal(e.status)
                ? "Reopen this enquiry to approve another reply."
                : "A follow-up is created for 48 hours later if none is open."}
            </p>
          </section>
        </div>
      </div>
      <section className="detail-card history">
        <div className="card-eyebrow">
          <span>04 / ACTIVITY HISTORY</span>
          <span>BRISBANE TIME</span>
        </div>
        <h2>The whole conversation trail.</h2>
        {data.events.map((ev) => (
          <div className="event" key={ev.id}>
            <span className="event-dot" />
            <p>{ev.detail}</p>
            <time>{formatDate(ev.created_at)}</time>
          </div>
        ))}
        {data.outbox.length > 0 && (
          <details className="suggestion">
            <summary>
              View {data.outbox.length} immutable simulated outbox{" "}
              {data.outbox.length === 1 ? "record" : "records"}
            </summary>
            {data.outbox.map((o) => (
              <article key={o.id} className="outbox-item">
                <strong>
                  Simulated · {o.channel} · {o.recipient}
                </strong>
                <p className="preserve">{o.body}</p>
                <time>{formatDate(o.created_at)}</time>
              </article>
            ))}
          </details>
        )}
      </section>
    </main>
  );
}
