# Spec — Authenticated capability lifecycle

Closes F-21. Measured at `36bd493`: `bin/auth-capture.mjs` is a human-led
interactive capture — headed Chrome, the human performs login and MFA,
Nightwatch never receives credentials, and the resulting Playwright
storage-state file is written to an owner-supplied absolute path outside the
repository. `src/browser/fixtures/storageState.ts` reasons carefully about
cookie expiry when reading a state file (`expired`, `hasFutureExpiry`, session
cookies unexpired for the session); `src/auth/directRunner.ts` and
`src/auth/devCredentialProvider.ts` contain zero occurrences of `expir`. No
capture time, validity window, pre-flight staleness check or expiry signal
exists for the artefact itself.

Every authenticated capability depends on it: the 12 `MANUAL_OWNER` checks,
Phase 9B/10B DEV semantic acceptance,
`journey:phase2c`, `explore:phase4`, `api:phase5`, `campaign:real`, and C-12
passive observation. The six fixture smokes formerly classified
`LIVE_APP_SMOKE` are reclassified `LOCAL_FIXTURE_SMOKE` by
`nightwatch-validation-classification-and-skip-truth-v1`: they build synthetic
loopback state, never read the owner capture artefact (G21.8), and are not
authenticated dependents.

## ADDED Requirements

### Requirement: A captured authentication artefact SHALL carry its own lifecycle metadata

The artefact is a bundle of cookies and storage entries with real expiry
semantics, and Nightwatch treats it as a path. A bounded, non-secret sidecar
record SHALL accompany each capture: capture instant, the environment it was
captured for, the origin it was captured against, the earliest cookie expiry
observed at capture time, a declared validity window, and a digest of the
artefact for identity.

The record SHALL contain **no** cookie value, token, header or storage value —
only the metadata above — and SHALL pass the existing redaction layer before
being written. It SHALL live beside the artefact, outside the repository, and
SHALL never be committed. The existing secret-file `.gitignore` patterns SHALL
be extended to cover it.

`auth:capture` SHALL write the record atomically with the capture, so an
artefact never exists without one. An artefact with no record SHALL be treated
as unknown-age, which is a refusal condition below, not a pass.

#### Scenario: capture writes lifecycle metadata containing no secret
- **WHEN** a capture completes
- **THEN** the sidecar record is written with capture instant, environment,
  origin, earliest expiry, validity window and artefact digest
- **AND** it contains no cookie value, token or storage value

#### Scenario: an artefact without a record is unknown-age
- **WHEN** a lane loads an artefact with no sidecar record
- **THEN** it is classified unknown-age

#### Scenario: the record never enters Git
- **WHEN** the record is written
- **THEN** it is outside the repository and matched by the ignore patterns

### Requirement: Every authenticated lane SHALL pre-flight the artefact and refuse an expired one before doing anything

Today a stale session produces whatever downstream failure it happens to
produce — a login redirect classified as an unexpected navigation, an empty
evidence set, a policy event — and the operator diagnoses a symptom. A campaign
that runs for an hour and fails at minute fifty-eight on an expired cookie has
wasted the hour.

Before creating a browser context, spawning a contained process or issuing any
request, an authenticated lane SHALL evaluate the artefact and resolve it to
exactly one state:

- `VALID` — within its window and no cookie required for the target origin is
  expired;
- `EXPIRED` — the window has elapsed, or a required cookie is expired;
- `WRONG_ENVIRONMENT` — captured for a different environment or origin;
- `UNKNOWN_AGE` — no lifecycle record;
- `MISSING` / `UNREADABLE` — absent or malformed.

Only `VALID` SHALL proceed. Every other state SHALL refuse with a distinct code
and a single named remedy — re-capture for this environment — before any
browser context, subprocess, socket or file is created. `UNKNOWN_AGE` SHALL
refuse rather than proceed optimistically: an artefact whose age cannot be
established is exactly the one most likely to be stale.

