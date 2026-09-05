# Audit — reviewer surface & finding-intelligence scale

Scope: the deferred FC-1 "Next recommendation" — surface the certified
relationship, duplicate, recurrence, defect-class, expectation-provenance
and confidence intelligence in the Control Center reviewer UI; measure
finding-intelligence cost at 1k/5k/10k before any corpus reaches that
size; and repair the task/continuity metadata drift found at FC-1
close-out.

Existing architecture inspected before writing:

- `src/core/findingIntel/` (232 + 190 + 138 lines) — deterministic
  relationships, recurrence, defect classes, expectation provenance,
  categorical confidence. Certified at FC-1; no reviewer surface.
- `src/core/findingReview/` (206 + 155 + 88 lines) — post-dossier
  lifecycle, immutable artifact-digest review binding, human filing
  report. Reachable only through the filing report.
- `src/controlCenter/` — server, router, SSE, snapshot coordinator,
  authorities (`findingsAuthority`, `findingsCurrentness`,
  `campaignAuthority`, `sourceAuthority`, `runEvidenceReader`) and
  adapters. Read-only by construction; extended, never rewritten.
- `ui/control-center/` — React 19 + Vite + Vitest, `App.tsx` 946 lines,
  `types.ts` 415, `api.ts` 199, browser lane via
  `playwright.control-center.config.ts`.
- `bin/agent-continuity-protocol.mjs`, `bin/agent-check.mjs`,
  `bin/planner-handoff-check.mjs`, `bin/hardening-check.mjs`.

Defect found during this audit, allocated the next free FC identifier:

DEF-FC-04 — cross-campaign task/continuity metadata drift.
`.agent/ACTIVE_TASK.md` carries the FC-1 identity block
(`nightwatch-frontier-completion-reliability-v1`, branch
`session/nightwatch-frontier-completion-r-9e1b3a60` per its `STATE.md`)
while its `## Routing and safety` block is verbatim predecessor content
from `nightwatch-plan-explain-coherence-v1`: it authorizes "one focused
coherence test file only" and names the retired worktree
`session/nightwatch-plan-explain-coherenc-faaf601a`. Continuity v2
validates the structured fields and the cross-file status machine, so
`npm run agent:check` returns PASS with 2 unrelated warnings while the
document's own authority prose belongs to a different campaign. The
routing block is what an agent reads to decide what it may write, so the
drift is an authority defect, not a cosmetic one.

Session worktree: declared in `.agent/EXECUTION_PROMPT.md`. No
force-push, no history rewrite, no production/NEXT/DEV contact, no
C-12/C-13/C-14 live execution, no C-08b, no C-07 DEV, no Slack/Leslie/
Pondr write, no credential access, no deployment.
