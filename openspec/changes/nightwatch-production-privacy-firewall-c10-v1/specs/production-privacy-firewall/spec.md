# Requirements — Production Privacy Firewall

1. Raw production bytes MUST NOT be capable of crossing into persistent
   evidence. The primary boundary MUST be an allowlisted structural projection
   whose persistence API cannot accept a raw value. Redaction MAY remain as
   defence in depth but MUST NOT be the primary production privacy boundary.
2. An `UNKNOWN` privacy classification MUST deny persistence. A classification
   that cannot be established MUST fail closed, never default to permitted.
3. An object key literal is DATA. A key literal MAY cross the production
   projection boundary only when it is mechanically established as a member of
   a source-proven finite key vocabulary carrying an explicit provenance class
   and provenance digest. A syntactically normal field name MUST NOT be treated
   as safe, and a regular expression over key names MUST NOT be accepted as
   proof.
4. For an unproven or dynamic key the projection MUST NOT persist the literal
   and MUST NOT persist a digest derived from it. Only approved structural
   information — bounded cardinality and category — may be preserved. Where the
   required structural representation cannot be produced safely the projection
   MUST fail closed.
5. The projection MUST distinguish source-proven static fields, dynamic or
   untrusted keys, bounded dynamic-key collections, and unresolved key
   provenance. Unknown keys MUST NOT re-enter through a serializer, diagnostic,
   receipt or downstream dossier conversion.
6. Structural identity and value-sensitive identity MUST be type-distinct and
   MUST NOT be interchangeable. The STRUCTURAL digest MUST be computed only from
   privacy-approved structural information, MUST NOT ingest a customer scalar
   value, MUST NOT ingest an unproven dynamic key literal, MUST be unsalted,
   deterministic and stable across equivalent runs and environments, and MAY be
   persisted. Its name and version MUST prevent confusion with any
   value-sensitive fingerprint.
7. No durable value-derived digest MAY exist in the production persistence
   contract. Where correlation is required within one in-memory analysis it MUST
   use an ephemeral opaque encounter token that is campaign-scoped, never
   persisted and never digested. No secret or salt MAY be persisted, and no
   digest MAY be computed over an enumerable low-entropy domain such as an
   account identifier, an invoice period or a billing-group identifier.
8. The production projection module MUST NOT hold persistence authority, and
   the persistence module MUST NOT accept a raw response object. The boundary
   MUST be expressed as distinct types — raw-ephemeral, safe structural
   projection, and safe production evidence — rather than `unknown` passed
   through loosely typed helpers.
9. The safe evidence DTO MUST expose a closed vocabulary only, and MUST reject
   unknown fields, arbitrary free text, prototype-hostile input, bound overflow
   and ambiguous provenance. Every error MUST be categorical, and no raw input
   MAY be interpolated into an exception.
10. The raw-to-safe projection cone MUST NOT possess filesystem, networking,
    process or publication capability. Absence of `node:fs`, filesystem write
    APIs, `node:http`, `node:https`, `node:net`, `node:dgram`, network fetch
    clients, `child_process`, environment-derived output destinations and
    publication connectors MUST be enforced mechanically, not by developer
    convention. Raw bytes MUST enter through one bounded call-scoped interface.
11. The durable-write boundary MUST independently re-validate, accepting only
    approved DTOs and rejecting raw values, response bodies, dynamic key
    literals, URLs carrying concrete parameters, headers, cookies, auth tokens,
    storage state, free text, authenticated DOM, screenshots, traces, arbitrary
    nested objects outside the contract, and unknown schema versions. This
    redundancy with projection is intentional.
12. The production artifact root MUST be a separate namespace from the DEV
    findings root, MUST use mode 0700 directories and mode 0600 files, MUST
    refuse symlink traversal, MUST lie outside the repository and workspace,
    MUST write atomically, MUST bound file counts, MUST carry an explicit schema
    and a separate policy identity, and MUST contain no raw source or customer
    content. It MUST NOT be populated from a real environment.
13. The Control Center findings authority MUST be structurally incapable of
    reading the production findings store. Rejection MUST hold for a future
    caller that passes the production root, MUST survive symlink and
    path-equivalence tricks, and MUST apply to test-only seams so that a seam
    cannot become production authority. It MUST NOT depend merely on the
    current default path, caller convention, localhost binding, `Host`
    validation or `Origin` validation. Normal DEV findings MUST continue to work.
14. Production page console text MUST NOT persist. The production cone MUST
    either exclude the console observer or emit categorical events carrying zero
    page-provided text. Production screenshots and Playwright traces MUST be
    impossible: enabling either in the production privacy cone MUST be a
    configuration or contract failure.
15. A future production browser MUST NOT leave authenticated profile residue. A
    private ephemeral profile path, restrictive permissions, disabled disk cache
    where feasible, disabled crash dumps, cleanup on normal exit, cleanup on an
    interrupted or crashed run, and stale production-profile residue in the
    persistence audit MUST all be provided. No real production browser is
    launched by this campaign.
16. Future request-parameter values MUST have an opaque-handle privacy model:
    owner-supplied, stored external-only, referenced inside Nightwatch state by
    opaque handle only, with the concrete value resolved at the narrow future
    request-construction boundary. No value MAY enter a log, a budget key, a
    replay fingerprint, a checkpoint, an error, a receipt or a persisted URL.
    Retained URL identity MUST use route templates, never concrete identifiers.
17. SSE and Control Center channels MUST NOT become a side channel around the
    production persistence boundary. Only already-safe projected metadata MAY
    enter them.
18. Production policy differences MUST be encoded in a versioned capability or
    policy object with fail-closed construction, NOT as environment checks
    scattered through the code. Existing DEV and local workflows MUST NOT be
    broken merely because production policy is stricter.
19. C-10 MUST NOT create a second independent privacy stack diverging from the
    existing system. Existing machinery MUST be reused and converged with where
    architecturally sound; where an unsafe abstraction must change, a versioned
    replacement or shared lower-level primitive MUST be implemented cleanly and
    its callers migrated with tests.
20. C-10 MUST NOT weaken C-06, MUST NOT create production connectivity, MUST
    NOT add production to `SUPPORTED_ENVIRONMENTS`, MUST NOT make
    `config/environments/production.json` loadable, and MUST NOT implement C-11.
