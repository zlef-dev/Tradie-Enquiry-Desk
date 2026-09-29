import { useRef, useState, type FormEvent } from "react";
import {
  enquirySchema,
  sampleEnquiry,
  services,
  suburbs,
  type EnquiryInput,
} from "../shared/domain";
import { api } from "./api";

function TapIllustration() {
  return (
    <svg
      className="tap-illustration"
      viewBox="0 0 520 480"
      role="img"
      aria-label="Original illustration of a brass tap, a water droplet and rivergum leaves"
    >
      <defs>
        <linearGradient id="brass" x1="0" x2="1">
          <stop stopColor="#ac763d" />
          <stop offset=".35" stopColor="#e9ca8d" />
          <stop offset=".65" stopColor="#b89052" />
          <stop offset="1" stopColor="#d4ad6a" />
        </linearGradient>
        <pattern id="grid" width="52" height="52" patternUnits="userSpaceOnUse">
          <path d="M52 0H0V52" fill="none" stroke="#345c4c" strokeWidth=".8" />
        </pattern>
      </defs>
      <rect width="520" height="480" fill="url(#grid)" />
      <circle cx="280" cy="227" r="150" fill="#315745" />
      <path
        d="M77 423Q116 271 204 200M91 369Q32 331 55 281Q109 292 106 338M119 316Q107 239 146 223Q165 265 133 296M152 264Q162 197 204 181Q221 227 166 251"
        fill="#78917b"
        stroke="#78917b"
        strokeWidth="6"
      />
      <ellipse cx="304" cy="398" rx="145" ry="17" fill="#173c30" />
      <path
        d="M280 370V194Q280 143 327 143H350Q392 143 392 184V211"
        fill="none"
        stroke="#926834"
        strokeWidth="40"
      />
      <path
        d="M279 370V194Q279 145 327 145H349Q390 145 390 184V211"
        fill="none"
        stroke="url(#brass)"
        strokeWidth="32"
      />
      <rect x="249" y="358" width="61" height="20" rx="5" fill="url(#brass)" />
      <rect x="365" y="201" width="50" height="20" rx="4" fill="url(#brass)" />
      <path
        d="M280 248L238 225V192"
        fill="none"
        stroke="url(#brass)"
        strokeWidth="17"
        strokeLinecap="round"
      />
      <path
        d="M391 245C391 245 378 264 378 274A13 13 0 00204 274"
        fill="none"
        opacity="0"
      />
      <path
        d="M391 244C391 244 377 265 377 275A14 14 0 00405 275C405 265 391 244 391 244Z"
        fill="#a7c1be"
      />
      <path d="M435 66h25m-12-12v25" stroke="#ceaa70" strokeWidth="2" />
      <text x="35" y="45" fill="#b5c8b6" fontSize="10" letterSpacing="3">
        CARE IN THE EVERYDAY
      </text>
      <text x="366" y="445" fill="#b5c8b6" fontSize="10" letterSpacing="2">
        RIVERGUM / 01
      </text>
    </svg>
  );
}

