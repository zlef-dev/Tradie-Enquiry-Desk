# Implementation decisions and verification

The project brief is authoritative. Build in three vertical slices: persisted intake and isolated workspaces; analysis, approval and follow-up; responsive owner/public interface and integrated verification.

## Decisions

- The Worker HTTP API owns all state. D1 transactions (batch) keep approval, immutable outbox, events, and follow-up atomic. Unique action keys make repeated approvals idempotent.
- Each browser receives a random HttpOnly SameSite=Lax cookie. Unknown IDs start a new workspace. Every resource query includes workspace identity. Mutations require same-origin JSON requests.
- Original form input is immutable JSON. Analysis is stored separately, and a new suggestion never replaces an existing draft. Owners explicitly apply suggestions.
- Real UTC time governs resource limits and analysis leases; the workspace offset governs business timestamps and follow-up dates. Terminal statuses cancel open tasks. Reopening is an explicit status change, and another approval can create a follow-up.
- Local and default deployments use template mode. Live AI is explicitly configured server-side and validated at the adapter boundary. Failed live calls leave the record intact and visibly failed.
- Test seams: public domain validation, AI adapter with provider fixtures, Worker HTTP API against local D1, and the browser journey. These follow the user's authorisation to choose routine test organisation autonomously.
- Limits: 100 enquiries, 300 approvals and 500 analysis attempts per workspace; 10 live requests per real hour per workspace and a global real-day AI budget. Reset does not reset usage budgets. Stale workspaces are cleaned on a scheduled trigger.

## Completion evidence

Recorded after checks are run in `docs/VERIFICATION.md`.
