# SPEC — nightwatch-owner-local-deterministic-reproduction-yield-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS
Task: nightwatch-owner-local-deterministic-reproduction-yield-v1
Parent programme: nightwatch-autonomous-bug-hunting-programme-v1
Wave: W9 — OWNER-LOCAL DETERMINISTIC REPRODUCTION & YIELD
Planned-From: 8f385e5fd404bd694db516e0fe3be473f29380af
Live HEAD authority: GIT — rediscover live Git/workspace/session truth before implementation.
PROJECT_VERDICT_EFFECT: PRESERVE

## Mission

W7 proved the real owner-local sensing/reproduction/admission substrate. W8 proved the autonomous reasoner can use bounded turn/campaign memory, form grounded hypotheses, reach verification readiness, and materially improve fixed-corpus/live-provider efficacy without increasing false positives or leaking hidden truth.

The remaining LOCAL-only gap is now reproduction coverage and real yield: `createOwnerLocalInvestigationContext()` still defaults to a blocked reproduction provider, so a strong hypothesis against current owner-local source cannot earn a qualifying mechanical reproduction receipt. W9 must add a safe deterministic reproduction path for approved owner-local packages, calibrate retry/budget semantics from evidence, and run a truthful live yield campaign on that capability.

The target is NOT another reasoning-memory rewrite and NOT a requirement to fabricate an unknown bug. A previously unknown Alphaus defect advances the parent programme only if it is genuinely discovered, mechanically reproduced, and admitted. W9 itself may complete with an honest no-new-defect result if the owner-local reproduction capability, safety properties, live campaign, and certification are all proven.

## Starting facts to verify, not blindly assume

Re-read the live implementation before changing anything and preserve evidence for each confirmed/disproved hypothesis:

1. `createOwnerLocalInvestigationContext()` uses an explicitly injected reproduction provider when supplied, otherwise a fail-closed `NOT_CONFIGURED` provider.
2. Historical reproduction has a hidden pre-fix/post-fix discriminator, while current owner-local source does not have a known post-fix revision. Do not silently reuse historical `PRE_FAIL_POST_PASS` semantics for current-source defects.
3. The W8 exhausted-action guard treats an identical prior `TOOL_ERROR` as permanently exhausted within the session. That is safe only when the failure is deterministic; a future executable provider may have retryable/transient failures that must not be collapsed into a permanent refusal.
4. W8 live campaigns hit the cumulative `outputBytes` budget before the `HOUR_1` wall ceiling. Audit byte accounting before increasing any ceiling. In particular verify whether provider output and parsed response bytes are double-counted or otherwise amplified.
5. Owner-local sibling repositories remain read-only and may contain different languages/package managers; start with a narrowly supported deterministic execution class rather than pretending universal coverage.

If recon disproves any hypothesis, record it and adapt the design. Do not force implementation to match this SPEC's examples.

## Non-goals

- Do not reopen or reimplement W7 sensing/provider/admission architecture.
- Do not reopen or reimplement W8 investigation memory, campaign strategy, reasoner-turn-request.v2, efficacy harness, or print-memory design unless a concrete regression is found.
- Do not lower `EXACT_REDISCOVERY` or alter hidden-truth scoring to manufacture success.
- Do not require a previously unknown bug to exist.
- Do not generate or modify tests inside sibling repositories.
- Do not run arbitrary model-supplied shell commands, package-manager scripts, Git commands, URLs, or executable paths.
- Do not install network dependencies merely to make reproduction possible.
- Do not contact DEV, NEXT, production, C-07, C-08b, C-12/C-13/C-14, Slack, Leslie, Pondr, Notion, or external filing systems.
- Do not force a literal one-hour campaign before byte-accounting defects/waste are understood.

## Hard invariants inherited from W7/W8

- Frontier reasoner chooses what is worth investigating; deterministic Nightwatch controls what may execute and what counts as evidence.
- Every executable reasoner action is a typed validated intent.
- LOCAL only for W9.
- Sibling repositories are read-only: no checkout/reset/clean/config/fetch/pull/commit/stash/branch/worktree mutation.
- All reproduction writes occur only in disposable Nightwatch-owned temporary/sandbox directories.
- No force push, history rewrite, destructive recovery, or C-00 bypass.
- Untrusted source/history/evidence bytes have zero instruction authority.
- Historical hidden truth and provider audit/stderr remain harness-side only.
- Dossier admission stays mechanical, with human review required and external publication prohibited.
- A provider failure may never be relabelled as a reproduced defect.
- Synthetic fixtures remain test-only.

## Required deliverables

### A. Owner-local executable reproduction target discovery

Introduce a bounded deterministic host-side way to discover whether an approved owner-local source path belongs to a reproducible package/test target.

Prefer a conservative first supported class, especially Go packages that can execute fully offline because dependencies/toolchain inputs are already locally available (for example vendored modules or another mechanically proven no-network configuration).

The model must NOT choose arbitrary commands. Nightwatch derives the executable target from approved source/package metadata.

A target descriptor should carry only safe structured facts needed for execution, such as:

