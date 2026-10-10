## Context

`nightwatch.release-certification.v1` intends every advance condition to bind the commit where its evidence was earned. `evaluateReleaseCertification` currently overrides a condition only when the resolved evidence SHA is a strict ancestor of the certified checkpoint. All other cases—including `null`, `HEAD` at a later documentation descendant, a nonexistent object, a future descendant, or a divergent commit—retain the check output's `MET` state.

The project adapter further collapses `git merge-base --is-ancestor` exit 1, an unknown object, timeout, and execution failure into the same false answer. The current pure tests set `isAncestor: () => false` for the ordinary all-met case and test only the ancestor path. Consequently the release verdict demonstrates one negative relation, not exact checkpoint binding.

## Goals / Non-Goals

**Goals:**

- Make exact equality with the certified checkpoint mandatory for every `MET` condition.
- Classify every other evidence identity/lineage state without conflating Git uncertainty with a proven negative relation.
- Resolve `HEAD`, the certified checkpoint, and Git object identities once from one read-only checkout snapshot.
- Couple release advancement and certification success to exact evidence for every condition.
- Prove the complete relation matrix in pure evaluation and real synthetic Git repositories.

**Non-Goals:**

- Making an unmet check pass, choosing the pending next project status, or advancing project truth.
- Replacing exact-head CI, validation-lane evidence, toolchain identity, or the checks that produce condition outputs.
- Treating documentation descendants as substantive implementation commits.
- Adding network, product, Alphaus, database, cloud, or external publication authority.

## Decisions

### Require exact checkpoint equality for a met condition

Preserve `evidenceSha: null` for conditions whose evidence has not yet been earned, but make it non-certifying. Resolve a literal `HEAD` to the checkout head captured for the evaluation. A check output can remain diagnostically `MET`, but its effective release-condition state is `EVIDENCE_ABSENT`, `EVIDENCE_STALE`, `EVIDENCE_FUTURE`, `EVIDENCE_DIVERGENT`, or `EVIDENCE_UNRESOLVED` unless the resolved evidence object equals the certified checkpoint object.

Only `EVIDENCE_EXACT` permits the effective state `MET`. This is stricter and simpler than treating all non-ancestor evidence as current: a descendant proves a later tree, a divergent commit proves another tree, and an unknown SHA proves nothing about this checkpoint.

Alternative considered: accept evidence from descendants because it is newer. That reverses certification direction—the later tree may contain the check or fix being claimed and cannot retroactively certify earlier bytes.

### Replace boolean ancestry with a categorical Git relation

The I/O adapter resolves both identifiers as commits with `git rev-parse --verify <sha>^{commit}`, compares exact object IDs, and only then runs ancestry in both directions. It returns one closed relation:

- `EXACT`
- `STALE_ANCESTOR`
- `FUTURE_DESCENDANT`
- `DIVERGENT`
- `OBJECT_MISSING`
- `GIT_INDETERMINATE`

Exit 0, exit 1, timeout/signal, output overflow, spawn error, and malformed output are distinct internally. Only two successful exit-1 ancestry queries establish `DIVERGENT`; operational failure never becomes a proven relation. The pure evaluator consumes the enum and has no Git authority.

Alternative considered: retain `boolean | null`. A single boolean cannot distinguish future/divergent/missing evidence, and the current caller already collapses failure into false.

### Capture one evaluation snapshot and bind the verdict

Before collecting condition outputs, `project:check` captures repository root identity, exact live HEAD, certified checkpoint commit, definition bytes/digest, and a clean read-only Git snapshot marker. Every `HEAD` token resolves to that captured live HEAD; it is not re-read per condition. The evaluator emits a canonical `evaluationDigest` over the definition digest, checkpoint, live head, ordered condition check outputs, resolved evidence objects/relations, lane counts, and external-track state.

The digest is audit identity, not a substitute for the underlying checks or CI receipt. If the checkout head changes during evaluation, an object disappears, or repeated identity reads disagree, the evaluation is indeterminate and cannot certify.

### Separate diagnostic check state from effective certification state

Each result records both `checkState` and `evidenceRelation`. This avoids hiding that a check passed while making clear why its release condition is not certifying. `conditionsMet`, `advanceRefused`, and `certificationRefused` use the effective state. A non-exact evidence relation refuses certification whether or not an advance status is currently claimed; project-check emits condition-specific stable codes only as required by the current project-status policy, while the verdict always carries the refusal truth.

### Test the complete matrix and mutate the real adapter

Pure table tests cover every check state crossed with null, exact literal SHA, exact `HEAD`, stale, future, divergent, missing, malformed, and Git-indeterminate evidence. Full-process fixtures create real commits/branches and unknown-object values, then run `project:check` with all check outputs synthetically met and an advance status claimed.

Mutation probes remove the null guard, accept `HEAD` without equality, invert ancestor direction, convert missing-object/timeout to divergence, skip the second ancestry query, or count raw `MET` rather than effective `MET`. Each must fail a named matrix case.

## Risks / Trade-offs

- **Existing null evidence becomes visibly non-certifying** -> preserve null as honest not-yet-earned state and require the owning check to record evidence at the checkpoint before any future advance.
- **Strict equality requires re-running conditions after every substantive checkpoint** -> this is the stated release contract; do not silently reuse evidence from different bytes.
- **Documentation-only descendants make `HEAD` non-exact** -> bind evidence to the substantive checkpoint SHA explicitly, or advance the appropriate checkpoint without relabeling documentation as implementation.
- **Extra Git queries add local cost** -> cache relation results per unique SHA pair and retain strict time/output bounds.
- **Git object pruning can make old evidence unresolved** -> report `EVIDENCE_UNRESOLVED` and re-establish evidence at a retained exact checkpoint; never infer lineage.

## Migration Plan

1. Add the relation enum, dual-state condition result, and failing pure matrix tests.
2. Implement the bounded read-only Git commit resolver and two-direction relation adapter with synthetic repository tests.
3. Refactor evaluation so only exact evidence plus a `MET` check counts as met; make every non-exact relation certification-refusing.
4. Capture one project-check snapshot and add the canonical evaluation digest and stable error rendering.
5. Replace current `HEAD`/null bindings only after their owning checks execute at the exact certified checkpoint; do not synthesize evidence.
6. Add full-process advance probes and non-vacuous mutations, then run project-state, release, continuity, hardening, local, clean, and exact-head CI validation.
7. Update release-condition documentation from the actual hardened verdict and integrate through C-00.

Rollback may leave release advancement disabled, but must not restore acceptance of absent, unresolved, future, or divergent evidence.

## Open Questions

- Whether the definition should continue accepting the textual `HEAD` convenience token at all. The implementation may retain it only with captured-snapshot resolution and exact checkpoint equality.
