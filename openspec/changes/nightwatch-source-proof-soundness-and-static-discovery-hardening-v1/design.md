# Design: Proof-Sound Static Source Discovery

## Design goals

1. A PROVEN source fact must correspond to lexically real, structurally reachable source.
2. Control-flow completeness must be established before a response shape becomes authority.
3. Comment/string text must never create route or handler-declaration proof.
4. Existing currentness, privacy, boundedness, identity and fail-closed semantics remain authoritative.
5. Correctness-driven identity drift is explicitly versioned and explained; optimization-only drift remains forbidden.
6. New proof coverage is optional and must be earned after hardening.

## Component A — PHP response path-completeness boundary

The existing extended PHP response analyzer already has bounded tokenization and narrow shape parsers. Reuse those mechanics rather than adding runtime execution.

Introduce an explicit control-flow completeness result for response-shape admission.

A safe internal shape may be conceptually:

- COMPLETE_WITH_SHAPES
- INCOMPLETE_FALLTHROUGH
- UNSUPPORTED_CONTROL_FLOW
- AMBIGUOUS_RETURN
- BUDGET_REJECTED

The implementation does not need these exact names, but it must make completeness explicit rather than inferred from "we saw at least one return."

### Minimum recognized forms

The analyzer should prove only forms whose reachable exits are mechanically accounted for.

Examples that SHOULD remain provable when shapes agree:

~~~php
function readExample() {
    return ['id' => 1];
}
~~~

~~~php
function readExample($mode) {
    if ($mode) {
        return ['id' => 1];
    }
    return ['id' => 2];
}
~~~

~~~php
function readExample($mode) {
    if ($mode) {
        return ['id' => 1];
    } else {
        return ['id' => 2];
    }
}
~~~

Example that MUST NOT be proven:

~~~php
function readExample($mode) {
    if ($mode) {
        return ['id' => 1];
    }
}
~~~

Also fail closed for unsupported nested branches, loops, try/catch/finally, throws whose reachability is not modeled, yield/generator semantics, dynamic calls, multiple ambiguous aliases, or other unmodeled terminators.

Do not attempt a general PHP CFG in this campaign unless the local audit proves a small bounded implementation is safer than a narrower grammar.

### Identity/versioning

A correctness change to extended response admission changes semantic meaning. Bump the appropriate real-source response analyzer identity/version if required by current contracts and ensure sourceSurfaceAnalyzerSetIdentity, cache keys, gap taxonomy/currentness, and downstream invalidation observe the change.

Do not bump unrelated historical semantic analyzer identities.

## Component B — lexical-safe static route scanner

Replace raw regex-over-source matching with a bounded mechanism that excludes comments and string/template literal bodies before recognizing routes.

Requirements:

- TypeScript/JavaScript single-line comments, block comments, quoted strings, and template literals cannot produce routes.
- Go line/block comments and quoted/raw strings cannot produce routes.
- Real existing supported calls retain the same method/path/handler extraction and deterministic ordering.
- Malformed/unterminated lexical constructs fail closed; they do not become routes.
- Source-size and operation-count bounds remain enforced.
- No JavaScript/Go execution and no dependency on an external framework runtime.

Implementation choices may include:

- a small deterministic lexical masker preserving character positions; or
- a bounded tokenizer already present in the repository if it can be reused without semantic coupling.

Do not use a regex that merely tries to enumerate comment edge cases.

## Component C — lexical-safe declaration proof

handler declaration counting must operate on lexically real code.

For PHP, prefer the existing bounded PHP tokenization/declaration utilities where practical. If a smaller declaration lexer is introduced, it must:

- ignore comments/string contents;
- distinguish exact symbol declarations;
- preserve duplicate-declaration rejection;
- fail closed on token/budget errors;
- never infer a declaration from a name occurrence, callsite, docblock, or string.

If behavior changes from false MULTIPLE_SYMBOLS to exact PROVEN, document it as a corrected join classification and verify downstream identity changes.

