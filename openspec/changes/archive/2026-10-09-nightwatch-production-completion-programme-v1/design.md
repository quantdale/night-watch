# Design — Nightwatch production completion programme

## Context

The starting position is unusual and it determines everything below. This is
not a half-built system with broken code: measured at `36bd493`, typecheck,
`hardening:check`, `project:check`, `agent:check`, `validation:universe` and
`session:status` all pass, the last validated implementation carries a
full eleven-group `gate:local` receipt and a 4,789-test offline regression, and
148 task directories record eleven consecutive terminal campaigns.

What is missing is on the other side of the gate. Eighteen declared checks have
never executed. Exact-head CI has never run a step. The framework has never
admitted a finding. `POSITIVE_DEPLOYMENT_FACTS` is 0. And the project's own
"what is open" surface — 57 OpenSpec changes with 150 unchecked boxes — is
wrong fourteen times out of fifteen.

That last fact shapes the sequencing. A backlog derived from an untrustworthy
ledger is an untrustworthy backlog, so ledger reconciliation is not
housekeeping to be done last; it is the prerequisite that makes every other
estimate in this programme checkable.

A second pass traced the implementation rather than the records, and changed
the shape of the programme. The governance findings above are real, and they
are not the whole story: the code carries 904 lines nothing references, a
62-command CLI bound to its implementation only by runtime string paths, a
4,376-line untyped rule engine matching source text, 319 schemas with no
migration concept, a five-value error taxonomy rendered as one state, and a
human surface with no accessibility evidence. Those are ordinary
software-completion gaps, and they are the half of this programme an
implementer will spend most of their time on.

Constraints that bound every decision: the permanent owner scope freeze
(`FROZEN_BY_OWNER / INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE`); the
fail-closed outbound policy with explicit host classification; the C-00
one-agent/one-worktree/one-session protocol; the C-10 privacy firewall's
capability separation; D-4's structurally unloadable production environment;
and R-12's totality rule that an unregistered suite proves nothing.

## Goals / Non-Goals

**Goals.** Make the remaining work knowable and bounded. Close every lane that
can be closed locally. Convert the lanes that cannot into records that name an
owner action and expire. Demonstrate the product's purpose once, honestly,
whatever the result. Remove the structural blocker on the production path or
state plainly that it is external. Close the code-level gaps: delete or adopt
what nothing references, bind the CLI to its implementation statically, make
the rule engine sound, give persisted schemas a lifecycle, render the error
taxonomy the client already computes, declare the configuration surface,
produce accessibility evidence, and stop autonomy expiring silently. Give the
project a definition of done.

**Non-goals.** Re-hardening what is already proven. Re-opening any terminal
campaign's findings. Weakening any authorization gate to make a lane
executable. Acquiring access, credentials or authorization that only the owner
or the organization can grant. Making production loadable. Publishing anything
outside the repository.

## Decisions

### Ledger reconciliation is mechanical agreement, not a rewrite

The obvious fix for fourteen stale ledgers is to tick the boxes. That would
destroy the only signal distinguishing work a campaign did from work it
declared out of scope — `nightwatch-production-privacy-firewall-c10-v1`
already uses strikethrough for the second case, and blanket-ticking would erase
that distinction everywhere else.

The decision is to reconcile from task truth entry by entry, with three
outcomes per entry (done, declared-not-in-scope with a reason, carried forward
as live work), and to constrain the reconciliation diff so that no receipt,
SHA, count or date can change. The constraint is verifiable from the diff
itself, which makes it a check rather than a promise.

The alternative — deleting the stale ledgers — was rejected because the ledgers
are the only place several campaigns' acceptance criteria are written down.

### Agreement is enforced in the direction that can be false

`agent:check` already applies this principle: the DEF-RP-1 rule compares the
opening token of two claims and "fires only in the asymmetric direction that can
be false", and run against 127 task directories it produced exactly one hit.

The ledger check follows it. A terminal task with open boxes is always wrong. An
in-progress task with open boxes is normal. Enforcing only the first direction
gives a rule with no false positives, which is what makes it survivable in a
required gate group.

### The spec baseline is produced by archiving, not by authoring

`openspec/specs/` is empty after 57 changes. It would be faster to hand-write a
capability baseline than to archive 56 changes oldest-first, and it would be
wrong: a hand-written baseline is a new document with no provenance, competing
with the changes that actually established the behaviour.

