# Nightwatch Control Center — Authority Integration + Hardening V2

## Frozen intent

Turn the completed read-only Control Center V1 into a truthful local
operational view over Nightwatch's existing authoritative state. Build bounded,
fail-closed, read-only in-process readers for validated run evidence, source
intelligence, Phase 24/campaign intelligence, and owner-local findings; wire
them through the existing V1 adapters and loopback server; preserve explicit
EMPTY, STALE, UNAVAILABLE, BLOCKED, and ERROR distinctions; and harden the
whole dependency cone before closing the task.

The task is local, loopback-only, synthetic-test-only, and read-only. Phase 24
remains the sole portfolio authority, source intelligence remains the sole
source authority, existing evidence/run records remain the run authority, and
the existing private dossier store remains the findings authority. No second
truth model, execution route, mutation control, or generic file browser may be
introduced.

## Starting evidence

- The requested `git pull --ff-only` fast-forwarded `main` from `858c2a6` to
  `ccbb57721d99020667881481411aa961d12229e5e`.
- The pulled change is planner-only and modifies `.agent/EXECUTION_PROMPT.md`.
  It is the active Control Center V2 campaign prompt, planned from
  `858c2a64fb2d8544725790a2641eac907b04332a`.
- The completed V1 implementation anchor is
  `e5ac2fff0f8840c80bb48a57ca0df56cba39c90d`; V1 task records remain
  immutable historical evidence.
- Baseline `npm run agent:check` passed with only the expected documentation
  checkpoint and historical legacy-task warnings; `npm run project:check`,
  `npm run typecheck`, and the 25-test focused V1 Control Center suite passed.

## Required outcomes

1. The normal Control Center launcher reads real bounded local authorities for
   runs, source intelligence, campaign intelligence, and owner-local findings
   when those authorities are present. A genuine absence remains explicitly
   unavailable or empty; it is never fabricated as fresh success.
2. Run list/detail/timeline/execution graph readers use validated fixed-root
   artifacts, bounded stable reads, deterministic ordering, race handling, and
   no raw-evidence leakage.
3. Source and campaign snapshots reuse existing approved source/currentness,
   Phase 24, and campaign-intelligence authorities without CLI shell-outs,
   network access, sibling writes, or a parallel selector.
4. Findings read only validated private owner-local dossiers and project
   metadata; malformed, unsafe, stale, symlinked, or privacy-violating state
   never becomes AVAILABLE public data.
5. Snapshot, cache, generation, and advisory SSE semantics are bounded,
   coherent, deterministic, currentness-safe, concurrency-safe, and cleanly
   shut down.
6. Existing V1 server/privacy/loopback/accessibility protections remain
   green, and a deterministic built-server synthetic non-empty browser flow
   proves Overview, Safety, Runs, Execution, Campaign, Source, and Findings.
7. A genuine whole-repository hardening audit records coverage and disposition
   across safety, continuity, provenance, persistence, concurrency, process /
   filesystem boundaries, validation, gates, CI, and the nested UI. Every
   reproduced Critical/High defect is fixed; bounded Medium fixes are made only
   with clear evidence and low regression risk.
8. Durable docs and continuity records agree with implementation truth; the
   task closes only after required local/clean/full validation and a clean
   non-forced push with local `HEAD == origin/main`.

## Scope

In scope: `src/controlCenter/**`, fixed-root local readers, pure authority
facades/snapshot builders, V1 adapter/server/UI integration, synthetic reader
fixtures, source/campaign/finding authority bridges, cache/currentness/SSE
hardening, repository-wide audit and bounded repairs, hygiene inventory,
README and durable project documentation updates, and task continuity files.

## Permanent exclusions

- DEV, NEXT, production, authenticated browser/API execution, product
  observation, mutations, database/datastore/cloud/infrastructure/IAM work.
- Alphaus sibling-repository writes, installs, checkout rewrites, or fetches.
- External publication, issue/message creation, shared findings, or remote
  hosting/LAN binding.
- Raw source text, request/response bodies, customer values, credentials,
  cookies, auth strings, screenshots, traces, arbitrary paths, and raw
  console/network data in DTOs, DOM, logs, task files, or Git.
- HTTP-triggered child processes, shell/CLI execution, Git commands, browser
  actions, campaign execution, file mutation, or refresh side effects.
- A second Phase 24 selector, source-intelligence graph, findings schema, or
  run-result authority.

## Completion evidence

The final REPORT must enumerate selected authoritative readers, the complete
producer/consumer map, cache/generation/currentness rules, adversarial cases,
whole-repository audit inventory and disposition, every changed public
contract, exact validation counts/receipts, privacy/safety review, external CI
truth, deferred work, and final continuity/Git equality. No external CI result
may be called green unless it actually ran for the live head.
