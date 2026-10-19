## ADDED Requirements

### Requirement: A metered campaign is ceiling-bound before any provider call
The metered provider route SHALL refuse to start before any provider call
when no spending ceiling is supplied, the ceiling is malformed, the rate card
is missing or invalid, the run's provider/model identity disagrees with the
declaration, the output bound is not enforceable (no account-side hard stop),
or the projected worst-case spend exceeds the approved ceiling.

#### Scenario: Missing ceiling
- **WHEN** a metered campaign is launched without a monetary ceiling
- **THEN** the run fails closed with zero provider calls

#### Scenario: Identity substitution
- **WHEN** the declared ceiling binds a provider or model that differs from
  the resolved run identity
- **THEN** the run fails closed with zero provider calls

### Requirement: A resumed campaign is held to its original ceiling
The ceiling SHALL be preserved across pause and resume; a resume SHALL be
refused when the ceiling is absent, widened or identity-mismatched relative
to the persisted declaration.

#### Scenario: Widened resume
- **WHEN** a resume supplies a ceiling larger than the persisted one
- **THEN** the resume is refused before any provider call

### Requirement: A user label never bypasses enforcement
The metered/non-metered distinction SHALL be mechanical (the resolved adapter
identity), and no user-supplied free or zero-price label SHALL disable the
admission for the metered route.

#### Scenario: Free label on the metered route
- **WHEN** a metered campaign declares a zero rate card or a free label
- **THEN** the run fails closed as an invalid metered declaration