export function PublicPage() {
  return (
    <main id="main" tabIndex={-1}>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="dot" /> LOCAL PLUMBING. THOUGHTFULLY HANDLED.
          </p>
          <h1>
            Small drips.
            <br />
            Big peace
            <br />
            of mind<span className="amber">.</span>
          </h1>
          <p className="lede">
            Everyday plumbing, with a little more care.
            <br />
            Tell us what needs attention. We’ll take it from there.
          </p>
          <a className="button" href="#/enquire">
            Request a quote <span aria-hidden="true">↗</span>
          </a>
          <p className="hero-note">A simple enquiry. A clear next step.</p>
        </div>
        <div className="hero-art">
          <TapIllustration />
          <div className="art-caption">
            <span className="seal" aria-hidden="true">
              ↗
            </span>
            <div>
              <strong>
                Good work starts
                <br />
                with a good conversation.
              </strong>
              <span>No booking confirmed until we’ve spoken.</span>
            </div>
          </div>
        </div>
      </section>
      <section className="service-strip">
        <div className="shell">
          <span>THE EVERYDAY, TAKEN CARE OF</span>
          <span>Tap repairs</span>
          <span>Toilet repairs</span>
          <span>Leak inspections</span>
          <span>Maintenance</span>
        </div>
      </section>
      <section className="shell section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 / HOW WE CAN HELP</p>
            <h2>
              For the things that
              <br />
              should just work.
            </h2>
          </div>
          <p>
            From a persistent drip to a running toilet, start with a few
            details. We’ll review your request before discussing the next step.
          </p>
        </div>
        <div className="service-grid">
          {[
            [
              "↧",
              "Tap repairs",
              "Drips, loose handles and taps that need some attention.",
            ],
            [
              "◉",
              "Toilet repairs",
              "Running cisterns, tricky flushes and everyday repairs.",
            ],
            [
              "⌁",
              "Leak inspections",
              "Tell us what you’ve noticed. We’ll review what help is needed.",
            ],
            [
              "⌘",
              "Maintenance",
              "A little attention for the plumbing you rely on every day.",
            ],
          ].map(([icon, title, copy], i) => (
            <article key={title}>
              <div className="service-top">
                <span className="service-icon" aria-hidden="true">
                  {icon}
                </span>
                <span>0{i + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="process-section">
        <div className="shell process-grid">
          <div>
            <p className="eyebrow">02 / A CLEARER WAY TO ENQUIRE</p>
            <h2>
              Less back-and-forth.
              <br />
              More getting on with it.
            </h2>
            <p>
              Send a request when it suits you. An enquiry is the start of a
              conversation, never a confirmed appointment.
            </p>
            <a className="text-link" href="#/enquire">
              Let’s start with your request <span aria-hidden="true">↗</span>
            </a>
          </div>
          <ol className="steps">
            <li>
              <span>01</span>
              <div>
                <h3>Tell us what’s happening</h3>
                <p>
                  A few details about the job, your suburb and a time that might
                  suit.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>We review the details</h3>
                <p>
                  The owner checks your request and asks for anything else
                  needed.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Agree on the next step</h3>
                <p>
                  Service availability and any visit are confirmed separately.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>
      <section className="shell section area-section">
        <div>
          <p className="eyebrow">03 / AROUND THE NEIGHBOURHOOD</p>
          <h2>A local focus.</h2>
          <p>
            Our sample service area covers these Brisbane suburbs.
            <br />
            Availability is always subject to owner confirmation.
          </p>
        </div>
        <div className="suburb-list">
          {suburbs.map((s) => (
            <span key={s}>{s}</span>
          ))}
          <p>
            Outside the area? You can still enquire. We’ll flag your suburb for
            review.
          </p>
        </div>
      </section>
      <section className="shell demo-invitation">
        <div>
          <p className="eyebrow">BEHIND THE SCENES</p>
          <h2>A tidy desk. A clearer day.</h2>
          <p>
            This working portfolio demo connects an enquiry to a reviewed reply
            and a follow-up. Explore it using fictional details.
          </p>
        </div>
        <a href="#/owner" className="button light">
          Explore owner demo <span aria-hidden="true">↗</span>
        </a>
      </section>
    </main>
  );
}

const emptyInput: EnquiryInput = {
  name: "",
  email: "",
  phone: "",
  contact: "email",
  suburb: "",
  postcode: "",
  service: "Not sure",
  description: "",
  availability: "",
};
export function EnquiryForm() {
  const [form, setForm] = useState<EnquiryInput>(emptyInput);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");
  const [analysisState, setAnalysisState] = useState("");
  const submissionKey = useRef(crypto.randomUUID());
  const update = (field: keyof EnquiryInput, value: string) =>
    setForm((old) => ({ ...old, [field]: value }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = enquirySchema.safeParse(form);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fields[String(i.path[0])] = i.message;
      });
      setErrors(fields);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { id } = await api<{ id: string }>("/enquiries", {
        input: parsed.data,
        key: submissionKey.current,
      });
      setSaved(id);
      setAnalysisState(
        "Your enquiry is saved. Preparing the owner’s job brief…",
      );
      try {
        await api(`/enquiries/${id}/analysis`, {});
        setAnalysisState("Your request is ready to review in the owner demo.");
      } catch {
        setAnalysisState(
          "Your enquiry is safely saved. The brief could not be prepared; retry from the owner demo.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  const field = (
    name: keyof EnquiryInput,
    label: string,
    type = "text",
    optional = false,
  ) => (
    <label className="field" htmlFor={name}>
      {label}
      {optional && <span className="optional"> Optional</span>}
      <input
        id={name}
        name={name}
        aria-label={label}
        type={type}
        value={form[name]}
        onChange={(e) => update(name, e.target.value)}
        maxLength={
          name === "email"
            ? 160
            : name === "availability"
              ? 200
              : name === "phone"
                ? 30
                : name === "postcode"
                  ? 4
                  : 80
        }
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        autoComplete="off"
      />
      {errors[name] && (
        <span id={`${name}-error`} className="field-error">
          {errors[name]}
        </span>
      )}
    </label>
  );
  if (saved)
    return (
      <main id="main" tabIndex={-1} className="shell confirmation">
        <span className="success-icon" aria-hidden="true">
          ✓
        </span>
        <p className="eyebrow">ENQUIRY RECEIVED</p>
        <h1>A good first step.</h1>
        <p>
          Your request has been saved. This is an enquiry, not a confirmed
          booking.
        </p>
        <p role="status">{analysisState}</p>
        <a className="button" href={`#/owner/${saved}`}>
          Inspect this enquiry <span aria-hidden="true">↗</span>
        </a>
        <a className="text-link" href="#/">
          Back to Rivergum
        </a>
      </main>
    );
  return (
    <main id="main" tabIndex={-1} className="shell form-page">
      <aside>
        <a className="back-link" href="#/">
          ← Back to Rivergum
        </a>
        <p className="eyebrow">LET’S START WITH THE DETAILS</p>
        <h1>
          What needs
          <br />a little care?
        </h1>
        <p className="lede">
          Tell us what’s happening and when might suit. We’ll review the request
          before discussing the next step.
        </p>
        <div className="note-card">
          <strong>A safe space to try it out.</strong>
          <p>
            This is a public portfolio demo for a fictional business. Please use
            fictional information only. Nothing is booked or sent.
          </p>
          <button
            className="text-link"
            type="button"
            onClick={() => {
              setForm(sampleEnquiry);
              setErrors({});
            }}
          >
            Fill with sample enquiry <span aria-hidden="true">↗</span>
          </button>
        </div>
        <p className="muted">
          Sample service area: {suburbs.join(", ")}. Availability is subject to
          owner confirmation.
        </p>
      </aside>
      <form className="form-card" onSubmit={submit} noValidate>
        <div className="form-heading">
          <span className="eyebrow">YOUR ENQUIRY</span>
          <span>About 2 minutes</span>
        </div>
        <h2>A few details go a long way.</h2>
        <div className="form-grid">
          {field("name", "Name")}
          {field("email", "Contact email", "email")}
          {field("phone", "Phone", "tel", true)}
          <label className="field">
            Preferred contact method
            <select
              value={form.contact}
              onChange={(e) => update("contact", e.target.value)}
            >
              <option value="email">Email</option>
              <option value="text">Text message</option>
              <option value="phone">Phone call</option>
            </select>
          </label>
          {field("suburb", "Suburb")}
          {field("postcode", "Postcode", "text", true)}
        </div>
        <label className="field">
          Requested service
          <select
            value={form.service}
            onChange={(e) => update("service", e.target.value)}
          >
            {services.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          What’s happening?
          <textarea
            rows={5}
            value={form.description}
            maxLength={3000}
            placeholder="Where is the issue, and what have you noticed?"
            onChange={(e) => update("description", e.target.value)}
            aria-invalid={!!errors.description}
            aria-describedby="description-help"
          />
          <span
            id="description-help"
            className={errors.description ? "field-error" : "field-help"}
          >
            {errors.description ||
              "Describe what you’ve noticed; no diagnosis needed."}
          </span>
        </label>
        {field("availability", "Preferred day or time", "text", true)}
        <p className="field-help">
          A preference only. Submitting this form does not book an appointment.
        </p>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <button className="button full" disabled={busy}>
          {busy
            ? "Saving your enquiry…"
            : error
              ? "Retry saving enquiry ↗"
              : "Send enquiry ↗"}
        </button>
        <p className="form-footnote">
          Your enquiry stays in this browser’s isolated demo workspace.
        </p>
      </form>
    </main>
  );
}
