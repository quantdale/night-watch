# Requirements — PHP Read-Only Proof (C-06)

1. Membership in a hand-authored operation catalog MUST NOT be a read-only
   witness. No `semanticClass` value of `PHASE5_API_CATALOG` may produce
   `PROVEN_READ_ONLY`, and both historical D-79 admissions MUST be refused.
   The catalog MAY continue to supply a runtime binding, which is a different
   fact.
2. Read-only classification MUST be decided after the route → handler join,
   from the route's FULLY RESOLVED middleware pipeline PLUS its handler. A
   handler-only fallback MUST NOT exist. A route whose pipeline cannot be
   resolved mechanically MUST fail closed.
3. The effect vocabulary MUST be data-only, versioned and digest-bound, and
   MUST classify into exactly the kinds `PURE_READ`, `DATA_WRITE`,
   `AUDIT_WRITE`, `CACHE_WRITE`, `SESSION_WRITE`, `MESSAGE_PUBLISH`,
   `EXTERNAL_CALL` and `UNCLASSIFIED`, each with an explicit owner-approved
   admission recorded on every proof. An identifier the vocabulary does not
   name MUST be `UNCLASSIFIED` and MUST NOT be assumed to be a read.
4. Any outbound network call anywhere in the resolved closure MUST be
   disqualifying. The measured `MarketplaceSubscriptionMiddleware`
   counterexample MUST fail read-only proof even when the handler itself is a
   provable pure read.
5. Dynamic dispatch MUST fail closed. This includes a member access whose name
   is a value, a variable function, any callback-taking library function, any
   `__call`/`__callStatic`/`__get`/`__set`/`__isset`/`__unset` declaration in a
   walked file, and `include`/`require`.
6. An unresolved callee, a symbol that is absent or declared more than once,
   and any depth, declaration, callsite, file or token bound overflow MUST
   each fail closed with its own categorical reason code.
7. Closure recursion MUST NOT cross a file boundary. A same-named declaration
   in another file MUST NOT be bound to; that is the D-79 defect.
8. `READ_ONLY_PROVEN` MUST require at least one DECLARATION witness AND at
   least one EFFECT witness. Two witnesses of the same class MUST yield
   `READ_ONLY_SINGLE_WITNESS`, which is DEV-executable only. `W-SPEC` MUST be
   barred from production admission.
9. A witness with no implemented analyzer MUST report `UNSUPPORTED` — an
   absence — and MUST NOT be treated as held or as refuted.
10. Every proof MUST carry its route → handler join precondition, its
    repository inventory-completeness assertion, its resolved-pipeline
    precondition, its vocabulary digest, its per-kind effect ledger, its
    per-kind admission policy and its unclassified-callee count. Each
    precondition MUST be able only to DENY.
11. `UNCLASSIFIED > 0` in an admitted closure MUST block production admission,
    and callee-classification coverage MUST be measured and reported.
12. `SOURCE_FACT (GENERATED_ARTIFACT)` route evidence from C-02a MUST NOT
    independently grant a read-only effect proof.
13. The achieved `READ_ONLY_PROVEN` count MUST be reported as an observation,
    per repository and per effect kind. It MUST NOT be a pass/fail threshold,
    and no mechanism that reduces it may be weakened to raise it.
14. The negative corpus MUST contain at least the two historical D-79
    admissions, a GET whose resolved closure reaches a write, a GET whose
    middleware performs an external call, an unclassified callee, a
    depth-bound overflow, a dynamic-dispatch callee and an ambiguous join, and
    MUST yield zero admitted operations. The positive corpus MUST prove that a
    genuinely provable route IS admitted.
15. No source text, literal value, URL, token or customer value may enter a
    descriptor, proof, digest input, diagnostic or error message. The analyzer
    MUST NOT execute application source, and MUST read only through the
    existing confined sibling-source boundary.
