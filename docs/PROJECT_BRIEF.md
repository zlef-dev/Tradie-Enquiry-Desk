You are a senior full-stack engineer, product designer, and QA engineer. Build and finish the application described below in the current workspace.

Deliver working software, not just a plan, mockup, or scaffold. Implement the complete core workflow, run it, test it, and fix issues before finishing.

Make sensible decisions without asking me routine design or implementation questions. Follow applicable repository instructions, inspect existing files before editing, and preserve unrelated work. Use the operating system and tools available in this environment.

## 1. Product and purpose

Build **Tradie Enquiry Desk**, a polished portfolio project demonstrating a website connected to practical AI automation for a small Australian plumbing business.

Use the fictional brand **Rivergum Plumbing — Portfolio Concept**. Clearly identify it as a fictional demonstration. Do not invent testimonials, licence numbers, awards, business addresses, client results, or real customer data.

The target business owner handles plumbing jobs while also managing customer enquiries. The application should help them:

- Collect enquiries through their website.
- Understand what each customer needs.
- Identify missing information.
- Prepare appropriate replies.
- Review and approve drafts.
- Track enquiries and follow-up tasks.

The central demonstration is:

**Customer enquiry → saved record → AI job brief and reply draft → owner review → simulated outbox → follow-up task.**

This must work end to end.

## 2. Scope and technology

Use one coherent, lightweight stack:

- React, TypeScript, and Vite.
- Cloudflare Worker backend.
- Cloudflare Workers Static Assets for deployment.
- Cloudflare D1 for persistence.
- Cloudflare Workers AI for live extraction and drafting.
- Lightweight, freely available styling and validation libraries as needed.

Use current compatible versions. Consult official documentation when necessary rather than guessing framework APIs.

Use only free dependencies and deployment options. Do not activate paid plans, attach payment methods, buy domains, or use services requiring a paid subscription.

Keep the architecture simple. Do not introduce an agent framework, vector database, external automation platform, microservices, or a separate backend framework without a concrete need.

The complete application must run locally without cloud credentials. Use local D1 development storage and an honestly labelled template mode when live AI is unavailable.

Keep these outside this version:

- Real email or SMS delivery.
- Calendar integrations.
- Payments.
- Automated plumbing estimates or diagnoses.
- Quote PDFs.
- File uploads.
- External CRM integrations.
- Production customer accounts or multi-business subscription management.

Do not add inactive buttons for excluded features.

## 3. Design direction

Create a cohesive, professional experience that demonstrates strong web design as well as engineering.

The public website should feel like a trustworthy local service business. The owner dashboard should feel calm, efficient, and easy to use on a phone.

Suggested visual direction:

- Warm off-white backgrounds.
- Deep forest-green text and primary elements.
- Restrained amber accents.
- Clear typography, generous spacing, strong hierarchy.
- Subtle borders and modest corner rounding.
- Accessible contrast and visible keyboard focus.

Use purposeful visual details rather than generic decorative dashboards. A small original SVG illustration related to plumbing is welcome if it improves the composition.

Do not depend on external stock images, paid assets, or remote fonts for the application to look complete.

Make the site work well at approximately 390px mobile width and 1440px desktop width. Tables must adapt to small screens. Every interactive element must have a useful action.

Use Australian English: “enquiry,” “organise,” and similar conventions. Display dates as DD/MM/YYYY and business times in `Australia/Brisbane`. Store timestamps consistently in UTC.

Keep technical implementation details out of customer-facing copy.

## 4. Four primary screens

### A. Public website

Create a polished landing page with:

- A clear service promise.
- Routine plumbing services, such as tap repairs, toilet repairs, minor leak inspections, and maintenance.
- An explicit sample service area.
- A concise explanation of how enquiries work.
- A prominent “Request a quote” button.
- A secondary “Explore owner demo” action.
- A discreet but visible portfolio-concept label.

Use an editable sample suburb allowlist that includes Carindale. Explain that service availability is subject to owner confirmation.

Do not imply that submitting an enquiry confirms an appointment.

### B. Enquiry form

Collect:

- Name.
- Contact email.
- Optional phone.
- Preferred contact method.
- Suburb.
- Optional postcode.
- Requested service, including “Not sure.”
- Description of the request.
- Preferred day or time as a request, not a booking.

