## Context

W11 is a frozen predecessor. Its historical arm completed, while its
unknown-source arm became invalid after the frozen `opencode-go/glm-5.3`
provider timed out. W12 therefore measures a different question under a new
freeze and must never rewrite or re-run W11's historical result merely to make
the runs comparable.

Nightwatch already owns the relevant boundaries: the approved eight-repository
source registry, source-currentness checks, diverse current-source index,
bounded investigation loop, contained deterministic reproduction providers,
mechanical dossier/admission path, leakage checks, owner-local evidence, and
C-00 session lifecycle. W12 composes those capabilities and adds only the
measurement artifacts or focused guards needed to make the campaign truthful.

## Goals / Non-Goals

**Goals:**

- Freeze provider selection, current-source identity, scope, run matrix,
  budgets, stopping rules, admission semantics, leakage rules, and metrics
  before W12 investigation begins.
- Execute one broad all-repository run and one repository-scoped run for each
  admitted repository, with the declared Ouchan time exception only for
  measured execution coverage.
- Preserve invalid/provider-blocked runs and derive every metric from machine
  evidence, separating investigation breadth from reproduction breadth and
  candidates from admissions.
- Apply existing mechanical reproduction/admission unchanged, then perform
  read-only novelty adjudication only for admitted candidates.
- Prove scope/fingerprint immutability, non-vacuity, no leakage, no sibling
  writes, and the zero-contact owner policy at the end of the wave.

**Non-Goals:**

- Re-running W11's historical EXACT arm, benchmarking providers, or tuning the
  reasoner after seeing W12 results.
- Adding a weaker admission class, a general-purpose shell/tool authority, a
  new reproduction provider, or any DEV/NEXT/production/data-plane access.
- Claiming organizational novelty from absence in Nightwatch's local corpus.
- Widening the repository universe, budgets, matrix, or source roots after a
  result appears.

## Decisions

### 1. Use a two-stage first-pass provider freeze

Record an ordered provider preference list, compatibility and cost criteria,
structured-response requirements, probe timeout, retry policy, and the first
passing-candidate rule before probing. Probe candidates in order through the
existing reasoner CLI and freeze the first valid structured response. Do not
probe later candidates after a pass and never select by W12 investigation
quality. If the frozen provider fails before a valid W12 investigation result,
only the predeclared transition rule may regenerate the complete freeze; after
the first valid result, failure is provider-blocked and is never zero yield.

### 2. Bind one canonical machine-readable freeze to the matrix

Store the complete W12 definition as a versioned JSON document under the W12
task directory. Canonicalize and hash the full document, including repository
SHAs, provider identity, toolchain, run order, per-run budgets, source and
reproduction limits, stopping/abort rules, leakage and admission contracts,
metric denominators, and novelty procedure. Resume admission recomputes the
fingerprint and rejects changed provider, scope, budgets, stopping conditions,
admission, or repository identity before any provider call.

The fixed matrix is `BROAD` plus `REPO-<registry-order>` for all eight
repositories. The broad run and each scoped run use the same provider and
investigation policy. Ouchan receives the declared 60-minute scoped budget;
the other seven receive 30 minutes. This is a coverage-based exception, not a
result-based allocation.

### 3. Keep evidence append-only and metrics derived

Each run gets an immutable sanitized receipt. Provider failures retain their
failure class and contribute to provider-blocked counts only. A valid run
must have non-zero provider response bytes and source activity before a zero
yield can be published. Aggregation reads receipts and reproduction/admission
artifacts, not prose or manually typed totals, and emits `NOT_CAPTURED` when a
field is not present rather than converting missing evidence to zero.

### 4. Preserve the existing authority chain

The reasoner can inspect current source, form hypotheses, and request already
authorized contained reproduction. Host-owned Nightwatch code alone decides
repository scope, tool safety, reproduction availability, evidence validity,
admission, and novelty class. No source root, executor, network access,
credential path, or persistence authority is widened for yield.

### 5. Adjudicate novelty only after admission

For each mechanically admitted candidate, a separate read-only pass compares
safe identity/evidence against the frozen Nightwatch corpus, local Bug Atlas,
current owner-local findings when permitted, and relevant local Git history.
The completed investigation is not re-opened with those results. Outcomes are
limited to `MATCHES_KNOWN_DEFECT`, `NEW_TO_FROZEN_NIGHTWATCH_CORPUS`, or
`NOVELTY_AMBIGUOUS`; `ALPHAUS_CONFIRMED_PREVIOUSLY_UNKNOWN` requires
independent organizational evidence and is not expected from this local wave.

## Risks / Trade-offs

- **[Provider degrades mid-matrix]** → Preserve every failed receipt, stop or
  classify remaining runs according to the freeze, and report provider health
  separately from yield.
- **[Current source drifts during execution]** → Compare every admitted
  repository before and after the campaign; refuse or invalidate the wave on
  SHA drift rather than silently rebinding the freeze.
- **[Reproduction coverage is structurally narrow]** → Report eight-repository
  investigation breadth separately from the one-repository deterministic
  reproduction ceiling; do not manufacture reproduction for unsupported repos.
- **[Interesting candidate biases later work]** → Keep run order, budgets,
  allocation, and stopping rules frozen and continue the matrix unless a
  declared safety/provider stop fires.
- **[A metric field is absent or ambiguous]** → Emit an explicit categorical
  unavailable value and block a completion claim that needs it; never infer a
  zero from missing data.
- **[Campaign artifacts expose hidden truth or secrets]** → Use the existing
  redaction/leakage boundary, canary it before publication, and keep raw
  provider/customer material in the owner-local store only.
