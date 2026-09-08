# Alphaus Bug Finding Handoff — Operational Context

## Source provenance

```text
Origin: owner-supplied Slack-derived operational research
Compiled: 2026-09-04
Pilot-sensitive: yes (September 2026 described as a pilot month)
Canonical internal rulebook consulted: no
Pondr internals available: no
Notion internals available: no
Relevant GitHub implementation/specs available: no
Canonical-policy authority: no
```

Evidence classes used below:

```text
EXPLICIT = explicitly stated in Slack
OBSERVED = derived from Leslie's observed system behavior
INFERRED = consistent observed behavior, not directly stated
OPEN    = unresolved / requires another source
```

Nothing in this document is canonical Alphaus policy. Where Nightwatch
implements a rule from this context, the rule cites its evidence class and
fails closed outside it.

## Bug-management model (three overlapping layers)

### Layer 1 — SDLC Bug Management Framework (EXPLICIT)

Severities `S1 Blocker / S2 Critical / S3 Major / S4 Minor` with Pondr-backed
fix prioritization. Observed SLA values (EXPLICIT):

```text
S1 Blocker  -> 4 hours
S2 Critical -> 24 hours
S3 Major    -> 1 week
S4 Minor    -> next monthly release
```

Tied to spec-driven development, Pondr, Next validation, `oops`, and the
production release workflow.

### Layer 2 — Leslie Bug Bounty (EXPLICIT pilot, OBSERVED mechanics)

September 2026 is a pilot month. Leslie handles bug reports, PR review
contributions, test contributions, bug-class removals, feature releases,
adopted review-comment credit, human/admin sign-off, points, badges, streaks,
rewards, and leaderboards. The bounty layer does not replace bug intake:
potential/unfiled bug cards still require a human action such as
`@Leslie file this` (EXPLICIT). Nightwatch preserves that human boundary.

### Layer 3 — Legacy/parallel intake (OBSERVED)

Other intake paths still exist, including a LOW/MEDIUM/HIGH scale. There is
no Slack-supported canonical mapping from LOW/MEDIUM/HIGH to S1–S4 (OPEN).
Nightwatch never invents one.

## S1–S4 working definitions (EXPLICIT examples, INFERRED boundaries)

- **S1 Blocker**: completely prevents use/testing (e.g. crash on launch,
  login impossible on any device).
- **S2 Critical**: severely affects significant functionality; can involve
  data loss, security breach, broken invoicing, data correctness.
- **S3 Major**: disrupts important functionality while the broader system
  remains usable (e.g. intermittent invoicing/finalization failure,
  long-running operations timing out).
- **S4 Minor**: no interference with core functionality (e.g. alignment,
  tooltip, translation, minor UX).

Nightwatch produces a severity *recommendation* only. Final severity is an
organizational decision Nightwatch never claims.

## Leslie filing fields (OBSERVED)

Core fields: `severity` (blocker/critical/major/minor), `catch_stage`
(pr_review/next/production/production_outage), `source`
(self_found/customer_escaped), `team`. Investigation-quality fields
(reproduction steps, expected/actual result, logs/evidence) contribute to
bounty scoring (OBSERVED) — Nightwatch does not score, but the same fields
are exactly what a high-quality engineering finding needs, so the handoff
projects them.

## Workflow rules encoded in the handoff (with evidence class)

- **Customer-escaped** (OBSERVED): a customer-escaped bug may be genuine but
  earns zero bounty points. Nightwatch never relabels `customer_escaped` as
  `self_found`; it performs no bounty arithmetic at all.
- **Human sign-off** (OBSERVED): reports stay pending until human/admin
  sign-off with verdicts genuine/invalid/duplicate. Nightwatch issues none of
  these; its local review states are deliberately named to avoid implying
  organizational authority.
- **Duplicates** (OBSERVED): duplicate decisions resolve to the original
  report via human/system action. Nightwatch suggests duplicate *candidates*
  with similarity evidence, never final verdicts.
- **Code owner** (OPEN): attribution is optional in Leslie. Nightwatch never
  infers or accuses a code owner from repository ownership.
- **Team attribution** (EXPLICIT sensitivity): affects organizational
  accounting. Nightwatch never guesses it; v1 always reports UNKNOWN.