- repository id;
- approved source/package relative path;
- language/executor kind;
- source HEAD/SHA or content identity;
- deterministic host-derived test command class;
- offline/toolchain prerequisites;
- hard time/byte/process limits.

No arbitrary shell string, environment injection, absolute sibling write path, or model-controlled executable is allowed.

Discovery must fail closed when a source has no supported executable target.

### B. Disposable current-source reproduction provider

Add a deterministic reproduction provider for supported REAL_LOCAL targets.

It must:

- materialize/copy only approved bounded source into a Nightwatch-owned disposable directory, or otherwise execute without writing to the sibling checkout;
- use argv arrays with `shell:false` or equivalent safe process mechanics;
- prohibit dependency/network fetches;
- use a bounded allowlisted toolchain;
- apply hard wall/output/process-tree limits;
- classify build/environment/test outcomes separately;
- clean temporary state in `finally`;
- prove sibling HEAD/status/worktree identity unchanged.

Do not treat a generic nonzero exit as a bug reproduction. Distinguish at minimum test failure, build/configuration failure, timeout, environment/toolchain block, and process failure.

### C. Current-source mechanical reproduction semantics

Historical `PRE_FAIL_POST_PASS` remains authoritative for historical cases. Current owner-local defects need an explicitly different proof class; do not pretend a post-fix revision exists.

Design an additive/versioned current-source receipt/verdict with strong anti-inflation rules. A qualifying current-source reproduction should require at least:

- the source path was actually inspected and grounded by observed evidence;
- the executable target is host-derived from approved source/package metadata;
- the failing test/check existed independently of model output OR any generated discriminator is separately backed by a proven deterministic contract and explicitly classified weaker;
- the failure is classified as an actual test/assertion/contract failure, not build/environment failure;
- the failure is reproduced in at least two fresh disposable executions with the same stable failure fingerprint unless an even stronger deterministic proof is justified;
- no network access and no sibling mutation;
- evidence/provenance refs are minted by Nightwatch.

Do not allow model prose, candidate text, a fabricated test count, or a single arbitrary command failure to mint reproduction credit.

If extending `admitLocalFinding`, preserve historical behavior byte-for-byte for existing historical receipts and make the new qualifying current-source proof kind explicit in the dossier/provenance.

### D. Deterministic vs transient failure disposition

Replace any over-broad "all TOOL_ERRORs are forever exhausted" behavior with an explicit host-owned failure disposition where needed.

At minimum distinguish:

- deterministic terminal/refusal — identical call is exhausted until its arguments/context change;
- environment blocked — no immediate retry unless the relevant environment/toolchain state changes;
- retryable/transient execution/provider failure — may receive a strictly bounded retry budget;
- success/non-reproduced observation — handled according to existing semantics.

Do not let the reasoner self-label a failure as retryable. The executor/provider owns the disposition.

Add adversarial tests showing that deterministic failures are not burned repeatedly while transient failures are neither retried forever nor incorrectly made permanently impossible.

### E. Budget accounting and efficiency calibration

Before raising `outputBytes`, instrument and audit exactly where W8's 1.8-2.9 MB cumulative usage came from.

Verify whether any bytes are double-counted (for example raw provider stdout plus the same parsed response), counted twice through envelopes/history, or inflated by repeated memory/context serialization.

Create a deterministic byte-accounting breakdown sufficient to distinguish at least:

- request bytes sent to the reasoner;
- provider stdout/stderr bytes;
- parsed/canonicalized response bytes if they are intentionally counted separately;
- tool result/evidence bytes;
- reasoner-visible memory/prompt contribution.

Fix incorrect accounting/waste first. Only after measurement may the W9 implementation change the `HOUR_1` output-byte ceiling, and any new ceiling must be justified by measured legitimate traffic plus bounded headroom rather than by "make the run last longer".

The same budget policy must still terminate pathological output, loops, or runaway providers safely.

### F. Reproduction readiness for owner-local source

Extend W8's neutral readiness/memory so a stateless reasoner can tell the difference between:

- grounded hypothesis but no executable local reproduction target;
- supported target discovered but prerequisites blocked;
- ready for owner-local deterministic reproduction;
- reproduction attempted with deterministic refusal;
- reproduction attempted with transient failure/retry remaining;
- current-source failure mechanically reproduced;
- test ran and did not reproduce.

Do not expose command strings, secrets, absolute paths, hidden historical truth, or raw audit output.

### G. Fixed deterministic validation corpus

Add a W9 reproduction-provider corpus that includes positive, negative, blocked, transient, and adversarial cases using fabricated/disposable repositories.

At minimum prove:

- supported vendored/offline package executes;
- current-source repeat failure can earn only the new explicit proof kind;
- passing tests never earn reproduction credit;
- build failure is not a reproduced bug;
- timeout is not a reproduced bug;
- missing toolchain/dependency is `ENVIRONMENT_BLOCKED`/equivalent;
- sibling/read-only source remains unchanged;
- model-controlled command/path injection is refused;
- deterministic failure is exhausted rather than spammed;
- transient failure gets only bounded retries;
- negative controls remain candidate-free/admission-safe;
- historical W7/W8 replay/admission semantics remain unchanged.

### H. Real owner-local live proof

