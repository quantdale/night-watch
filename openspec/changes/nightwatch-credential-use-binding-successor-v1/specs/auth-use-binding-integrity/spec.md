## ADDED Requirements

### Requirement: Credential effects require one-shot live binding

The system SHALL bind the approved username/password/submit controls and form
to the exact current page/frame/document/form before provider retrieval and
SHALL revalidate that binding before every secret-bearing effect.

#### Scenario: Document is replaced after preflight
- **WHEN** the approved form/control identity changes before fill
- **THEN** the operation refuses with `AUTH_FORM_BINDING_STALE` before credential input

#### Scenario: Form action changes
- **WHEN** the live form action, method, or target differs from the binding
- **THEN** the operation refuses before the next effect

### Requirement: Binding metadata is non-secret and revocable

Markers and identity metadata SHALL contain no credential, URL parameter, page
text, or evidence payload, and SHALL be revoked on success/failure/navigation.

#### Scenario: Operation exits
- **WHEN** fill/submit throws or completes
- **THEN** all binding markers/expandos are removed and no secret is persisted

### Requirement: Normal source-backed flow remains bounded

A single unchanged synthetic login form SHALL fill username/password and submit
exactly once through the binding.

### Requirement: Adversarial validation protects the authority

Tests SHALL cover replacement, action drift, navigation, duplicate use, and
mutation removal of identity/action/revalidation guards; residuals for dynamic
listeners SHALL remain explicit.

#### Scenario: Identity guard is removed
- **WHEN** a mutation accepts a cloned/replaced element
- **THEN** focused validation fails