Archiving oldest-first makes each change's delta apply to the baseline its
predecessors built, which is the mechanism working as designed. Where a change
established no capability — tooling, docs, infrastructure — `--skip-specs` with
a recorded classification is the honest outcome rather than an invented
capability. Archiving stops at the first validation failure rather than
proceeding under `--no-validate`; a baseline assembled past a validation error
is not a baseline.

### Lane state becomes data; the three-valued vocabulary is preserved

The `PROVEN` / `BLOCKED_EXTERNAL` / `UNAVAILABLE_CAPABILITY` distinction is one
of this project's better ideas — it exists because a single `UNAVAILABLE` once
conflated an absent host capability with an authority a campaign did not hold,
and R-01 then found the browser lane was not unavailable at all.

It is recorded in prose in two documents where it cannot be checked. Moving it
to a versioned record adds no new vocabulary; it makes the existing one
enforceable and lets staleness be computed rather than noticed. Staleness is
deliberately a computed report, not a fourth stored class: the class records
what was proven, and whether that proof is current is a function of the SHA it
was earned at.

### Blocks expire; they do not accumulate

Eleven campaigns recorded the same CI block and none recorded what would clear
it. A block with no owner action and no revisit date is indistinguishable from
abandonment, and it quietly becomes a permanent excuse.

Every non-`PROVEN` record therefore carries an owner action and a revisit date,
and `agent:check` reports an expired record. This is the same treatment applied
to the CI block, the Vue review date and the manual-lane inventory, because it
is the same failure mode in three places.

### The CI substitute may never set the CI field

`gate:topology` closes the runner-topology class that D-110 identified, and a
local `gate:ci` execution closes nothing about GitHub. Both are useful; neither
is CI. Permitting either to set `CI_EXECUTED_SHA` would reintroduce exactly the
projection the existing external-CI classifier was built to prevent.

The decision is that only a GitHub Actions run at the exact SHA may set that
field, and every substitute is classified as a substitute in its own receipt.

### The topology gate simulates absence categorically, not by string

`DEFAULT_SIBLING_ROOT` is a hardcoded absolute path by design, so that siblings
stay visible to `gate:clean` on the owner's machine. Creating the sibling-absent
condition by editing that constant would prove a different program from the one
that ships.

The condition is created by making the real path unreadable to the process.
Same for `bwrap` and Chrome: the binary is made genuinely unreachable rather
than a flag being flipped. Each absence is independently togglable so a failure
names which absence caused it — a combined run that fails tells you nothing
about which capability was mis-handled.

### Zero deployment facts is enforced as a refusal, not left as an authorization gap

Describing C-13 as `NOT_AUTHORIZED` invites the reading that an owner decision
is sufficient. With `POSITIVE_DEPLOYMENT_FACTS` at 0, an authorization granted
today would produce an I-3 violation: authority derived from an inference.

The decision is to make the refusal structural and independent of authorization
state, with its own code, and to prove the guard by removing it and observing
the suite fail. A guard whose condition is never true in the suite has never
measured anything — the failure class this repository has already recorded
twice.

### The production path is an external track, not an advance condition

Making C-12 → C-14 part of the definition of done would make the project
permanently incompletable by another organization's decision about `mochi`
access and observer identity. Making it invisible would be dishonest.

It becomes a separate track with its own status, reported alongside the project
verdict and excluded from the advance conditions.

### The yield campaign's result is the deliverable, not a positive yield

Requiring a non-zero yield would create pressure to loosen admission, which is
the one thing that would make this framework worthless. Strict
`EXACT_REDISCOVERY` means exact fingerprint equality and stays that way; a near
match is reported as near with its distance.

What the campaign must deliver is a per-case diagnosis. Zero with reasons is a
publishable result about the framework, the corpus and the provider surface.
Zero without reasons — the current state — is not a result at all.

### The CLI contract is enforced by an exhaustive sweep, never by per-command tests

62 entry points and one shared parser. A per-command test leaves the 63rd bin
unguarded, which is how 34 bins came to have no help in the first place.

The sweep enumerates `bin/*.mjs` from the filesystem, asserts the contract
against each, and asserts a non-zero discovered count so an enumerator that
stops finding bins fails loudly rather than passing vacuously. Side-effect
freedom under `--help` is measured — working tree, `artifacts/` and
`$HOME/.nightwatch` unchanged — not assumed, because the defect that motivated
this capability was precisely an unmeasured side effect.

### Status words get the same ledger treatment numbers already have