## Component D — proof conflict ownership

Do NOT implement a global rule where any rejected analyzer observation cancels all proven observations. Different analyzers can independently reject one proof class while another proves a different structural fact.

Instead:

- each proof family owns its completeness conditions;
- the direct/branch/alias PHP response family must not emit a proven shape when its own reachability is incomplete;
- route proof must be lexically sound at route discovery;
- handler proof must be lexically sound at declaration resolution;
- downstream responseEvidence continues consuming only facts whose producing authority marked them mechanically provable.

## Component E — parity and correctness-delta harness

Before fixes, capture safe baseline outputs from:

- synthetic reproductions;
- current approved-source discovery;
- campaign:source-gaps;
- campaign:eligibility-census;
- campaign:readonly-census;
- relevant surfaces/review output.

After each fix, classify differences:

1. INTENTIONAL_CORRECTNESS_DELTA — reproduced old false proof/discovery removed or corrected.
2. EXPECTED_VERSION_INVALIDATION — analyzer/version identity changes caused by the correctness repair.
3. UNEXPLAINED_DRIFT — hard failure requiring investigation/rollback.

For unaffected known-good fixtures, observation shapes, ordering, evidence identities, route records, joins and downstream outputs should stay equal.

No raw source may be persisted in the delta report.

## Component F — optional static proof-depth extension

This component is admitted only after A–E are green and a fresh current-source census has been rerun.

Admission bar for one new family:

- at least one current exact source population;
- bounded syntax with complete lexical/control-flow proof;
- positive synthetic exemplars;
- adversarial near-miss exemplars;
- no dynamic dispatch/runtime inference;
- deterministic evidence identity;
- source-currentness binding;
- explicit false-positive analysis;
- downstream Phase-24 integration through existing adapters only;
- full regression and privacy proof.

If no family clears this bar, do not force one. Use remaining productive time for adversarial coverage, helper decomposition, mutation tests, and audit closure.

## Adversarial matrix

At minimum test:

### PHP return completeness

- single unconditional return;
- early conditional return + unconditional fallback;
- complete if/else;
- complete if/elseif/else;
- if without else/fallback;
- nested incomplete branch;
- loop-contained return;
- try/catch/finally;
- throw/yield/exit-like unsupported terminators;
- direct literal plus variable/call return;
- branch field-set mismatch;
- branch root-type mismatch;
- alias mutation;
- dynamic key;
- multiple return aliases;
- comments/strings containing return-like text;
- oversized/token-limit source.

### Route discovery

For TS/JS/Go:

- real route call;
- commented route;
- block-commented route;
- quoted code-like route string;
- template/raw string route text;
- escaped quote;
- multiline malformed string/comment;
- adjacent real and fake routes;
- duplicate real route behavior;
- unsupported dynamic path;
- operation bounds.

### Declaration resolution

- one real function;
- same function text in line comment;
- same text in block comment/docblock;
- same text in quoted string;
- one real + one fake textual declaration;
- two real declarations;
- missing declaration;
- malformed/token-budget source.

## Architecture boundaries

Keep:

- siblingSource as read-only filesystem authority;
- scan/currentness as inventory authority;
- responseFlow as bounded exact call-flow authority;
- sourceAnalyzers as proof-family authority;
- surfaces as assembly/integration authority;
- Phase24 as campaign eligibility authority.

Small extraction of lexical or control-flow helpers is allowed when it reduces duplicated parsing and makes soundness independently testable. Do not create a second competing source-discovery stack.

## Performance

Correctness is primary. Still measure source-gaps/eligibility wall time and peak RSS before/after so a hardening fix does not introduce accidental unbounded behavior.

No performance regression target is absolute; a bounded modest cost is acceptable for soundness. Large regressions require profiling and a safer implementation.

## CI

At final exact head, observe GitHub Actions once. A run with no executed steps remains NO_STEPS_BILLING_OR_PLATFORM_BLOCK and is not green evidence.
