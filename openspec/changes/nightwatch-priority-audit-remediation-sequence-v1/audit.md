# Audit — priority audit remediation sequence (umbrella campaign)

Campaign activation measured in the owned C-00 worktree at base
`4a3df8cdc776c5ca47a9666f65afbd5c5519f092`, with the canonical checkout
clean, on 2026-09-22. This record is the implementation campaign's audit
artifact for handoff v1; it closes the umbrella change when the delta spec's
scenarios and this file's acceptance gates hold on an integrated checkpoint.

## Defect under closure

The exhaustive repository audit (`nightwatch-exhaustive-repository-audit-proposals-v1`,
NW-AUD-001…048) produced strict-valid planning changes but no implementation.
Five owner-selected findings remain live defects at this base:

| ID | Severity / confidence | Live defect (Phase-0 re-verified 2026-09-22) |
|---|---|---|
| NW-AUD-010 | High / High | Release evaluator only demotes strict-ancestor evidence to `STALE_EVIDENCE`; absent, future, divergent, missing, malformed, and operationally unresolved evidence can leave a raw `MET` condition effectively met; Git negative ancestry and operational failure collapse to one boolean (`src/core/releaseCertification/index.ts`, `bin/project-state-check.mjs`). |
| NW-AUD-014 | High / High | Child-process hardening rule enumerates a manual file list rather than every invocation node; unlisted callers spread ambient env, use acquiring `npx`, or omit bounds (`bin/lib/hardening/rules/process-and-network.mjs` and cited bin callers). |
| NW-AUD-019 | Medium / High | Canonical private-value regex requires an unquoted `label:`/`label=` shape, so normal `JSON.stringify` objects with quoted `token`/`password`/`customer` keys pass; sentinel-shaped tests mask the bypass (`src/core/policy/privateScreening.ts`). |
| NW-AUD-018 | High / High | Authenticated URL reducer preserves ordinary lowercase identifier segments; constructor/manifest, repository snapshot, and summary writers bypass the authenticated sanitizer; late mode transition leaves directory state unhardened (`src/core/safety/redaction.ts`, `src/core/evidence/runRecorder.ts`). |
| NW-AUD-020 | High / High | Unknown API requests continue as `PASSIVE_UNKNOWN_OBSERVED` during navigation or without intent; action intent dies at 250 ms before the 10 s settlement barrier; CDP redirect fallback is host-only (`src/browser/observers/networkObserver.ts`, `src/core/journeys/engine.ts`, `src/browser/network/fetchGuard.ts`). |

None was mechanically superseded between planning SHA `34517c9b` and base
`4a3df8cd` for the cited surfaces (parallel read-only censuses: 019 and 020
confirmed empty diffs on cited files; 014 and 018 censuses launched at
campaign open).

## What this campaign changes

- Umbrella continuity + this OpenSpec route own serial orchestration, phase
  gates, cross-phase audit, single final certification, and terminal stop.
- Each remediation is implemented under its own existing OpenSpec identity
  and proven with live reproduction, focused regression, adversarial/
  mutation proof, and a coherent commit, strictly in order 010 → 014 → 019 →
  018 → 020.
- C-00 lifecycle uses the NW-AUD-006 authority-binding contract (invoking
  checkout only, exact `--expect-session`/`--expect-head`, no `--root` on
  mutators, no force push).

## Planning artifacts consumed (not rewritten as implementation)

- `openspec/changes/nightwatch-release-evidence-lineage-integrity-v1/` +
  `.agent/tasks/nightwatch-release-evidence-lineage-integrity-v1/`
- `openspec/changes/nightwatch-child-process-boundary-totality-v1/` +
  matching task directory
- `openspec/changes/nightwatch-private-payload-screening-structural-integrity-v1/`
  + matching task directory
- `openspec/changes/nightwatch-authenticated-evidence-minimization-integrity-v1/`
  + matching task directory
- `openspec/changes/nightwatch-semantic-request-admission-integrity-v1/` +
  matching task directory
- Precedent: `nightwatch-session-mutation-authority-binding-v1` (NW-AUD-006
  implementation campaign, COMPLETE).

## Acceptance gates for this umbrella change

- Delta-spec scenarios for fixed order, live proof, validation cost policy,
  cross-phase audit, and terminal honest closure all hold on the integrated
  checkpoint.
- All five remediation changes strict-validate after their phase closure
  updates; this change strict-validates.
- Final certification receipts and C-00 integrate/release/remove evidence are
  recorded in the umbrella task STATE/REPORT without future-value
  placeholders.
- Safety counts (DEV/NEXT/production contacts, authenticated runs, customer
  values, real credentials, sibling writes, external publication, force
  pushes, history rewrites) are zero.
- Remaining audit backlog is enumerated and not started.

## Non-goals (restated)

No authority beyond the five named remediations; no real environment contact;
no fabricated phase completion.
