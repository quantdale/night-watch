# Source-Proof Soundness + Static Discovery Hardening — Delta Specification

## ADDED Requirements

### Requirement: Exhaustive tracked-file execution audit

The campaign SHALL establish a live tracked-file manifest and account for every tracked path before implementation.

#### Scenario: Local audit completes

- WHEN the executor runs the authoritative git ls-files inventory
- THEN every tracked path SHALL have a review classification/disposition
- AND reviewed-count SHALL equal tracked-count
- AND historical/generated/fixture files SHALL still be reviewed for role and coupling
- AND no subsystem SHALL be declared clean solely from a search query.

### Requirement: Response proof requires reachable-exit completeness

A PHP response shape SHALL NOT be mechanically provable merely because all encountered explicit return arrays agree. Every reachable function exit covered by the proof family SHALL be mechanically accounted for.

#### Scenario: Conditional return has implicit fall-through

- GIVEN a handler where one conditional branch returns a literal response and another path can reach function end
- WHEN extended PHP response analysis runs
- THEN the direct response family SHALL NOT emit a mechanically-provable response shape for the whole handler
- AND downstream responseProof and semanticProof SHALL NOT become PROVEN from that incomplete family.

#### Scenario: Conditional early return has terminal fallback

- GIVEN a handler with a conditional literal return followed by an unconditional compatible terminal return
- WHEN every reachable path is mechanically covered
- THEN the response family MAY remain mechanically provable
- AND its field/root shape SHALL reflect all reachable returns.

#### Scenario: Complete if/elseif/else

- GIVEN an exact bounded branch set with a final else and every branch terminates in a compatible proven response shape
- WHEN analysis runs
- THEN the family MAY produce proof
- AND a missing/unsupported branch SHALL instead fail closed.

#### Scenario: Unsupported control flow appears

- GIVEN nested unsupported flow, loops, try/catch/finally, generator/yield behavior, unknown terminators, dynamic calls or another unmodeled exit
- WHEN the analyzer cannot prove completeness
- THEN the result SHALL remain rejected/unproven
- AND no partial branch SHALL manufacture a response contract.

### Requirement: Static route proof ignores non-code lexical regions

TypeScript, JavaScript and Go route discovery SHALL only match lexically executable code regions supported by the bounded static grammar.

#### Scenario: Route syntax occurs in comment

- GIVEN code-like app/router route text inside a line or block comment
- WHEN static route discovery runs
- THEN no route operation SHALL be produced from that text.

#### Scenario: Route syntax occurs in string

- GIVEN code-like route text inside quoted, template, or raw string content
- WHEN static route discovery runs
- THEN no route operation SHALL be produced from that text.

#### Scenario: Real route remains

- GIVEN a currently supported real static route call
- WHEN lexical hardening is applied
- THEN its method/path/handler identity and deterministic ordering SHALL remain equivalent unless an old identity is separately proven incorrect.

#### Scenario: Lexical input is malformed

- GIVEN unterminated or otherwise unsupported lexical structure
- WHEN source truth cannot be established safely
- THEN discovery SHALL fail closed or omit proof according to existing bounded semantics
- AND SHALL NOT interpret the malformed text as a route.

### Requirement: Handler declaration proof ignores comments and strings

Exact handler declaration counts SHALL be derived from lexically real declarations, not raw textual matches.

#### Scenario: Fake declaration text accompanies one real declaration

- GIVEN one real handler declaration and one comment/string containing declaration-like text
- WHEN route-handler join resolution runs
- THEN the fake text SHALL NOT increase declaration count
- AND the real declaration MAY be PROVEN if all other conditions pass.

#### Scenario: Two real declarations exist

- GIVEN two lexically real declarations for the same required symbol
- WHEN join resolution runs
- THEN the join SHALL remain MULTIPLE_SYMBOLS or equivalent fail-closed ambiguity.

### Requirement: Proof-family rejection ownership remains local

The campaign SHALL NOT globally cancel all proven structural observations because an unrelated analyzer emitted a rejection.

#### Scenario: Independent proof classes coexist

- GIVEN one analyzer rejects a proof class it does not understand while another independently proves a different exact structural fact
- WHEN response evidence is assembled
- THEN the exact proven fact MAY remain usable
- PROVIDED its own proof-family completeness rules are satisfied.

### Requirement: Correctness deltas are versioned and classified

A repaired false proof MAY change evidence/contract/census identities, but the change SHALL be explicit and attributable.

#### Scenario: Old false proof is removed

- WHEN a reproduced false admission changes a response/semantic/deterministic identity
- THEN the campaign SHALL classify it as an intentional correctness delta
- AND bump the load-bearing analyzer/version identity where required
- AND verify cache/currentness/invalidation follows the new identity
- AND SHALL NOT roll the fix back merely to preserve the old digest.

#### Scenario: Unrelated identity drifts

- WHEN a known-good unaffected input changes proof shape/order/digest without a documented correctness cause
- THEN the campaign SHALL treat it as unexplained drift
- AND investigate or roll back the responsible change before acceptance.

### Requirement: Source hardening remains bounded and non-executing

Lexical/control-flow hardening SHALL remain static, deterministic and bounded.

#### Scenario: Hardening executes

- WHEN route/declaration/response analysis runs
- THEN it SHALL NOT execute PHP, JavaScript, Go, framework containers, services or source repositories
- AND SHALL preserve existing byte/token/declaration/operation/output bounds
- AND raw source SHALL remain ephemeral.

### Requirement: New proof coverage requires a fresh exact-family admission

After soundness hardening, at most one new static proof family MAY be added in this campaign and only if current source evidence clears the full admission bar.

#### Scenario: No family clears the bar

- WHEN fresh census evidence has no mechanically complete repeated family
- THEN no new proof authority SHALL be added
- AND the campaign MAY still complete successfully through soundness hardening.

#### Scenario: Exact family clears the bar

- WHEN a family has current positive population, complete bounded syntax, adversarial near-miss rejection, deterministic identity, currentness binding and downstream compatibility
- THEN it MAY be integrated through existing adapters
- AND dynamic/runtime/fuzzy/GET-only heuristics SHALL remain excluded.

### Requirement: Lower eligibility can be a successful result

The campaign SHALL prioritize truthful proof over coverage counts.

#### Scenario: Hardening removes old false proof

- WHEN response, semantic, or Phase-24 eligible counts decrease because a reproduced unsound proof is removed
- THEN the campaign SHALL report the decrease as a correctness improvement
- AND SHALL NOT weaken the fix to restore the prior count.

### Requirement: Full local acceptance remains authoritative

The campaign SHALL preserve the complete applicable local acceptance cone.

#### Scenario: Terminal acceptance

- WHEN implementation is declared complete
- THEN focused source/analyzer tests, campaign synthetic, semantic compatibility, owner provenance, local gate, clean gate, continuity checks, project checks and diff checks SHALL pass
- AND exact skips/known external blocks SHALL be explained
- AND no test weakening SHALL be used.

### Requirement: External zero-step CI remains non-evidence

#### Scenario: Final Actions run executes no steps

- WHEN exact-head GitHub Actions returns a job with zero/null steps
- THEN it SHALL be classified as NO_STEPS_BILLING_OR_PLATFORM_BLOCK or equivalent external block
- AND SHALL NOT be called green
- AND workflow logic SHALL NOT be changed solely to hide the external condition.
