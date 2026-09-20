## ADDED Requirements

### Requirement: Private payload admission is structural
The system SHALL validate private artifact inputs as bounded structured values before serialization. Sensitive key classes SHALL be rejected independent of quoting, case, separators, nesting, aliases, or the lexical shape/length of their values. Unknown keys, non-plain objects, cycles, accessors, prototype-hostile input, malformed encodings, and bound overflow SHALL fail closed.

#### Scenario: JSON quotes a sensitive key
- **WHEN** an object contains token, password, customer, account, cookie, authorization, cost, amount, or equivalent sensitive key with an ordinary string value
- **THEN** the object is rejected even though JSON serialization places quotes around the key

#### Scenario: Sensitive key is nested or aliased
- **WHEN** a sensitive class appears in a nested object, array item, case/separator variant, or registered alias
- **THEN** structural validation rejects the complete artifact categorically

### Requirement: Durable stores accept only closed safe DTOs
Every private artifact family SHALL define a versioned exact-key DTO with bounded values and explicit provenance. Only a successfully constructed immutable safe DTO SHALL cross a durable store boundary; arbitrary unknown values and scan-only admission SHALL be forbidden. The durable writer SHALL independently revalidate schema and brand.

#### Scenario: Generic object passes text scanning
- **WHEN** an arbitrary object contains no recognized regex shape
- **THEN** it is still refused because it is not an admitted family DTO

### Requirement: Readers enforce the same schema independently
Findings, reviews, run-evidence, production-defense, and Control Center readers SHALL parse bounded bytes, validate the exact artifact schema, and apply structural privacy validation before projecting safe output. Malformed, legacy-unknown, ambiguous, or privacy-unsafe records SHALL never be rendered or silently skipped as valid.

#### Scenario: On-disk record is tampered after publication
- **WHEN** a quoted sensitive field is inserted into an otherwise valid artifact
- **THEN** every reader returns a categorical privacy refusal and exposes none of the value

### Requirement: Text screening is bounded defense in depth
Allowed bounded text fields SHALL be canonicalized across supported encodings and screened for secret/sentinel/labeled forms after size limits and before persistence. Text screening SHALL NOT substitute for structural schema validation and failures SHALL not echo matched input.

#### Scenario: Encoded credential shape enters a safe text field
- **WHEN** a supported encoded or escaped credential form is supplied
- **THEN** canonicalization and screening reject it with a content-free code

### Requirement: Screening enforcement is total and non-vacuous
Hardening SHALL discover every screening consumer, private-store writer, and private reader and bind it to one artifact profile. Tests SHALL use ordinary non-sentinel sensitive values, quoted keys, nesting, arrays, aliases, encodings, malformed/prototype/cyclic shapes, size/depth/count limits, and mutations that remove structural validation or final revalidation.

#### Scenario: Tests use only canonical sentinel tokens
- **WHEN** the adversarial corpus does not prove rejection of ordinary quoted sensitive values
- **THEN** non-vacuity validation fails

#### Scenario: New store writer bypasses safe DTO construction
- **WHEN** a new call publishes an unbranded object
- **THEN** the census/hardening gate fails before release