Validate contact fields consistently. If “phone” or “text” is selected, require a phone number.

Include “Fill with sample enquiry.” Use fictional details and reserved example email domains.

Use this sample description:

“Hi, the kitchen tap’s been dripping since Sunday. We’re in Carindale. Can someone come Friday after 2? Please text first.”

Tell visitors to use fictional information in this public portfolio demo.

Save the enquiry before starting AI processing. If saving fails, preserve the form input and offer a retry. Never display a successful submission when persistence failed.

After submission, show a confirmation and a way to inspect that enquiry in the owner demo.

### C. Owner dashboard

Provide:

- Counts of new enquiries, enquiries needing details, and follow-ups due.
- Search by name, suburb, or description.
- Status and service filters.
- Clear enquiry cards or rows.
- Last activity, requested service, suburb, and current status.
- A follow-up section.
- A simulated outbox section or tab.
- Empty, loading, and error states.
- “Reset my demo.”
- A clearly labelled demo clock control to advance time by 48 hours.

Calculate all metrics from actual records. Do not use hardcoded business-performance statistics.

Use these statuses:

- New.
- Needs details.
- Ready for quote.
- Quote sent.
- Won.
- Closed.

The owner controls status changes. AI may suggest what needs attention but must not independently mark work won, confirm bookings, or claim a quote was sent.

“Quote sent” is a manually recorded demo status; this version does not generate or send quotes.

### D. Enquiry detail

Show:

- Original customer message.
- Authoritative structured form fields.
- AI processing status.
- Concise job brief.
- Missing information.
- Service-area check.
- Editable reply draft.
- Status controls.
- Follow-up task.
- Activity history.

Keep the original enquiry visible alongside the AI result.

Provide clear actions:

- Save draft.
- Retry analysis.
- Approve to demo outbox.
- Change status.
- Complete follow-up.
- Return to dashboard.

Preserve manual edits. Retrying analysis must not silently overwrite an edited reply. Show a new suggestion separately or require an explicit replacement action.

## 5. AI behaviour

Create a server-side AI adapter with two explicit modes:

**Live AI:** Calls an eligible Cloudflare Workers AI model through a server-side binding.

**Template mode:** Works without credentials and visibly says “Template mode — live AI not connected.”

Make the model configurable and choose a model currently available on the Workers Free plan. Do not put credentials or private bindings in browser code.

For live AI, require and validate a structured response containing:

- A short summary.
- Suggested service category.
- Relevant details extracted from the message.
- Missing information.
- A suggested reply.

Use a strict schema and handle malformed output.

Structured form inputs are authoritative. Model output must not silently overwrite the customer’s name, contact details, suburb, contact preference, or requested availability.

Represent absent facts as unknown or not provided.

The AI must never invent:

- Prices or budgets.
- Technical diagnoses.
- Available appointment slots.
- Confirmed dates or bookings.
- Customer information.
- Guarantees or promises on behalf of the business.

Preserve ambiguous requests such as “Friday afternoon” as written unless a date was explicitly supplied.

Treat customer messages as untrusted data, including messages containing instructions to the model. Render customer and model text safely as text.

Template mode must use supplied form fields and the original message to create a basic brief and templated reply. It must not pretend to perform live model reasoning.

Never silently replace a failed AI response with a saved example and label it as newly generated.

Handle timeout, quota exhaustion, missing configuration, and invalid output without losing the saved enquiry. Show a useful state and allow retry. Bound input length, output length, request duration, and retries.

Add server-side AI request limits appropriate for a small public demo. Keep the rest of the application usable when live AI is unavailable.

## 6. Workflow rules

When an enquiry is submitted:

1. Persist it in the visitor’s demo workspace.
2. Record a submission event.
3. Analyse it using the available mode.
4. Save the analysis separately from the original input.
5. Make it available in the dashboard.

When the owner approves a reply:

1. Save the exact currently edited draft.
2. Create an immutable simulated outbox entry.
3. Record an approval event.
4. Create a follow-up task due 48 hours later if the enquiry has no open follow-up task.

Make approval idempotent: retries or double-clicks for the same approval action must not create duplicate outbox entries or tasks.

