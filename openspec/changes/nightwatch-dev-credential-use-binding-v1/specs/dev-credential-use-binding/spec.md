## ADDED Requirements

### Requirement: Automatic DEV credential use requires exact fresh authority
The system SHALL issue automatic credential-use authority only after proving the exact DEV environment, approved UI/auth origins and routes, attested proxy instance, browser context/page/main-frame/document generation, source-evidence identity, login controls/form, and expected submission/token-exchange mechanism. The authority SHALL be opaque, non-serializable, single-use, short-lived, and non-constructible by callers.

#### Scenario: Matching controls exist on an unbound page
- **WHEN** generic username/password/submit selectors are visible but the document or submission path is not the exact source-proven login generation
- **THEN** credential retrieval/use is refused before any field receives secret material

### Requirement: Every secret-bearing effect revalidates the live binding
Immediately before username fill, password fill, and submit, the capability owner SHALL verify unchanged context/page/main-frame/document, approved route, control/form identity, submission mechanism, source currentness, and proxy capability. Navigation, history/document replacement, detachment/replacement, popup/frame transfer, dynamic action/listener drift, proxy/source loss, expiry, or prior use SHALL revoke authority and stop all remaining effects.

#### Scenario: Page navigates after provider retrieval
- **WHEN** the document generation changes before password fill
- **THEN** the password is never filled, the capability is revoked, and the affected context follows the proven cleanup path

#### Scenario: Form changes between fill and submit
- **WHEN** action, target, method, owner frame, or source-proven listener identity changes
- **THEN** submit is refused and no request receives credential material

### Requirement: Credential submission mechanism is source proven
The system SHALL prove the exact native form action or source-bound script/token-exchange path that receives credential input. Locator shape alone SHALL NOT authorize use. Credential material SHALL NOT be passed to generic page evaluation, evidence, diagnostics, callbacks, command arguments, environment variables, or retry state.

#### Scenario: Page adds an unreviewed input listener
- **WHEN** an event path capable of receiving filled values is not part of the admitted source proof
- **THEN** automatic credential use remains blocked

### Requirement: Failure revokes, erases, and prevents reuse
Any refusal, exception, partial fill, timeout, unexpected exchange, or auth failure SHALL revoke the capability, zeroize mutable credential material, close or replace the affected page/context according to a proven cleanup contract, and emit only categorical stage/reason values. A retry SHALL repeat complete preflight and provider retrieval.

#### Scenario: Username fill succeeds and password fill fails
- **WHEN** a partial-use failure occurs
- **THEN** no submit or reuse is possible and the next attempt starts from a fresh document and capability

### Requirement: Credential-use enforcement is total and non-vacuous
Hardening SHALL discover every provider call and secret-bearing browser operation and require the one-shot capability owner. Tests SHALL include navigation/DOM/form/listener races, duplicate controls, frames/popups, expiry/double-use, proxy/source drift, partial failures, cleanup, no-echo diagnostics, and mutations removing each binding/recheck.

#### Scenario: New code fills a credential locator directly
- **WHEN** a credential consumer bypasses the capability owner
- **THEN** the census/hardening gate fails before release