- **OOPS** (INFERRED): proactively OOPS-caught bugs may affect
  reward/streak interpretation differently from production escapes.
  Nightwatch captures factual provenance where known and calculates nothing.

## Deliberately NOT encoded (OPEN or pilot-unstable)

```text
severity -> base-point table
prevention bonus exact calculation
+4 versus catch-stage-derived +2/+5 behavior
accountability arithmetic
unexplained leaderboard balances (e.g. 40-point)
adopted-comment team attribution behavior
reward-catalog behavior
LOW/MEDIUM/HIGH <-> S1-S4 mapping
```

No Nightwatch contract carries `expectedPoints`, `bountyPoints`,
`recommendedPoints`, `estimatedReward`, or `rewardTier`. A hardening rule
fails the build if a bounty-scoring surface enters the handoff cone.

## Architectural consequences (binding)

```text
Nightwatch is not a bounty calculator.
Nightwatch is not a Leslie client.
Nightwatch does not autonomously file bugs.
Nightwatch produces privacy-safe, evidence-backed,
human-review-ready finding artifacts.
```

The handoff artifact (`nightwatch.alphaus-finding-handoff.v1`) separates
mechanically established facts, evidence-backed recommendations (or UNKNOWN),
and literal non-weakable authority metadata (`humanReviewRequired = true`,
`executable = false`, `externalPublication = PROHIBITED`, no auto-filing).

## FC-1 additions — review lifecycle and finding intelligence

Evidence class of everything in this section: **NIGHTWATCH ARCHITECTURE**.
None of it is organizational fact, none of it is Slack-derived pilot
evidence, and none of it changes any unresolved organizational rule
recorded above.

### Local review lifecycle (NIGHTWATCH ARCHITECTURE)

`src/core/findingReview/` adds a post-dossier lifecycle: `REVIEW_PENDING`
plus the terminal states reached by `ACCEPT_EVIDENCE`, `REQUEST_FOLLOWUP`,
`MARK_INSUFFICIENT`, `MARK_DUPLICATE_CANDIDATE`, and `SUPERSEDE`.

A review receipt binds to the exact reviewed artifact: finding digest,
dossier digest, handoff digest (or explicit null), source SHA, campaign ID,
handoff version, and privacy-projection version. Any drift — a mutated or
regenerated dossier, a rebased source, a re-versioned projection — fails
closed as `FINDING_REVIEW_STALE`. Stale review decisions never carry over
silently.

**UNRESOLVED ORGANIZATIONAL RULE — unchanged.** A Nightwatch local review
state is not an Alphaus verdict. Every receipt carries
`organizationalAuthority: 'NONE_LOCAL_REVIEW_ONLY'` and an explicit
`notEquivalentTo: ['LESLIE_GENUINE', 'LESLIE_INVALID', 'PONDR_APPROVED']`.
`ACCEPT_EVIDENCE` means "a local reviewer found the evidence sufficient to
hand to a human", never "Leslie genuine" and never "Pondr approved". Final
genuine/invalid and duplicate authority remains external and human.

### Finding intelligence (NIGHTWATCH RECOMMENDATION — advisory only)

`src/core/findingIntel/` classifies relationships from mechanical fields
only — executable fingerprint, expectation identity, semantic contract,
sanitized failure signature, route, source lineage, replay outcome. Prose
similarity is never an input. Missing comparison inputs yield `UNKNOWN`
with no advisory pointer, never a guessed verdict.

Every result carries `advisoryOnly: true` and
`finalVerdictAuthority: 'HUMAN_ORGANIZATIONAL'`, and exposes its
counterevidence alongside its evidence. A `PROBABLE_DUPLICATE` suggestion
is a lead for a human, never an organizational duplicate verdict.

Recurrence binds chronology mechanically. `REGRESSION_CANDIDATE` requires
both a proven prior fix and a moved source lineage; neither precondition
is inferable from the other, and prose resemblance qualifies for nothing.

Defect classes group by shared semantic invariant with explicit
counterexamples and confidence capped by the weakest supporting evidence.
Nightwatch may report that five findings violate one invariant. It must
never conclude anything about bug-class bounty — no such surface exists,
and a hardening rule rejects one entering these cones.

### Expectation provenance and confidence (NIGHTWATCH ARCHITECTURE)