The census-figure ledger works because it is narrow: the ledger declares which
measures exist, and a document may state one only in a supported form. A
heuristic sweep over every capitalized token in 17,462 lines would be wrong,
since documents legitimately carry historical statuses, receipts and run ids.

The status ledger copies that narrowness exactly. Only declared keys are
governed; a governed key must be stated as the current value or with an explicit
historical qualifier. Everything else is left alone.

### Archives become append-only by rule, and current documents get a length bound

"Historical receipts, SHAs and decisions stay exactly as recorded" is stated as
an intention and enforced by nothing. Making archives append-only by rule turns
it into a check, with a declared-correction escape so a genuine erratum is still
possible and visible.

The length bound on current-truth documents is what makes the §5 short list
usable: instructing a reader to consult a 3,999-line file to learn the current
state is not a mitigation. Relocation into archives is byte-identical and
verified, so the split cannot lose a measurement.

### Dead code is resolved by decision, not by deletion reflex

`dtoFramework` is 519 unreferenced lines, and the reflex is to delete it. That
would be the wrong first move: it is a versioned-DTO registry with per-version
validators and coherence rules, with built-in registrations already written for
four of the schemas, and `schema-version-lifecycle` needs exactly that. The
decision is to require an explicit adopt-or-remove outcome with a recorded
reason for both subsystems, and to migrate the four already-registered kinds
first if adoption is chosen — proving the abstraction against real consumers
before expanding it.

The alternative, adopting it wholesale across 319 schemas, was rejected: an
abstraction that has never had a consumer has never been tested against one.

### The reachability rule must model three edge kinds or it will be turned off

A naive import scan marks the entire Control Center server and the self-dev
sandbox as unreachable, because bins load them by string path. A rule that
produces dozens of false positives gets disabled, and then the real dead code
returns.

The rule therefore resolves static imports, the loader's string-literal paths,
and `require.resolve` specifiers — the third because it is invisible to import
scanners and has already caused a real break (DEF-FC-03). This is also why
`cli-implementation-contract` requires the loader to take a literal: a computed
path is unverifiable by either rule, so it becomes a build error rather than a
silent hole in both.

### `bin/**` gets its own tsconfig rather than joining the root include

The bins are ESM JavaScript consuming CommonJS transpiled at runtime; folding
them into the root `include` would force one module setting onto two different
worlds. A separate `tsconfig.bin.json` under `checkJs` with the same `strict`
and `noUncheckedIndexedAccess` settings keeps both honest. `hardening-check.mjs`
already carries `// @ts-check` and JSDoc, so the intent exists and only
enforcement is missing.

Migration is by conformance count in reporting mode, not a single flip, because
14,000 previously unchecked lines will not pass at once. Exemptions are declared
list entries that fail once the bin passes — never inline suppressions, which
never expire.

### The rule engine's unsafe accessor is inverted rather than audited

Five positive assertions currently read raw source, so a comment satisfies
them. Auditing 644 matcher sites once fixes today and not tomorrow.

The decision is to make the safe form the default: one accessor returning
code-only text, with an explicitly named raw accessor for the rules genuinely
about comment text, plus a self-check that fails a fail-if-absent matcher over
the raw accessor. The unsafe path then requires someone to type its name.

### Persisted schemas get a disposition; refusal stays the default

Refusing an unknown version is right and stays. What is added is that refusing
must be *chosen*. `MIGRATE`, `READ_COMPATIBLE` and `ORPHAN` are the three
honest outcomes, and `ORPHAN` — the current de facto behaviour — becomes an
owner decision recorded in `DECISIONS.md` rather than a default reached by
omission.

`VERSION_UNSUPPORTED` is split out of `CORRUPT` because the operator's response
differs: a corrupt record is a defect to report, an old one is a migration to
run. Folding them loses that, and the project's own discipline is that absent,
skipped and unavailable are distinct from failed.

### The error taxonomy is a render-truth defect, and its guard belongs in the render harness

`ApiErrorKind` is computed, carried across the API boundary and discarded at
render — the same defect class four Control Center campaigns closed on the
success path. Their guards missed it for a structural reason worth stating: both
operate on snapshot contracts, and an error kind is not a snapshot field, so the
fixture generator never produces one.

The fix is therefore not a new bespoke check but an extension of the existing
differential harness into the failure path, with the coverage assertion driven
off the union type's members rather than a hand-written list, so a sixth kind
cannot be added without being rendered.

### Accessibility is specified as correctness, not compliance

