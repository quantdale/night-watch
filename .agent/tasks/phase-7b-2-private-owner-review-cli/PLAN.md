# Nightwatch Phase 7B.2 — Private Owner Review CLI

## Purpose

Provide a private, explicit, terminal-only owner review workflow over one
immutable AI artifact at a time, without increasing AI or product authority.

## Starting State

- Task ID: `phase-7b-2-private-owner-review-cli`.
- Starting SHA: discover from Git; bootstrap value
  `91bdc518088f575f7089fa9702197fb73793444f`.
- Prior validated implementation/substantive anchor:
  `257cc294850344149fd4c5b657beeff07e511c91`.
- Prior documentation anchor:
  `746a578a2440c2087442819e92eeed77234836ef`.
- Phase 7B.1.2 is complete; Phase 8 is not started.
- Do not repeat broad Alphaus reconnaissance or prior phase archaeology.

## Scope

Owner-review service, exact-ID storage reads, safe bug/oracle rendering,
interactive show/status/decide CLI, immutable digest-bound review write/read-
back, legacy read-only behavior, adversarial synthetic tests, offline
hardening/CI, durable state, full validation, checkpoint pushes, and closure.

## Non-Goals

Real model or provider execution, local-model canary, cloud AI, campaign or
browser/API execution, DEV/NEXT/production traffic, databases, infrastructure,
oracle installation, source modification by AI, publication, Git runtime
actions, arbitrary private-root selection, bulk artifact listing, raw JSON or
export modes, free-form owner notes, and Phase 8.

## Architecture / Approach

```text
explicit kind + exact artifact ID
  -> owner-only private store read
  -> strict artifact + persisted-identity validation
  -> terminal-safe deterministic projection/rendering
  -> fixed system decision boundary
  -> TTY A/R/S/Q choice
  -> exact matching confirmation token
  -> createHumanReviewRecord()
  -> immutable private writeHumanReview()
  -> exact review read-back + digest validation
  -> applyHumanDecision()
  -> snapshot-only effective review state
```

The owner-review service has no terminal I/O and no provider dependency. The
bin executable contains only tiny argument parsing, TTY/prompt/output glue,
and calls to the service.

## Safety Constraints

- Runtime owner review is local, private, read-only with respect to AI
  artifacts, and limited to one explicitly requested artifact ID.
- The CLI must not load provider execution, browser/API, campaign, Git,
  publication, or Phase 8 paths; it must not enumerate the private findings
  store.
- Decisions require a real interactive TTY, a fixed menu, and an exact second
  confirmation token. No argv, environment, file, pipe, or model prose may
  select a decision.
- AI text is untrusted terminal content: all output is plain text, sanitized,
  line-prefixed, and separated from fixed system prompts by a decision
  boundary.
- Tests use synthetic artifacts and injected temporary owner-only roots only.

## Milestones

### M0 — Bootstrap, recovery, threat model, and task routing

- Verify canonical Git root, clean synchronized `main`, remote, starting SHA,
  historical status, single writer, and required durable reads.
- Create SPEC/PLAN/STATE/REPORT and route ACTIVE_TASK.
- Inspect exact v1/v2 types, review/storage/validation/render APIs, private
  artifact policy, existing CLI loader, package scripts, hardening, CI, and
  tests; record source-of-truth conflicts.
- Status: COMPLETE.

### M1 — Exact-ID and review-read service hardening

- Add narrow exact-ID artifact/review reads and identity checks for bug/oracle.
- Preserve v1 show/status read compatibility and make legacy decisions
  read-only; distinguish absent review from malformed/corrupt review.
- Implement deterministic service operations and safe error classifications.
- Validate with focused storage/review tests and typecheck.
- Status: COMPLETE — exact-ID, absent/corrupt/schema/mismatch classification
  and snapshot-only projection are covered.

### M2 — Terminal-safe owner renderers

- Harden or wrap bug rendering for terminal output; add oracle rendering with
  safe deterministic metadata and AI-prefixed sections.
- Add explicit sanitizer for ESC, C0/C1, CR, backspace, and Unicode bidi
  controls; keep output plain text with system/AI prefixes.
- Validate adversarial bytes and fake-prompt fixtures before interactive CLI.
- Status: COMPLETE — plain-text sanitizer, AI line prefixes, oracle/bug
  renderers, and fixed freshness semantics are covered.

### M3 — Read-only show/status and interactive decide CLI

- Add exact argument parser and package script with only help/show/status/
  decide; reject duplicate/unknown/decision/root/provider/network/output
  options and positional data.
