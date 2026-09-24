# Run-evidence transaction successor v1

## Task purpose

Close the highest-impact reproducible portion of run-evidence transaction
integrity: same-run recorder reuse, split event/view/memory writes, and false
terminal summaries after durable-state divergence or torn JSONL. This is a new
successor child, not a reopening of the planning-only bundle-transaction
proposal.

## Established starting state

- Task ID: `nightwatch-run-evidence-transaction-successor-v1`
- Parent: `nightwatch-successor-campaign-engine-v1`
- Starting SHA: `a215f8e971b82796b9d278dd362f8b200d5ec9e3`
- Session branch: `session/nightwatch-successor-campaign-en-628d8bb9`
- Prior shard child: BLOCKED and preserved; its broad source-drift failures are
  independent.
- Reproduction: two same-run `RunRecorder` instances share one directory,
  duplicate sequence `0`, lose a manifest update, and finalize a summary whose
  event count disagrees with durable JSONL; a synthetic torn append still
  permits a passing summary.
- Current source: `src/core/evidence/runRecorder.ts` and focused evidence tests.

## Required deliverables

- Exclusive run-directory/generation admission that refuses same-run reuse.
- Durable append acknowledgement and durable-event validation before terminal
  summary publication.
- A latched non-clean failure state so mirror/append/divergence errors cannot
  later publish PASS.
- Focused same-run, split-write, torn-tail, and normal-path regressions.
- Honest task/OpenSpec state; no claim of full journal recovery if deferred.

## Explicit non-goals

No full historical journal migration, automatic repair of arbitrary killed
writes, browser/product/network changes, real credentials, external targets,
or changes to the completed priority campaign.

## Safety constraints

Synthetic run directories only; no authenticated run; no customer values or
sibling writes. Preserve atomic JSON publication and owner-only filesystem
behavior.

## Declared Deletions

None.

## Acceptance criteria

- A second recorder for an existing run identity is refused before bytes mix.
- Normal single-recorder event/view writes remain byte/replay compatible.
- Any append/mirror/durable mismatch latches failure and prevents a passing
  terminal summary.
- Torn or duplicate durable event state is classified as non-clean.
- Focused tests, typecheck, hardening, and milestone validation are recorded.
- Any unrepaired crash-recovery scope is explicitly listed as a residual, not
  claimed complete.