Framing this as WCAG compliance would make it a checkbox that competes with
engineering work. The honest framing is that the Control Center exists to let a
human distinguish `FACT` from `RECOMMENDATION` from `UNKNOWN` and `PROVEN` from
`TRUNCATED` from `STALE`, and that a distinction the reader cannot perceive is
the conflation this entire system is built to prevent. Contrast ratios and
keyboard completeness are how that is measured; they are the instrument, not the
goal.

Pairs are enumerated from the rendered DOM rather than the stylesheet for the
same reason the style campaign toggled classes on live elements: a pair that
only arises through cascade is real, and a declared pair that never renders is
not.

### Authentication expiry is made loud, not automated

The obvious fix — automate renewal — is forbidden and should stay forbidden: it
would require Nightwatch to hold credentials, which the safety model rules out
and which is the reason `auth:capture` is human-led in the first place.

The decision is to make the artefact's lifecycle explicit and to fail closed
early: metadata written at capture, a pre-flight that refuses expired,
wrong-environment and unknown-age artefacts before any browser context exists,
and the state visible in the status surface and the Control Center. `UNKNOWN_AGE`
refuses rather than proceeding optimistically, because an artefact whose age
cannot be established is the one most likely to be stale.

Expiry is evaluated by the existing cookie applicability logic rather than a
second implementation, because two evaluators for one question can disagree —
the two-correct-halves defect this repository has already recorded.

## Risks / Trade-offs

**Reconciling fourteen ledgers touches many files and could bury a real
change.** → The diff is constrained to checkboxes, strikethroughs and added
reasons, and that constraint is itself checked. Reconciliation lands as its own
commit, before any implementation work.

**Archiving 56 changes could produce a large, low-quality spec baseline.** →
Archive oldest-first, stop at the first validation failure, and use
`--skip-specs` with a recorded classification for changes that established no
capability. A baseline with fewer, real capabilities is worth more than one
with 56 thin ones.

**A new required gate group can make the gate unrunnable.** → The ledger check
enforces only the asymmetric direction, is validated against all 148 task
directories before registration, and must produce zero false positives on the
reconciled tree before it enters the required set.

**The topology gate could become a second full gate, doubling gate time.** → It
runs the authoritative gate under simulated absence, which is expensive, so it
is a separate lane rather than a member of the required local set, executed at
release checkpoints and in CI when CI executes.

**Making `--help` universal touches 62 entry points at once.** → The shared
parser lands first with the sweep in reporting mode, entry points migrate in
batches with the sweep counting conformance, and the structural rule turns on
only when the count reaches 62. No batch changes a command's behaviour beyond
argument handling.

**An executed reclaim could delete referenced evidence.** → Refusal-first is
preserved, the refusal set is re-derived at execution rather than reused, the
plan is reviewed against the refusal set, `--apply` requires an explicit
confirmation token, and the deleted set is recorded. Unprovable means refused.

**The yield campaign could consume significant time and return zero.** → That
is an accepted outcome, and the pre-flight refuses to open the wave if provider
reachability is below a threshold recorded in advance, so a zero caused by an
unavailable provider cannot be mistaken for a zero caused by the framework.

**The advisory scan requires relaxing the egress boundary.** → Bounded to the
registry host, for the duration of one query, under explicit authorization,
with the standing policy unchanged for every other surface and the fail-closed
host classification still in force.

**The status ledger could make every documentation edit fail.** → Only declared
keys are governed, and the historical-qualifier form is always available. The
check is introduced in reporting mode across all 11 documents before it becomes
blocking.

**Decomposing `hardening-check.mjs` could silently change which invariants
run.** → Decomposition must be behaviour-preserving, proven by byte-identical
output on the same tree, and the rule registry becomes the enumeration
authority so an unregistered rule module fails rather than disappearing.

**Decomposing `App.tsx` could weaken the four guards built around it.** → The
rendered DOM for every view under the existing fixture matrix must be identical
before and after, and every exemption list must be unchanged or shorter. The
contract-coverage guard derives carriers mechanically, so per-view modules make
it stronger.

**A migration could corrupt owner review state.** → Migration validates against
the old version's validator before transforming, retains the original until the
new record is written and re-read, and an interrupted migration leaves the
original readable. A sanitized export exists before anything is orphaned.

**Refusing unknown-age auth artefacts could block an operator who has a
perfectly good session.** → Accepted deliberately, and bounded: the refusal
names one remedy, capture writes the record atomically so only pre-existing
artefacts can lack one, and a one-time adoption path records metadata for an
existing artefact without re-capturing.