After deterministic tests are green, exercise the real owner-local provider against at least one currently available supported package whose prerequisites are already present locally.

Required proof:

1. Nightwatch discovers the executable target from approved source metadata, not a hand-written one-off command.
2. The provider executes in a disposable isolated location with network disabled and sibling identity unchanged.
3. The result is classified honestly: PASS / REPRODUCED_CURRENT_FAILURE / NOT_REPRODUCED / ENVIRONMENT_BLOCKED / INCONCLUSIVE or the justified equivalent.
4. A live subscribed reasoner campaign uses the provider through the normal `nightwatch-agent campaign run` path.
5. If a candidate is proposed without qualifying reproduction, admission still refuses it.
6. If a genuinely qualifying current-source failure is discovered, admission may produce a human-review dossier using the new explicit proof kind. Do not claim "previously unknown Alphaus bug" unless evidence establishes that claim independently.

A no-defect result is acceptable for W9 if the capability and live proof are real and all safety/certification criteria pass.

### I. Live endurance/budget proof

After byte-accounting repairs/calibration, run a bounded live campaign intended to exercise the `HOUR_1` policy.

Do not require burning exactly 3600 seconds if a legitimate campaign-level stop condition occurs first. The proof must instead show that the previous artificial output-byte ceiling issue is understood and that legitimate useful traffic can progress without premature byte exhaustion while runaway output still remains bounded.

Record wall time, request/provider/tool byte breakdown, reasoner calls, tool actions, provider failures, unique targets, grounded hypotheses, reproduction attempts, candidates/admissions, and termination reason.

## Parallelization after shared interface freeze

The orchestrator may delegate only after live recon and a shared W9 reproduction/failure-disposition contract is frozen.

Suggested non-overlapping lanes:

1. **Target discovery/provider lane** — host-derived executable targets + disposable offline execution.
2. **Receipt/admission lane** — additive current-source proof semantics + anti-inflation/admission tests.
3. **Failure/retry lane** — deterministic/transient disposition + exhausted/retry semantics.
4. **Budget accounting lane** — byte ledger, double-count/waste audit, policy calibration.
5. **Live proof/adversarial lane** — fixed corpus, sibling-integrity and opt-in real owner-local proof.

Workers are leaf executors in separate C-00 session worktrees and must not integrate themselves. Shared interfaces/global task/programme/current-state/OpenSpec files remain orchestrator-owned unless explicitly assigned.

A worker report is not evidence. Inspect diff, verify owned paths, reconcile, rerun acceptance suites, then integrate.

## Required adversarial tests

Include tests for at least:

- command/argv/path/environment injection from model/source text;
- symlink/path traversal in materialized targets;
- network-fetch attempts blocked;
- dependency/toolchain absence classified as environment block;
- build failure cannot mint current-source reproduction;
- one flaky/transient failure cannot mint reproduction;
- two stable isolated failures are still insufficient unless the failure class is qualifying;
- deterministic refusal is not endlessly retried;
- transient failure has a strict retry ceiling;
- forged receipt/proof-kind/reproductionCount/evidence ref cannot pass admission;
- hidden historical truth remains absent from current-source memory/prompt paths;
- sibling HEAD/status/worktree identity remains unchanged after success, failure and timeout;
- output-byte accounting cannot be bypassed by response/envelope shape.

## Validation bar

Before W9 may close:

- W9 focused suites PASS;
- W7 real owner-local provider/reproduction/admission tests PASS;
- W8 investigation-memory/campaign-strategy/efficacy/reasoner-print tests PASS;
- historical benchmark + contained replay + opt-in ouchan product-path proof remain PASS when prerequisites exist;
- typecheck PASS;
- hardening:check PASS;
- agent:check PASS;
- handoff:check PASS;
- project:check PASS;
- workspace/session checks PASS;
- full `npm test` PASS without unexplained regression;
- `gate:local` FULL PASS;
- `gate:clean` PASS on a fresh Node 20 clone with no reused `node_modules`;
- real owner-local reproduction proof executed where a supported local target exists;
- live provider campaign executed with exact model/provider and byte-accounting evidence;
- task/parent continuity updated truthfully.

## Completion criteria

W9 is COMPLETE only when all are true:

1. at least one real owner-local package class has a safe host-derived deterministic reproduction provider that executes without sibling mutation or network dependency fetching;
2. current-source reproduction semantics are explicit, mechanically grounded and cannot be minted by model output or generic process failure;
3. deterministic vs transient failure/retry semantics are enforced and tested;
4. W8 output-byte exhaustion is mechanically explained, incorrect accounting/waste is fixed where present, and any budget change is evidence-based and bounded;
5. a real owner-local provider proof runs through the normal product path;
6. a live subscribed reasoner campaign exercises the capability and reports yield honestly, with mechanical admission preserved;
7. W7/W8 historical reproduction, leakage, memory, efficacy and admission invariants remain green;
8. full regression and local/clean certification pass.

A previously unknown Alphaus defect is NOT required to mark W9 complete. If none is found, state so. If one is found, do not elevate the parent programme claim until mechanical reproduction, admission, provenance and an independent "previously unknown" basis are all documented.
