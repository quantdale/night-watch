# Design — W11 autonomous yield proof

## Ordering

The historical arm runs FIRST. It tests investigation quality against known
truth before unknown-source yield can bias how that quality is interpreted. The
unknown arm is defined only after the historical arm is complete.

## Provider selection without contamination

A preference list is written down BEFORE any probe runs, and the FIRST entry
that passes one minimal structured probe through the production print adapter
becomes the primary provider. Later entries are never probed, so no provider
comparison exists that could be resolved in favour of whichever scored best.

The list, in order: `opencode-go/omen-alpha` (the W9/W10 reference),
`opencode-go/glm-5.3`, `opencode-go/kimi-k3`, `opencode-go/qwen3.8-max`,
`opencode-go/minimax-m3` — ordered by lineage kinship then declared capability
tier within the single subscribed provider family, so no authority changes.

## Leak isolation

The historical arm drives `createHistoricalLocalInvestigationContext`, whose
visible context is built by `buildReasonerVisibleContext` and deliberately
excludes the hidden truth: fix commit, fix diff, issue title, bug description,
known failing test, explanation and scoring labels. The scorer reads hidden
truth only AFTER the investigation has terminated.

Leakage is proven live with canaries rather than assumed: a canary token is
planted in hidden truth and the checker must find it when it is deliberately
leaked, so a checker that silently matches nothing cannot pass.

## Strict EXACT is not weakened

`scoreBenchmarkCandidate` is unchanged. EXACT requires all three of: the
candidate text contains the hidden `knownFailingTest`; file recall >= 0.5; and
keyword recall >= 0.5. A near match records its distance and never promotes to
EXACT. The thresholds are not tuned after seeing results.

## ENVIRONMENT_BLOCKED

A case whose required contained reproduction cannot execute because the local
environment lacks the already-admitted substrate is `ENVIRONMENT_BLOCKED`. It is
excluded from BOTH the numerator and the denominator of any yield rate, and its
count is reported separately rather than erased.

## Freeze and fail-closed resume

Each arm's definition is committed at a SHA before it executes, and the campaign
fingerprint binds provider, corpus membership, repository set, budgets, scoring
and stopping condition. A resume that widens any of them fails closed. An
execution bug does not license a quiet rerun: the failed run is recorded, the
bug is fixed, a new fingerprint is created, and the whole affected arm reruns.

## Admission is unchanged

A model proposal, a hypothesis and a plausible-looking source defect are not
findings. Admission continues through the existing mechanical path; a candidate
without reproduction is refused `MISSING_REPRODUCTION`. No `reproductionCount`
requirement is reduced, no evidence ref is synthesized, and no dossier is
inserted by hand.

## Previously-unknown status is evidence-bounded

A mechanical admission proves Nightwatch admitted a finding. It does not prove
the defect was previously unknown. Each admitted current-source finding is
classified `NEW_TO_NIGHTWATCH`, `ALREADY_IN_HISTORICAL_CORPUS` or
`CANNOT_DETERMINE` using only authorized local evidence.
`PREVIOUSLY_UNKNOWN_ALPHAUS_BUG` is a strictly stronger claim and is not made
without evidence that actually supports it.