Expiry evaluation SHALL reuse the existing cookie applicability logic in
`storageState.ts` rather than a second implementation, since two evaluators for
one question can disagree.

#### Scenario: an expired artefact refuses before any effect
- **WHEN** an authenticated lane starts with an expired artefact
- **THEN** it exits with the expiry refusal code and the re-capture remedy
- **AND** no browser context, subprocess, socket or file is created

#### Scenario: unknown age refuses rather than proceeding
- **WHEN** an artefact has no lifecycle record
- **THEN** the lane refuses with `UNKNOWN_AGE`

#### Scenario: a wrong-environment artefact is refused, not attempted
- **WHEN** a `dev` artefact is supplied to a `next` lane
- **THEN** the lane refuses naming both environments

#### Scenario: one evaluator, not two
- **WHEN** expiry is evaluated
- **THEN** it uses the existing cookie applicability logic
- **AND** a structural rule fails on a second implementation

### Requirement: Authentication state SHALL be observable before an operator commits to a run

An operator deciding whether to start an overnight campaign cannot currently
answer "is my authentication going to last the night" without starting it.

`npm run status:local` and the `observe:preflight` / `c12:preflight` surfaces
SHALL report, per configured environment: whether an artefact is present, its
state from the vocabulary above, its remaining validity, and the lanes
currently blocked by it. The report SHALL read metadata only and SHALL NOT open
a browser, contact any host, or read a cookie value.

The Control Center SHALL surface the same state, because it is the operator's
primary window and currently shows authenticated capability as either working
or absent with no middle state. It SHALL be rendered as an epistemic class
consistent with the existing reviewer vocabulary: a `FACT` when the artefact's
metadata establishes it, `UNKNOWN` when it cannot.

#### Scenario: authentication state is reportable without a browser
- **WHEN** the status surface runs
- **THEN** it reports presence, state, remaining validity and blocked lanes
- **AND** no browser is launched, no host contacted, no cookie value read

#### Scenario: remaining validity is shown before a long run
- **WHEN** an artefact is `VALID` with less remaining validity than a
  campaign's declared budget
- **THEN** the pre-flight warns, naming both durations

#### Scenario: the Control Center shows the middle state
- **WHEN** an artefact exists but is expired
- **THEN** the surface shows it as present-and-expired, not as absent

### Requirement: The authentication model's consequence for autonomy SHALL be stated, and the renewal cadence owned

A framework designed for bounded overnight campaigns has an authentication
model that stops working between one night and the next, by design and for good
reasons. That trade-off is currently undocumented, so it reads as a defect each
time it occurs.

`README.md` and `docs/SAFETY_MODEL.md` SHALL state plainly: authenticated
capability requires a human-led capture; it expires; no automated renewal
exists and none is planned, because automating it would require Nightwatch to
hold credentials, which the safety model forbids. The expected renewal cadence
SHALL be stated once measured from real capture lifetimes rather than assumed.

`docs/HOST-CAPABILITY-MATRIX.md` SHALL record the authenticated lanes'
dependency on a currently-valid artefact as a host capability alongside Chrome
and Bubblewrap, so an expired artefact makes those lanes report
`UNAVAILABLE_CAPABILITY` with a named acquisition condition rather than
failing as though the code were broken.

#### Scenario: the trade-off is documented where an operator reads
- **WHEN** the README and safety model are read
- **THEN** both state that authenticated capability expires and that no
  automated renewal exists, with the reason

#### Scenario: an expired artefact makes lanes unavailable, not failing
- **WHEN** authenticated lanes run with an expired artefact
- **THEN** they report `UNAVAILABLE_CAPABILITY` with re-capture as the
  acquisition condition
- **AND** they are not recorded as failures

#### Scenario: the cadence is measured, not assumed
- **WHEN** the renewal cadence is documented
- **THEN** it cites observed capture lifetimes with their measurement date
