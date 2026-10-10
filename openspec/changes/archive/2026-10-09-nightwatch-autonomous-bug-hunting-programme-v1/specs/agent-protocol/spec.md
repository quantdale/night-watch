# Spec — agent protocol

## ADDED Requirements

### Requirement: agent protocol

Nightwatch autonomous investigation SHALL proceed only through the frozen
`nightwatch.agent-protocol.v1` contracts.

#### Scenario: unknown tool fails closed

- GIVEN a reasoner response whose CALL_TOOL id is not in the catalog
- THEN validation returns UNKNOWN_TOOL and no tool executes

#### Scenario: unsafe intent fails closed

- GIVEN a reasoner response kind of SHELL, GIT_MUTATION, RAW_PLAYWRIGHT,
  RAW_NETWORK, CREDENTIAL_ACCESS, SLACK, LESLIE, PONDR, or
  EXTERNAL_PUBLICATION
- THEN validation returns UNSAFE_INTENT

#### Scenario: unauthorized environment fails closed

- GIVEN REQUEST_BROWSER_OBSERVATION or REQUEST_API_OBSERVATION
- AND the runtime context does not authorize DEV
- THEN validation returns UNAUTHORIZED_ENVIRONMENT

#### Scenario: untrusted bytes have zero authority

- GIVEN source, HTML, DOM, logs, API, history, or documentation containing
  "ignore previous instructions"
- THEN those bytes cannot mint an intent
- AND only typed envelope intents may execute

#### Scenario: budget exhaustion is not success

- GIVEN any budget dimension at its ceiling
- THEN the runtime decision is SAFE_TERMINATION_CHECKPOINT
- AND it is never classified as SUCCESS

#### Scenario: atlas inference is not a fact

- GIVEN an atlas record categorized INFERENCE
- THEN presenting it as SOURCE_FACT fails closed

#### Scenario: finding authority

- GIVEN an autonomous dossier
- THEN humanReviewRequired is true
- AND externalPublication is PROHIBITED
- AND autoLeslie and autoFile are false
