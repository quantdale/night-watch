# Audit — AH-1 against repository truth

## Predecessor state consumed

MA-8/F-13 (`nightwatch-p1-observation-scope-ma8-v1`, COMPLETE) left
`src/core/prodObserveP1/` certified at implementation anchor `4642c16`,
integrated at `4ca990f`. This change consumes the P1 window cap and subject
provenance vocabulary as duplicated literals (import isolation), pinned by
unit test to the P1 source of truth. C-11/C-10/triage are consumed
read-only; no file outside the AH-1 cones was modified except shared
registries (certification, gate lane, hardening invocation list,
package.json scripts) and docs.

## Canonical requirements implemented by this change

| ID | Source | Status in this change |
|---|---|---|
| Finding handoff | campaign brief §11–13 | IMPLEMENTED — `nightwatch.alphaus-finding-handoff.v1` |
| Severity/catch-stage/source rules | brief §13–16 | IMPLEMENTED — evidence-gated recommendations, UNKNOWN first-class |
| Investigation projection | brief §17 | IMPLEMENTED — reproduction/expected/actual/impact from scanned drafts |
| Privacy boundary | brief §18 | IMPLEMENTED — dossier-downstream, whole-draft sentinel scan, planted-sentinel matrix |
| No external publication | brief §19 | IMPLEMENTED — literal authority block + cone isolation rule |
| No bounty scoring | brief §10 | IMPLEMENTED — absence-tested, hardening-banned identifiers |
| C-12 runbook + preflight | brief §20–22 | IMPLEMENTED — runbook, template, library, CLI, 28-case + property matrix |
| Docs reconciliation | brief §23–25 | IN PROGRESS — context doc + runbook done; CURRENT_STATE/DECISIONS pending (M5) |

## Explicitly deferred (not this change)

C-12/C-13/C-14 execution; DEV/NEXT contact; C-08b organizational access;
credential handling; team/code-owner inference; organizational duplicate or
genuine verdicts; bounty arithmetic; sibling-repository writes.