**Type-checking `bin/**` could surface hundreds of errors at once.** →
Reporting mode with a conformance count, batch migration, blocking only at full
conformance. No batch changes behaviour.

## Migration Plan

Sequenced by dependency, not by value.

1. **Ledger truth first.** Reconcile the fifteen changes, add the agreement
   check in reporting mode, archive oldest-first, publish the baseline. Nothing
   downstream is estimable until this is done.
2. **Enforcement on.** Turn the agreement check blocking inside
   `AGENT_CONTINUITY` once it is clean on all 148 task directories.
3. **Lane state as data, then the topology gate.** The lane record is a
   prerequisite for the release conditions; the topology gate is the first lane
   that can move from unattempted to proven.
4. **Code-level foundations, sequenced by dependency.** The reachability rule
   and the dead-architecture decision come before the schema lifecycle, because
   whether `dtoFramework` is adopted determines how the lifecycle is built. The
   loader's literal-path requirement comes before both reachability and static
   symbol verification, since both depend on it. `bin/**` type checking comes
   before the rule-engine decomposition, so the decomposition is checked as it
   lands.
5. **Local capabilities in parallel, one owner each.** Operator CLI contract;
   hygiene and drift; documentation currency; Control Center residuals; the UI
   error taxonomy; the configuration contract; accessibility; the authenticated
   capability lifecycle. These share no surface and can run as separate sessions
   under C-00 — except the UI error taxonomy, accessibility and the Control
   Center residuals, which all edit `App.tsx` and must be one owner in one
   sequence, with decomposition first so the other two land in the decomposed
   layout.
6. **Owner decisions requested in parallel with steps 4-5**, because they carry
   organizational lead time: C-08b `mochi` read access, advisory egress, DEV
   authentication, evidence reclaim, the 16 branches, the Phase 9B/10B
   direction.
7. **Yield campaign** once provider pre-flight passes.
8. **Release definition last**, because its conditions reference the checks
   created in 1–7, and a definition written before them would reference
   nothing.

**Rollback.** Every capability is additive except the ledger reconciliation and
the archive. Both are single commits on a clean tree and revert cleanly. A new
check that proves unsound is demoted from the required set to reporting mode
rather than deleted, so the evidence it gathered is preserved.

**Integration.** Every step follows C-00: one owned session worktree per
capability, `session:status` PASS before work, fast-forward integration,
`HEAD == origin/main` verified after push, session released. No step commits
runtime findings.

## Open Questions

1. **Which CI route does the owner want?** Clearing the GitHub billing block, a
   self-hosted runner, or accepting `gate:topology` plus a current block record
   as the permanent position. The third is legitimate; it needs to be chosen
   rather than defaulted into.
2. **Is C-08b worth pursuing?** If read-only `mochi` access will not be granted,
   C-13 and C-14 should be recorded terminal rather than pending, and the
   production track closed honestly.
3. **Phase 9B/10B: unblock or close?** Fourteen thousand lines of semantic
   oracle have never met a real application. Either is defensible; the
   indefinite BLOCKED is not.
4. **Does the evidence-status colour taxonomy belong to the owner or to the
   product?** The predecessor recorded it as owner-facing. If no taxonomy is
   adopted, the map states its flatness — that decision is needed before the
   Control Center work starts.
5. **What is the status beyond `OPERATIONALLY_ACCEPTED` called?** The advance
   conditions can be defined without naming the target status, but the
   vocabulary should be the owner's.
6. **How much accumulated evidence should survive the reclaim?** R-06 measured
   ~670 MB reclaimable under the current refusal set; the retention window
   itself has never been set.
7. **Adopt or delete `dtoFramework`?** 519 lines of unreferenced
   versioned-DTO registry, and the abstraction the schema lifecycle wants. The
   cost of adoption is migrating four schemas to prove it; the cost of deletion
   is hand-rolling the lifecycle again.
8. **What is the default disposition for a persisted schema bump?**
   `ORPHAN` is today's de facto answer. Making `MIGRATE` the expected default
   raises the cost of every schema change; leaving `ORPHAN` the default keeps
   losing owner state. The programme requires the choice to be explicit per
   change; whether one of the three is the presumed default is the owner's.
9. **How far does accessibility go?** Non-colour encoding, measured contrast
   and keyboard completeness are specified as correctness. Whether a formal
   audit or certification is wanted beyond that is a separate decision with a
   separate cost.
