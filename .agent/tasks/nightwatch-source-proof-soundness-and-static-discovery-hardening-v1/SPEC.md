# Source-Proof Soundness + Static Discovery Hardening

## Task purpose

Prove that Nightwatch's source-derived facts are lexically real, reachable,
and mechanically complete before they can influence downstream campaign
projections. Reproduce the planner's PHP reachability, comment/string false
positive, and PHP declaration multiplicity probes; repair only the owning
proof families when a probe is sound; preserve fail-closed behavior,
determinism, privacy, and all existing proof identities.

## Established starting state

- Task ID: `nightwatch-source-proof-soundness-and-static-discovery-hardening-v1`
- Starting SHA: `54090566dad7ba3f65c9ffb2a398e4fcf1fad52b`
- The predecessor source-analysis runtime-hardening task is COMPLETE and
  remains immutable history.
- The fresh OpenSpec change is
  `openspec/changes/nightwatch-source-proof-soundness-and-static-discovery-hardening-v1/`.
- The owner scope is LOCAL / approved read-only source / synthetic only;
  infrastructure, datastore, product environments, authentication,
  publication, AI, self-development, and sibling writes are prohibited.
- Current live Git and remote authority is discovered from Git, not persisted
  in task documents.

## Required deliverables

- An exhaustive NUL-safe audit of every tracked path, with reviewed and
  classified counts reconciled in the final report.
- Reproducible public-discovery probes for PHP reachability, lexical route and
  declaration identity, with each result classified as a correctness delta,
  expected version invalidation, or unexplained drift.
- Bounded, non-executing fixes for soundness failures, if reproduced, with
  focused adversarial and downstream parity coverage.
- A fresh source/eligibility census and a strict decision on whether zero or
  at most one new exact family is safely admitted.
- All campaign acceptance checks, continuity/project truth checks, clean-tree
  and Git checkpoint evidence, and an exact-head GitHub Actions observation.

## Explicit non-goals

- No production, DEV, Next, authenticated, cloud, infrastructure, datastore,
  deployment, or external-service execution.
- No changes to Alphaus sibling repositories, no source execution, no runtime
  AI/self-development authority, and no publication of findings.
- No broad parser rewrite, global cancellation of valid observations, silent
  expectation rebinding, arbitrary analyzer version changes, or speculative
  canonical promotion.

## Safety constraints

- Read sibling source only through the existing path-confined read-only seam;
  synthetic fixtures use fake values and never contain secrets or customer
  data.
- Static scanners remain bounded and lexical; they must not execute source or
  infer proof from comments, strings, dynamic constructs, unsupported control
  flow, or ambiguous declarations.
- Raw source and customer values must not cross projection boundaries or enter
  findings, fingerprints, dossiers, error messages, task artifacts, or Git.
- Unknown operations fail closed before executor callbacks, and the permanent
  infrastructure/data-layer owner freeze remains in force.

## Acceptance criteria

- The three mandatory soundness claims are reproduced or falsified through
  public discovery, with controls and exact evidence recorded.
- Incomplete PHP return paths cannot be admitted as complete; supported
  complete paths retain their prior observations and identities.
- Comments and strings cannot create TypeScript/JavaScript/Go routes or PHP
  declarations; real route order/identity and duplicate-declaration rejection
  remain correct.
- Downstream response-flow, semantic, currentness, admission, parity, and
  eligibility behavior is unchanged except for justified local rejection of
  unsound input, with any version delta explicitly justified.
- Every required local validation passes, the final tracked tree is clean,
  the pushed local and remote heads are equal, and the exact live head's
  GitHub Actions result is recorded (zero-step billing/platform failure is
  classified as external non-evidence, never as green).
