# Final Report

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

Task ID: nightwatch-reliability-yield-and-state-protocol-v1
Phase: RELIABILITY_YIELD_AND_STATE_PROTOCOL_V1
Status: COMPLETE
Project verdict effect: PRESERVE
Starting SHA: 7ac265594719f3d93eabf78e0bd9f749ef63dba7
Last validated implementation SHA: f8757303403dffab6039be3f51b807c8631e3c6a
Last substantive checkpoint SHA: f8757303403dffab6039be3f51b807c8631e3c6a
Last documentation checkpoint SHA: e33c07fdd00bf1cb2fb01f3842a4c935178155f6

## Final verdict

Nightwatch remains `OPERATIONALLY_ACCEPTED`. This successor campaign is
complete for its locally authorized scope. It did not create a new project
verdict or weaken the read-only, containment, source-proof, privacy, or
promotion boundaries.

## Git

- Starting SHA: `7ac265594719f3d93eabf78e0bd9f749ef63dba7`.
- Implementation checkpoints: `bf35bf3` (settlement/intent attribution),
  `a5ff79f` (planner/yield), `82e661b` (replay/state/cache/property), and
  `f875730` (handoff fixture compatibility).
- Final evidence was measured from clean source HEAD
  `e33c07fdd00bf1cb2fb01f3842a4c935178155f6`; closure documentation is the
  next durable descendant.
- At the last inspected checkpoint, `main == origin/main` and the tree was
  clean. The final closure commit must preserve that parity.

## Phase 2C reliability

The Nightwatch-owned intermittent path was reproduced deterministically in a
local delayed-response fixture. A response could arrive after the old
settlement sample, omitting the oracle, and response attribution could read
mutable current intent. The fix tracks intentional requests and pending
handlers through a bounded settlement barrier, snapshots request intent, and
classifies unknown capture as a framework defect. Repeated local runs now
capture the same sanitized malformed-response fingerprint and initiating
step.

The current external DEV state was checked once through the guarded launcher:
one initial attempt was stopped at repository freshness while documentation
was dirty; after the checkpoint was clean, the safety gates passed but the
first journey stopped before browser-context creation with
`HUMAN_AUTH_ACTION_REQUIRED`. Current continuation counts are 0 actual DEV
observations, 1 auth-blocked attempt, and 0 replay divergences. This is not a
DEV reliability rate and is not relabeled as a retry pass. No credential
refresh or bypass occurred.

## Defects fixed

- Premature response/oracle settlement could produce a false clean result;
  covered by delayed-response journey and 44-test replay/readiness regressions.
- Mutable response-time intent could change attribution and replay identity;
  request-origin intent is now bounded and stable.
- Raw replay serialization made semantically equivalent object-key order
  identity-bearing; canonical object-key ordering now preserves array order
  and rejects unsupported/cyclic/oversized shapes.
- Accepted-project authorization and milestone state depended on task-name or
  incidental prose; explicit `PRESERVE`/`REEVALUATE`/`SUPERSEDE` effects and
  location-bound structured fields now fail closed.
- Cache/property tests were strengthened to mutate authoritative version keys
  and assert actual canonicalization/privacy-boundary invariants.
- A handoff fixture omitted the new explicit verdict effect; it was migrated
  without weakening production validation.

No Critical or High defect remains deferred. The two High ledger entries were
the settlement false-success path and state-authorization ambiguity; both are
fixed and regression-covered.

## Autonomous yield

The source census remains `NO_SAFE_NEW_FAMILY`; no proof bar was weakened and
no artificial family was invented. Useful selection improved instead: the
direct current authority measured 128 considered / 3 eligible / 3 selected,
with scores `953245 > 953140 > 953105`, zero selected redundancy, and byte-
identical repeated planner projections. Diversity covered 1 repository, 3
route families, 1 entity type, 3 invariants, 3 journey types, 1 interface,
and 2 source-change clusters.

## Product findings and clustering

The historical sanitized DEV anomaly remains the product-owned
`GET /m/blue/billing/v1/billinggroups` malformed-JSON observation from the
prior accepted campaign. This successor made no fresh product observation
because authentication stopped before browser context. Existing clustering,
sanitized evidence, and product-vs-framework classification regressions stay
green; no new dossier or duplicate product finding was created.