- Implement show/status read-only output and decide TTY gate, fixed choice
  menu, decision boundary, exact confirmation, cancellation, cleanup, and
  fixed note/timestamp.
- Ensure no CLI import graph reaches provider, browser, network, Git, or
  publication paths.
- Status: COMPLETE — show/status/decide parser, TTY gate, and structural
  hardening boundary and interactive persistence matrix are implemented.

### M4 — Immutable persistence, read-back, projections, and legacy matrix

- Route confirmed v2 decisions through existing record factory and hardened
  store only; re-read and validate exact review ID/artifact digest/identity.
- Apply the current projection and show snapshot freshness wording.
- Reject existing/corrupt review without overwrite; prove artifact bytes,
  evidence, campaign, and oracle catalog remain unchanged.
- Validate bug/oracle approve/reject/supersede and v1 cases.
- Status: COMPLETE — companion-only writes, read-back identity/digest checks,
  all three decisions, and legacy historical/unverified cases pass.

### M5 — Adversarial terminal/parser/controller matrix

- Add synthetic artifacts with ANSI/OSC/OSC52/cursor/CR/backspace/tab/newline/
  bidi/fake-prompt/model-authority/publication prose.
- Test exact-ID attacks, filename collision, corrupt/mismatched state,
  decision argv/env/file rejection, non-TTY, wrong confirmation, exact
  confirmation, Q/Ctrl-C cleanup, write failure, read-back mismatch, and
  second decision.
- Confirm no test accesses the real owner findings root.
- Status: COMPLETE — 15 synthetic owner-review tests pass, including controls,
  fake prompts, identity attacks, non-TTY, cancellation, write/read-back
  failures, and immutability.

### M6 — Hardening and private CI integration

- Extend offline hardening structural checks for CLI path/imports/options/
  writes and preserve `contents: read` CI permissions with synthetic tests.
- Add an explicit owner-review synthetic matrix CI step without secrets,
  artifacts, model service, or product/network dependencies.
- Run focused owner-review, existing AI/loopback, private-store, owner-policy,
  and agent-state validation.
- Status: COMPLETE — focused owner suite 15/15, predecessor AI/loopback/
  private-triage/owner-policy slice 83/83, typecheck, hardening, and agent
  state checks pass.

### M7 — Full local, isolated, architecture, and adversarial closure

- Run typecheck, hardening, focused/all current Playwright, synthetic campaign,
  agent check, diff/privacy scans, and isolated clean-checkout equivalents.
- Review changed diff and privacy surface; confirm sibling Alphaus repos are
  unchanged and all safety/privacy vectors are zero.
- Record stable implementation/substantive/documentation anchors, push
  validated implementation then documentation, verify live equality and exact
  final CI owner-review step, close task, and stop before Phase 8.
- Status: IN_PROGRESS — local implementation is ready for full validation and
  checkpoint review.

## Validation Strategy

Validate each milestone before advancing. Keep all fixtures synthetic and
offline; use only injected temporary private roots in tests. Before each push,
run scoped validation, inspect diff/privacy, check remote freshness, commit,
push without force, fetch, and verify local `HEAD == origin/main`. Final
closure must include clean-checkout validation and exact remote workflow/job/
step evidence.

## Decision Log

- 2026-08-14 — Owner review binds one exact immutable artifact snapshot; no
  current-freshness re-evaluation is invented for this task.
- 2026-08-14 — `decide` accepts only TTY menu input plus exact second token;
  argv, environment, files, piped stdin, and model prose cannot select a
  decision.
- 2026-08-14 — Plain text, per-line `[AI]` prefixes, and a fixed system
  boundary are the terminal security model; no ANSI output is required.
- 2026-08-14 — Review notes are a fixed safe string; no free-form owner data
  is collected or persisted.

## Discoveries

- Existing storage had filename-derived artifact reads and a required-only
  human-review read. The CLI now validates the persisted identity and has a
  narrow nullable review read so absence is distinct from corruption.
- Existing effective review projection required a current deterministic input;
  this task uses the existing projection semantics with no current input and
  explicitly labels the result snapshot-only.
- The existing TypeScript loader used by `auth-configure.mjs` is sufficient;
  no runtime TypeScript dependency was added.

## Deferred Work

- Local-model canary, Phase 8, real artifacts, product traffic, databases,
  infrastructure, publication, bulk listing, export, and richer owner notes.

## Completion Criteria

Complete only after all acceptance items in SPEC are evidenced, the exact
final CI workflow executes the owner-review synthetic matrix successfully,
stable anchors are recorded without self-reference, ACTIVE_TASK is closed,
and the canonical worktree is clean.