Label outbox records as simulated. Never display “Email delivered” or “SMS sent.”

The demo clock must allow visitors to see a follow-up become due immediately. Scope the time offset to that visitor’s workspace and visibly show when simulated time is active.

Use ordinary deterministic code for due dates and service-area checks.

Moving an enquiry to Won or Closed cancels its open follow-up. Reopening requires an explicit owner action. Preserve the activity history.

## 7. Persistence and demo isolation

Use a server-issued, unguessable session to give each browser its own demo workspace.

Scope every read, update, and delete to that workspace, including detail URLs and outbox records. Knowing another enquiry ID must not grant access.

Use appropriate cookie settings, including HttpOnly and production Secure settings. Do not build production authentication; clearly present this as an isolated demo workspace.

“Reset my demo” must reset only the current visitor’s workspace.

Seed a small, varied set of fictional records per workspace:

- A new enquiry.
- An enquiry missing details.
- An enquiry ready for a quote.
- A quote awaiting follow-up.
- An enquiry outside the sample service area.
- A won enquiry.

Clearly identify seeded records as sample data. Seed them once per workspace; do not duplicate them on refresh.

Persist enquiries, drafts, statuses, tasks, outbox entries, and activity events. Provide the required D1 schema and migrations.

Apply reasonable per-workspace record limits so the public demo cannot grow without bounds.

## 8. Local development and deployment readiness

Provide documented commands for:

- Installing dependencies.
- Initialising local storage.
- Running the complete application locally.
- Running tests.
- Creating a production build.
- Applying cloud migrations and deploying, when credentials are available.

Prefer a single `npm run dev` command for normal local use after documented setup. Keep scripts compatible with the current operating system.

Include:

- Lockfile.
- Example configuration without secrets.
- Cloudflare configuration.
- Database migrations.
- A concise README.
- A short explanation of the actual architecture.
- The distinction between live AI, template mode, and simulated messaging.
- Free-plan limitations and production work still required.

Use a free hosting subdomain. If this session already authorises deployment and valid credentials are available, deploy and verify it. Otherwise, finish and verify the local application, then provide concise deployment instructions.

Do not block local completion while waiting for cloud credentials. Do not claim the application is deployed unless you actually verified the deployed URL.

## 9. Verification

Use meaningful automated checks for business logic and one browser-level end-to-end flow. Use available browser tools to inspect the interface.

Verify:

- A fresh local setup works without cloud credentials.
- New enquiries persist after refresh.
- The sample enquiry completes the full workflow.
- Live AI and template mode are clearly distinguishable.
- AI failure and malformed output preserve the enquiry.
- Missing information is represented honestly.
- Manual draft edits survive approval and analysis retries.
- Approval does not create duplicate side effects.
- Follow-up dates use the correct clock and become due after 48 hours.
- Won and Closed enquiries have no open follow-up.
- Dashboard counts agree with stored records.
- Two independent browser contexts cannot access or reset each other’s data.
- Reset affects only the current visitor.
- Form errors, loading states, empty states, and recovery actions work.
- Keyboard navigation and mobile layouts are usable.
- The production build passes.
- There are no application errors in the browser console.

If live cloud AI cannot be exercised, test the adapter with realistic success and failure fixtures and explicitly report that live inference remains unverified.

Capture desktop and mobile screenshots if the environment supports it. Inspect them and fix obvious layout problems.

Do not claim checks passed unless you ran them.

## 10. Completion standard

Finish the actual implementation. Do not stop after planning or generating the first screen.

No placeholder buttons, fake integrations, fabricated business results, exposed secrets, or core-workflow TODOs.

Prioritise, in this order:

1. A reliable complete workflow.
2. Clear and truthful behaviour.
3. Strong visual design.
4. Mobile usability.
5. Concise documentation.

Before finishing, perform a final pass as a potential client: open the website, submit a sample enquiry, inspect the brief, edit the reply, approve it, advance the demo clock, and complete the follow-up.

Your final response should briefly state:

- What you built.
- How to run or open it.
- Which checks passed.
- Whether AI was verified live or only in template/test mode.
- Any remaining configuration required.

Start by inspecting the workspace, then implement and verify the complete project.