## State protocol and replay

Project-state authorization no longer uses `nightwatch-*` task-name matching.
An active task must declare an explicit bounded verdict effect. `PRESERVE`
allows hardening to remain `IN_PROGRESS` while an earned operational verdict
stays accepted; `REEVALUATE`/`SUPERSEDE` are explicit routes for truthful
requalification or replacement. Structured active/live fields cross-check
task, phase, status, effect, next action, completion, and execution prompt.
Milestone parsing recognizes explicit status fields rather than status words
embedded in narrative prose.

Replay equality canonicalizes plain object keys, retains meaningful array
order/multiplicity, rejects unsupported/cyclic/oversized evidence, and
classifies capture, timing, environment, auth, product, and framework
divergence separately. Strict replay remains required for success.

## Cache/property audit

The cache matrix now changes the actual analyzer and taxonomy version inputs
used in currentness keys. The canonical-digest property suite covers true
nested permutation equivalence, non-mutation, cycle/prototype rejection,
exact depth/node/byte bounds, and bounded diagnostics. Raw canonical JSON is
not treated as a privacy mechanism; secrecy is tested only at the digest and
evidence boundaries where required.

## Validation

- Canonical full suite: 2,690 total; 2,677 expected/passed; 13 skipped; 0
  failed; 0 flaky.
- Isolated full suite: exact same 2,690 / 2,677 / 13 / 0 result and exact
  same 13 skip identities, using a fresh no-hardlink Nightwatch checkout and
  six detached source clones.
- Local gate: all 10 required groups PASS; semantic compatibility 1,950 /
  1,937 / 13 / 0; owner provenance 91; synthetic campaign 74; receipt
  `receipt:sha256:58005c13ef803536d167d852`.
- Clean gate: Node 20 fresh install, clean before/after, no reused modules,
  no auth/finding state, zero sibling writes; all 10 groups PASS; receipt
  `receipt:sha256:716668b15b0e58c39b135ccb`, clean receipt
  `clean-receipt:sha256:778d4a900de355724261fe51`.
- Control Center: typecheck PASS; 2 files / 11 tests PASS; 3-file,
  259566-byte build PASS with no external references or embedded content.
- Agent/project/handoff truth: PASS; agent audit 91 tasks (67 strict v2,
  24 legacy), 0 strict errors, 34 historical warnings.

## DEV

`observe:preflight -- --env=dev` passed the bounded target/host/proxy
preflight and production denial. The fresh continuation stopped at
`HUMAN_AUTH_ACTION_REQUIRED` before browser context. Phase 2C/4/5/campaign/
replay current observations are therefore not claimed. Prior accepted DEV
evidence remains historical: Phase 2C retry pass, Phase 5 pass, 5/5 campaign
prepare/resume, and the retained billinggroups product anomaly.

## Reproducibility

Canonical and topology-correct isolated runs used the same source snapshot
and the same 13 skip identities. The isolated Nightwatch and six detached
source checkouts were clean after execution. The Node 20 clean gate passed
with clean before/after and zero sibling writes.

## CI

The one inspected Actions run for `e33c07f` was run `33355692348`, job
`99377288744`: conclusion `failure`, `steps=[]`, runner id 0. It executed no
quality-gate steps and is external non-evidence, not a local validation
failure. No rerun was requested.

## Remaining limitations

- A repeated real-DEV Phase 2C reliability rate and fresh Phase 4/5/campaign/
  replay observation remain unavailable until the owner refreshes the
  external authentication state and authorizes a new bounded run.
- The source census still has no safe new proof family; selection/scheduling
  is the available yield lever under the current source state.
- Actions remains non-evidence when the platform produces a zero-step job.

## Recommended successor

No immediate successor is required for the local result. If the owner wants
fresh real-world reliability measurements, create a separately authorized
successor after refreshing owner-managed DEV authentication. It should run a
bounded serial sample and retain every clean, divergence, auth, environment,
product, and framework outcome without retry relabeling.
