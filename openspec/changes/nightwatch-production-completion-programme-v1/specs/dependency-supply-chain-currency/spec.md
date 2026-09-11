# Spec — Dependency and supply-chain currency

Closes F-11. Measured at `36bd493`: four devDependencies, all dev-only —
`@playwright/test` 1.62.1 (pinned exactly), `@types/node` ^22.10.0,
`typescript` ^5.7.0, and `vue` 2.6.12, which `npm ci` reports as END OF LIFE.
`docs/HOST-CAPABILITY-MATRIX.md` §4 records the Vue retention decision, its
four review conditions, a review date of 2026-09-09, and states plainly that
`npm audit` and any registry-backed advisory query are `UNAVAILABLE`, not
clean: "An absent scan is never a passing scan."

## ADDED Requirements

### Requirement: One bounded advisory assessment SHALL be executed under authorized egress, or its refusal SHALL be recorded with the same discipline

This is the only lane whose blocker is a single narrow permission. The
assessment SHALL be a read-only advisory query over the four declared
dependencies and their lockfile-resolved transitive closure, executed under
explicitly authorized outbound access, recorded with its query date, the
registry queried, the exact dependency versions queried, and the result per
advisory.

The egress SHALL be bounded to the registry host for the duration of the query
and SHALL NOT relax the standing outbound policy for any other surface. The
existing fail-closed host classification applies; no Alphaus or product host is
reachable during the assessment.

A found advisory SHALL be assessed for reachability against this repository,
not merely reported by severity, because the Vue argument already establishes
that reachability is the operative question here. Each advisory SHALL be
recorded as reachable with its path, or unreachable with the reason.

If authorization is not granted, the lane SHALL remain
`UNAVAILABLE_CAPABILITY` with its acquisition condition and revisit date under
`validation-lane-closure`, and SHALL NOT be described as clean anywhere.

#### Scenario: the assessment is bounded and dated
- **WHEN** the advisory assessment executes
- **THEN** it records the date, registry, exact versions queried and per-advisory
  result
- **AND** no host other than the registry is contacted

#### Scenario: an advisory is assessed for reachability
- **WHEN** an advisory is found
- **THEN** it is recorded reachable with its call path, or unreachable with the
  reason
- **AND** a severity alone is not an acceptable disposition

#### Scenario: an unexecuted scan is never clean
- **WHEN** authorization is not granted
- **THEN** the lane stays `UNAVAILABLE_CAPABILITY`
- **AND** no document states or implies a clean dependency result

### Requirement: The EOL Vue fixture SHALL carry a scheduled re-review bound to its stated conditions

The retention argument is sound and rests entirely on reachability, because no
upstream patch will ever arrive. Four review conditions are recorded, any one
of which reopens the decision: the Ripple product moves off Vue 2; the fixture
begins compiling a template from non-fixture input; an advisory is published
whose reachable path does not depend on template compilation; or the fixture's
single call site grows a second consumer.

Three of the four are mechanically checkable in this repository and SHALL be
checked rather than trusted to a reader.

- The fixture's call sites SHALL be counted; more than one fails.
- The fixture SHALL be asserted to pass only literal content to the renderer;
  a template compiled from a variable fails.
- The `require.resolve` reachability that `checkDeclaredDependencyResolvability`
  already enforces SHALL remain enforced, so the DEF-FC-03 removal cannot
  recur.

The fourth condition depends on the advisory lane above. The review date SHALL
be carried as data with a revisit interval, and an elapsed review date SHALL be
reported by `agent:check` as it is for the CI block record.

#### Scenario: a second consumer reopens the decision
- **WHEN** the Vue fixture gains a second call site
- **THEN** `hardening:check` fails naming both sites and the review condition

#### Scenario: a compiled template reopens the decision
- **WHEN** the fixture passes a non-literal value to a template
- **THEN** the check fails naming the review condition

#### Scenario: an elapsed review is surfaced
- **WHEN** the recorded review date plus the interval has passed
- **THEN** `agent:check` reports the review as due

### Requirement: The supported runtime matrix SHALL be evidence-bound

`engines.node` declares `>= 20` and the matrix records qualification on 20.x
and 22.22.1, Linux x86_64 under a WSL2 kernel. The declaration is a range; the
evidence is two points. A host on Node 21, or on macOS, inherits a claim
nothing proved.

The matrix SHALL distinguish the declared range from the qualified points, and
a lane executed on an unqualified runtime or OS SHALL report the runtime as
unqualified rather than passing under the declaration. This is the same rule
the document already applies to host capabilities, applied to the runtime
itself.

The lockfile SHALL remain the reproducibility authority: a resolution that does
not match `package-lock.json` is a failure, not a warning, and the disposable
`npm ci --offline` verification SHALL be re-run and re-dated at each release
checkpoint rather than carried forward from 2026-09-09.

#### Scenario: an unqualified runtime is reported, not inherited
- **WHEN** a lane executes on a Node major version outside the qualified points
- **THEN** the receipt records the runtime as unqualified
- **AND** the lane does not inherit the declared-range pass

#### Scenario: lockfile drift fails
- **WHEN** `npm ci` resolves anything not matching the lockfile
- **THEN** the run fails as a reproducibility failure

#### Scenario: the offline verification is re-dated
- **WHEN** a release checkpoint is certified
- **THEN** the `npm ci --offline` verification is re-run and its date recorded
- **AND** a stale date fails the certification
