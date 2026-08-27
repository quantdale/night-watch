# Resolved Egress + Containment Truth Hardening

## Purpose

Execute the selected OpenSpec campaign end-to-end: reproduce the hostname-to-
socket containment gap, implement one bounded resolved-address authority for
all proxy protocols, make lifecycle evidence truthful, migrate containment
runtime identity, preserve the browser DNS/L6 residual, and complete local,
clean, and serial acceptance.

## Starting State

- Live starting SHA: `9a70e7f3e81255d56352b9efb291f0fb4f4f03de`.
- Planned-from SHA: `4981b212eed46ffde1edac2b175f1bd1b1f826d2`.
- The six intervening paths are the execution prompt and OpenSpec planning
  artifacts only; no runtime/test/safety implementation drift was found.
- Working tree was clean, branch `main` tracked `origin/main`.
- Toolchain: Node `v22.22.1`, npm `10.9.4`, Git `2.43.0`, WSL2 Linux,
  Chrome `151.0.7922.173`, Playwright `1.62.1`.
- Safety authority: LOCAL / repository source / synthetic loopback only.

## Scope

NUL-safe H0 audit; proxy resolver seam and pure address classifier; HTTP,
CONNECT, and WebSocket exact-address binding; bounded timeout/race behavior;
sanitized events/summary/RunRecorder truth; runtime state and real-run gate
identity; existing browser containment qualification; focused/full/clean
validation; durable safety, architecture, project, OpenSpec, and continuity
closure.

## Non-Goals

External environment or DNS contact, authenticated product runs, production or
data/infrastructure work, Docker/namespaces/firewalls/root networking,
hosts/system-DNS changes, TLS MITM, sibling writes, publication, runtime AI,
unrelated identity changes, broad refactors, and CI churn for external
zero-step billing/platform conditions.

## Safety Constraints

Hostname policy remains first and unchanged. All resolver answers are
synthetic/literal in tests; default resolver construction is internal to the
proxy. Validate the entire bounded answer set before selecting/dialing. Do not
persist raw IPs or resolver/OS diagnostics unless an existing privacy contract
proves it necessary; categorical family/class/reason data is sufficient. No
authenticated state is loaded and no external Alphaus or sibling repository is
modified.

## Architecture / Approach

1. Activate this continuity-v2 task and checkpoint the complete local H0 audit
   before production source edits. Re-review all paths changed since the
   planning SHA and deep-read the proxy/browser/safety/evidence/gate owners.
2. Capture baseline typecheck, hardening, focused proxy/safety/gate/evidence/
   smoke results, existing identities, skip inventory, browser contract, and
   timing/open-handle evidence.
3. Add red-team synthetic resolver/address/protocol/evidence/runtime tests that
   demonstrate the current hostname-only behavior and preserve valid controls.
4. Implement a pure standards-backed numeric address parser/classifier and a
   single bounded resolver/admission helper. Local uses exact canonical
   loopback; external classes require globally routable unicast; mixed or
   malformed sets fail closed.
5. Route HTTP, CONNECT, and WebSocket Upgrade through the helper, pass only
   the accepted numeric address/family to the upstream connector, preserve
   original authority semantics, and bound resolver/connect/race lifecycle.
6. Extend proxy events/summary/run recording only as required to distinguish
   policy authorization, resolution denial/failure, connection attempt,
   connection success/failure, and hard containment failure without leakage.
7. Add an explicit containment runtime identity and update state producers,
   parser, direct runner, global setup, and real-run gate. Old/malformed/newer
   mismatched state fails closed before authenticated browser creation.
8. Re-audit browser controls. Run only a zero-external-contact qualification
   if mechanically possible; otherwise preserve the exact
   `BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL` disposition.
9. Run focused slices after each implementation slice, then the full local
   cone, fresh clean Node 20 cone, browser smoke, canonical serial regression,
   privacy/identity/diff audits, and exact-head Git closure.

## Milestones

### M0 — Takeover, activation, H0 audit, and baseline

- Status: IN_PROGRESS
- Create this task's SPEC/PLAN/STATE/REPORT and route ACTIVE_TASK here.
- Complete all-file manifest/classification, marker/network/consumer searches,
  changed-since-planner review, and baseline gates before source edits.
- Acceptance: reviewed equals tracked; H0 and baseline are recorded in STATE;
  predecessor remains unchanged.

### M1 — Mandatory pre-fix reproductions

- Status: PENDING
- Add focused synthetic resolver/address/protocol/evidence/runtime probes.
- Record BEFORE behavior, including current false acceptance and exact-dial
  failing assertions, before changing production behavior.

### M2 — Address classifier and owned resolver/admission

- Status: PENDING
- Implement pure parsing/classification and bounded internal resolver seam;
  prove complete answer-set fail-closed semantics and timeout/duplicate/
  malformed/family handling.

### M3 — Exact-address protocol binding

- Status: PENDING
- Share resolution/admission/selection across HTTP, CONNECT, and Upgrade;
  dial numeric address/family, retain original authority, prevent re-resolution,
  and close lifecycle races without unbounded retries.

### M4 — Evidence truth and runtime identity

- Status: PENDING
- Add categorical outcome evidence and hard failure integration; update runtime
  identity producers/readers/gate; preserve privacy and audit all consumers.

### M5 — Browser residual and adversarial closure

- Status: PENDING
- Requalify existing browser controls, preserve the L6 residual if unproven,
  complete adversarial matrices, and run focused regressions.

### M6 — Full acceptance, documentation, and Git closure

- Status: PENDING
- Run native/clean/canonical gates; update durable docs/OpenSpec/report/state;
  commit validated checkpoints, push `main`, verify exact head and clean tree.

## Validation Strategy

At each relevant slice run the owning focused tests plus `npm run typecheck`,
`npm run hardening:check`, `git diff --check`, and no-new-skip/only audits.
Final validation includes all commands enumerated in the execution prompt and
OpenSpec tasks: local quality, owner provenance, inventory, synthetic campaign,
continuity/audit, project truth, clean Node 20, browser outer-proxy smoke,
privacy, exact identity checks, and canonical serial Playwright counts.

## Decision Log

- 2026-08-27 — Activated a fresh successor task because the pulled prompt is a
  new implementation campaign; the complete predecessor remains immutable.
- 2026-08-27 — Kept scope LOCAL / repository source / synthetic loopback only;
  no real Alphaus DNS/product, auth, data, cloud, infrastructure, or L6 work.
- 2026-08-27 — Treat `4981b21` as planning-only baseline and live Git as
  authority; current live `HEAD` is `9a70e7f` after the requested fast-forward.

## Discoveries

- H0 current manifest: `1,339` tracked regular/reviewed paths, `0`
  non-regular, `14,678,946` bytes, `293,399` newline lines,
  `sha256:77ab538468b754f90ec0ff30c518d68244794d4c049218f35571c43de5dbb4e4`.
- Current proxy uses hostname-only Node `http.request`/`net.connect`; runtime
  state only identifies the hostname policy version. Browser DNS prefetch is
  documented as unresolved/L6 residual.

## Deferred Work

Docker/container/network namespace/firewall/root isolation; real environment
DNS/address reconnaissance; any private routing contract not proven by
repository truth; source-proof/semantic/durable-artifact expansion; and any
unrelated authority or schema redesign.

## Completion Criteria

All OpenSpec items have evidence-backed checkboxes; reproduced defects are
fixed; address/protocol/evidence/runtime matrices pass; browser residual is
truthful; all safety counters are zero; docs and continuity agree; final
validated checkpoint is pushed with local/remote equality and clean worktree.
