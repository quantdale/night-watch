# Spec — Production observation readiness

Bounds the C-12 → C-13 → C-14 path. Measured at `36bd493`:
`config/environments/production.json` remains structurally unloadable (D-4);
`SUPPORTED_ENVIRONMENTS` excludes production; C-11 `PROD_OBSERVE` and MA-8/F-13
are COMPLETE; C-12 is PENDING and not authorized; `POSITIVE_DEPLOYMENT_FACTS`
is 0 (see `deployment-fact-acquisition`); C-08b is organizationally blocked; P4
is blocked on U-3, an organizational read-only observer identity.

## ADDED Requirements

### Requirement: The production path SHALL state, per stage, what is Nightwatch's work and what is an external decision

The plan currently interleaves both, so a reader cannot tell whether a stage is
waiting on code or on a person. Each of C-12, C-13, C-14 and P4 SHALL carry two
explicit lists: the repository work that must exist before authorization is
even meaningful, and the external prerequisite that must be satisfied by
someone other than an agent.

Recorded from current evidence, to be maintained as data rather than prose:

- **C-12 (P1 passive observation)** — repository work: complete; external:
  authorized passive observation sessions and the operator prerequisites named
  in `docs/C12-OPERATOR-RUNBOOK.md`. Acceptance: ≥ 3 sessions, zero requests
  issued by Nightwatch, zero raw values persisted, baselines recorded.
- **C-13 (P2 bounded active reads)** — repository work: the deployment-fact
  refusal guard, request budgeting, two-witness traceability; external: C-08b
  access and a one-shot authorization. Structurally impossible while
  `POSITIVE_DEPLOYMENT_FACTS` is 0.
- **C-14 (P3 bounded replay)** — repository work: replay under the production
  privacy firewall; external: C-13 evidence. Acceptance: ≥ 1 candidate
  reproduced with exact fingerprint equality, dossier privacy-clean.
- **P4 (autonomous read-only campaigns)** — blocked on U-3, an organizationally
  enforced read-only observer identity. Outside Nightwatch's scope entirely.

A stage whose external prerequisite is unsatisfied SHALL report that, not
`NOT_AUTHORIZED`, because the two words send an owner to different actions.

#### Scenario: a stage reports the right kind of blocker
- **WHEN** a stage's external prerequisite is unmet
- **THEN** it reports `EXTERNAL_PREREQUISITE_UNMET` naming the prerequisite
- **AND** it does not report `NOT_AUTHORIZED`, which implies a decision is
  sufficient

#### Scenario: a stage with complete repository work says so
- **WHEN** C-12's repository work is complete and only authorization remains
- **THEN** the stage reports `AWAITING_AUTHORIZATION`
- **AND** the repository work list is empty

### Requirement: Production SHALL remain structurally unrunnable until every prerequisite of its stage is satisfied

D-4's structurally unloadable `config/environments/production.json` is the
strongest guard in the system and SHALL be preserved exactly. No capability in
this programme makes production loadable.

When a stage is eventually authorized, loadability SHALL be granted per-stage
and per-session, never globally, and SHALL be revoked when the session ends.
The existing fail-closed outbound policy, host classification, proxy admission
and L6 containment SHALL apply unchanged; production hosts SHALL remain
explicitly classified rather than string-matched.

#### Scenario: production stays unloadable by default
- **WHEN** any command runs without an active authorized production stage
- **THEN** `config/environments/production.json` fails to load
- **AND** every production host is DENIED by the outbound policy

#### Scenario: authorization is per-session, not persistent
- **WHEN** an authorized stage session ends
- **THEN** loadability is revoked
- **AND** a subsequent run without fresh authorization fails closed

### Requirement: Passive observation SHALL be provably passive

C-12's acceptance requires zero requests issued by Nightwatch. That SHALL be
proven by the request-accounting path rather than asserted by the scenario:
every observed request SHALL be attributable to the application, and a request
attributable to Nightwatch SHALL abort the session.

Raw value persistence SHALL remain structurally impossible via the C-10
firewall: the persistence API cannot accept a raw value, and redaction remains
defence in depth only. The session SHALL record the structural projection and
the prodstruct digests, never a value-derived digest.

#### Scenario: a Nightwatch-originated request aborts the session
- **WHEN** any request during a passive session is attributable to Nightwatch
- **THEN** the session aborts and records the request's origin
- **AND** the session's evidence is marked invalid for acceptance

#### Scenario: raw values cannot be persisted even under error
- **WHEN** an internal error occurs mid-session
- **THEN** the emitted receipt is a safe `INTERNAL_ERROR` record
- **AND** no raw value, literal or value-derived digest is written
