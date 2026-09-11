# Spec — Validation lane closure

Closes F-02 and the D-110 structural gap. Measured at `36bd493`:
`validation:universe` PASS, `discovered=432 authoritativeGate=255
classified=177 unclassified=0`, `MANUAL_OWNER=12`, `LIVE_APP_SMOKE=6`. Four
declared lanes have never executed: exact-head CI (`BLOCKED_EXTERNAL`), the
online dependency advisory, the 12 owner-manual harnesses and the 6 live-app
smokes (all `UNAVAILABLE_CAPABILITY`).

## ADDED Requirements

### Requirement: A never-executed lane SHALL be distinguishable from a lane whose absence is proven

The three-valued vocabulary `PROVEN` / `BLOCKED_EXTERNAL` /
`UNAVAILABLE_CAPABILITY` is correct and SHALL be preserved. It is currently
recorded only in prose in `docs/CURRENT_STATE.md` and
`docs/HOST-CAPABILITY-MATRIX.md`, where it cannot be checked and goes stale
silently.

The system SHALL carry lane state as data: a versioned
`nightwatch.validation-lane-state.v1` record, one entry per declared lane,
each carrying the lane id, its class, the evidence that established the class
(receipt digest, run identity, or the observed host capability), the SHA at
which it was established, the acquisition or unblock condition when the class
is not `PROVEN`, and a revisit date. `bin/validation-universe.mjs` SHALL emit
it and `hardening:check` SHALL require that every class declared in
`config/validation-universe.v1.json` has exactly one lane-state entry.

A lane whose evidence SHA is older than `LAST_SUBSTANTIVE_IMPLEMENTATION_SHA`
SHALL be reported `STALE_EVIDENCE` and SHALL NOT be read as `PROVEN`. Staleness
is a fourth reported state, never a fourth stored class — the class stays what
was proven, and the staleness is computed.

An unclassifiable lane SHALL fail closed. Absent, skipped and unavailable SHALL
remain distinct from PASS in every emitted record, consistent with the existing
rule in `docs/HOST-CAPABILITY-MATRIX.md`.

#### Scenario: every declared class has exactly one lane-state entry
- **WHEN** `hardening:check` runs
- **THEN** each class in `config/validation-universe.v1.json` resolves to one
  lane-state entry
- **AND** a missing or duplicate entry fails the check

#### Scenario: a lane proven at an older SHA reports as stale
- **WHEN** a lane's evidence SHA precedes the last substantive implementation
- **THEN** the report shows `PROVEN (STALE_EVIDENCE)` with both SHAs
- **AND** a consumer that requires current proof treats it as unproven

#### Scenario: a non-PROVEN lane names its unblock condition
- **WHEN** a lane is `BLOCKED_EXTERNAL` or `UNAVAILABLE_CAPABILITY`
- **THEN** its entry carries a non-empty acquisition or unblock condition and a
  revisit date
- **AND** an empty condition fails `hardening:check`

### Requirement: A CI-topology clean gate SHALL exist

D-110 records that `gate:clean` clones into a temp directory but runs on the
SAME host, so it certifies checkout cleanliness rather than runner topology,
and could not have caught either of the two defects that reached a checkpoint:
an absolute sibling source root that cannot exist on a runner, and a Bubblewrap
binary the `ubuntu-24.04` image does not ship. That campaign recorded a
CI-topology clean gate as deferred follow-up work. It SHALL be built.

The gate SHALL execute the authoritative gate against a checkout in which the
runner-absent conditions are simulated categorically, not by string matching:
the sibling `REPOSITORIES` root is made genuinely absent (not merely renamed
inside the same tree), `bwrap` is made genuinely unreachable, system Chrome is
made genuinely unreachable, and `$HOME` is a fresh directory. Each condition
SHALL be independently togglable, so a failure names which absence caused it.

Under each absence the gate SHALL prove the fail-closed path: the dependent
lane reports its capability as unsupported with a blocker code and the run does
not pass by inheritance. A lane that passes while its capability is absent is a
defect and SHALL fail the topology gate.

`DEFAULT_SIBLING_ROOT` is a hardcoded absolute path by design, so the
sibling-absent condition SHALL be created by making that path unreadable to the
process rather than by editing the constant — editing the constant would prove
a different program.

The gate SHALL be a declared class in `config/validation-universe.v1.json`,
registered in the gate manifest, and reachable as `npm run gate:topology`.
Registration is required because an unregistered suite does not run: this is
the totality rule R-12 established.

#### Scenario: the sibling-absent topology is proven fail-closed
- **WHEN** `gate:topology` runs with the sibling root unreadable
- **THEN** every source-intelligence lane reports the universe UNAVAILABLE
- **AND** no lane reports an empty universe as a clean one

#### Scenario: the Bubblewrap-absent topology is proven fail-closed
- **WHEN** `bwrap` is unreachable
- **THEN** the L6 capability reports UNSUPPORTED with a blocker code and
  `deepContainmentLane` is recorded non-PROVEN
- **AND** authenticated OOPS refuses rather than running uncontained

#### Scenario: a lane that passes under absence fails the gate
- **WHEN** a lane reports PASS while the capability it declares is absent
- **THEN** `gate:topology` fails naming that lane
- **AND** the failure names which absence was active

#### Scenario: the gate is registered, not merely written
- **WHEN** `validation:universe` runs
- **THEN** the topology gate's suites are classified
- **AND** `hardening:check` fails if any of them is unclassified

### Requirement: The 18 authorization-gated checks SHALL have an executable route

`MANUAL_OWNER=12` and `LIVE_APP_SMOKE=6` are declared, classified, counted and
have never run. Their blocker is DEV authentication plus a separate
authorization, not a host capability, so they are correctly
`UNAVAILABLE_CAPABILITY` today and incorrectly indistinguishable from work that
can never be done.

Each of the 18 SHALL carry, as data: the exact authorization class it requires,
the exact credential or capability it needs, the command that would run it, the
evidence it would produce, and the safety boundary it operates under. A single
`npm run lanes:manual -- --plan` SHALL print that inventory without executing
anything and without reading any credential.

Execution SHALL remain gated. The runner SHALL refuse to start unless a
matching one-shot owner authorization is present, and SHALL fail closed with
the existing `OWNER_POLICY_BLOCKED` semantics otherwise. Credentials SHALL be
read only by the existing owner-only auth path; no new credential surface is
created, nothing is written to `artifacts/` or `.agent/` unredacted, and the
existing redaction layer applies to every produced record.

After an authorized execution each of the 18 SHALL resolve to `PROVEN` or to a
recorded failure with its evidence. A skipped check SHALL be recorded as
skipped and SHALL NOT count toward any pass total, consistent with the existing
`partialHostDependency` treatment in `config/campaign-certification.v1.json`.

#### Scenario: the plan is printable without credentials
- **WHEN** `npm run lanes:manual -- --plan` runs with no auth state present
- **THEN** all 18 checks are listed with their authorization class, command and
  expected evidence
- **AND** no credential file is opened

#### Scenario: execution without authorization fails closed
- **WHEN** the runner is invoked without a matching one-shot authorization
- **THEN** it exits non-zero with `OWNER_POLICY_BLOCKED`
- **AND** no browser context, subprocess or network connection is created

#### Scenario: an executed check yields a receipt, a skip yields a skip
- **WHEN** an authorized run completes
- **THEN** each executed check records a receipt and a lane class
- **AND** each skipped check is recorded as skipped and excluded from pass
  totals
