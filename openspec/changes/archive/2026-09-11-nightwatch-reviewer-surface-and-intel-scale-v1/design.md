# Design — reviewer surface & finding-intelligence scale

Continuity. The routing/safety block becomes structured and checked, not
free prose trusted by convention. `agent:check` binds the block's declared
campaign identity and session worktree to the active task's own identity,
so a predecessor block cannot survive a campaign transition. The rule is
a totality rule in the R-12 sense: every non-NONE active task is checked,
not only the ones that happen to declare a block.

Reviewer surface. The Control Center stays read-only by construction. The
intelligence is projected through a new adapter over the existing
`findingsAuthority`, never by widening a cone's authority: `findingIntel`
and `findingReview` remain pure and keep their hardening isolation. The
projection is the privacy boundary — raw customer values never cross it,
exactly as at FC-1, and the sentinel screen is exercised against the new
surface rather than assumed to cover it.

Epistemic labelling is a data property, not a CSS class. Every projected
element carries an explicit `epistemicClass` of `FACT`,
`RECOMMENDATION` or `UNKNOWN`, produced at the adapter from the same
mechanical provenance the cone already computes. The UI renders what the
data says; a rendering change alone can never promote a recommendation to
a fact, and a test asserts that inversion fails closed.

Scale. Measurement precedes any optimization. A repository-owned harness
generates deterministic synthetic corpora at 1k/5k/10k, runs the real
`findingIntel` entry points in a fresh process, and records CPU time,
peak RSS and wall latency per stage. Pairwise relationship analysis is
the expected quadratic; the harness locates the actual threshold rather
than assuming it. An index lands only against a recorded measurement, and
the same harness re-runs afterwards so the claimed improvement is a
measured delta, not an argument.

Endurance. The large-corpus Control Center lane exercises the reviewer
surface against the largest measured corpus and repeats it to a
statistically useful bound. A stall is captured and classified, never
retried away.