Every finding answers "why is this considered incorrect?" mechanically.
Provenance is ranked, with machine contracts strongest; weak provenance
(`SYNTHETIC_ORACLE`, `HEURISTIC`, `UNKNOWN`) caps the confidence a finding
may claim, so weak expectation evidence can never masquerade as a confirmed
defect. `PROVEN` requires a mechanical proof artifact and is refused
otherwise. Confidence is categorical throughout; no invented probabilities.

### Human filing report (NIGHTWATCH ARCHITECTURE — PRIVATE/LOCAL)

`renderHumanFilingReport` produces a copyable Markdown report for **manual**
human filing. It labels every section textually — FACT, RECOMMENDATION,
MECHANICAL DERIVATION, ADVISORY, UNKNOWN, HUMAN DECISION REQUIRED — never
by colour alone, so a severity recommendation can never read as fact.

Classification safety is preserved end to end: ambiguous impact renders
`UNKNOWN`; `production` never implies `production_outage`;
`customer_escaped` is never rewritten to `self_found`; a team without
evidence renders `UNKNOWN` and a named team without evidence is refused
outright. Every scalar and list field is sentinel-scanned before it reaches
the document.

This report is private and local. Nothing in this campaign submits, files,
or publishes anything.

## Local review persistence is not an Alphaus verdict

Nightwatch now keeps local review decisions durably, in an owner-only store
outside the repository. This changes nothing about who decides.

A persisted receipt carries `organizationalAuthority: NONE_LOCAL_REVIEW_ONLY`
and the literal list of what it is not equivalent to: `LESLIE_GENUINE`,
`LESLIE_INVALID`, `PONDR_APPROVED`. A stored receipt claiming anything else
fails closed on read.

So when a human filing report or a reviewer screen shows
`ACCEPT_EVIDENCE`, it means: a Nightwatch operator, working locally and
privately, judged the evidence sufficient to be worth a human's time. It does
not mean the finding is genuine, it does not mean it was approved, and it does
not mean a bounty was accepted. Those verdicts belong to people and systems
Nightwatch does not talk to.

Persistence is also not the beginning of automated filing. There is no path
from the review store to Slack, Leslie, Pondr or Notion, and hardening
enforces that structurally rather than by convention: the cone holds no
network authority, its import graph is confined, and the underlying private
artifact store answers `publish()` by throwing.

## RO-1 — the filing report now states whether its review is in force

The handoff artifact a person copies into Leslie or Pondr previously had two
review states: a decision, or nothing. That was enough while nothing generated
it in production; it stopped being enough the moment a real store could hold a
review that no longer binds.

Four states now render four textually disjoint ways:

- **NO_REVIEW** — `Local review (HUMAN DECISION REQUIRED)`. Nothing is stored.
- **CURRENT** — `Local review (FACT: current local decision, not
  organizational sign-off)`, with the decision, its resulting state, the time
  and a bounded rationale, plus the statement that it binds to the artifacts
  the report describes.
- **STALE** — `Local review (HISTORICAL — DOES NOT BIND TO THIS GENERATION)`.
  The historical decision is shown, labelled `Historical decision (NOT
  current)`, followed by "Human review required for this generation". Hiding
  it would destroy evidence; printing it unlabelled is the failure this state
  exists to prevent.
- **CORRUPT** — `Local review (UNAVAILABLE — FAIL CLOSED)`. A stored review
  did not survive validation, so no decision is named. The nearest readable
  generation is never substituted.

Wherever a decision is shown, the non-equivalence block is four lines, not
one, because the four things a reader might mistake it for are four different
things: a Leslie genuine verdict, a Leslie invalid verdict, a Pondr approval,
and organizational sign-off of any kind. A single "local only" line reads as a
disclaimer; naming each reads as a boundary.

**What the report cannot tell you, and says so.** `buildFilingReport` composes
the owner-local findings projection, which deliberately withholds evidence
bodies, source paths and observed values. So reproduction steps and evidence
excerpts are not available to it, and the report states that rather than
describing behaviour it did not observe. For a document a human is believed
about, a report that reads as though it reproduced something is the failure
that matters.

**Still manual, still private.** The artifact carries
`distribution: PRIVATE_LOCAL_MANUAL_COPY_ONLY`. No Slack, Leslie, Pondr,
Notion, email or issue-filing client exists anywhere in the report cone, and
hardening refuses an external submission import, an external URL, or a
publication method there.
