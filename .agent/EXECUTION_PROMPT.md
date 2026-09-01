# EXECUTION PROMPT — OpenAPI Admission (C-02a)

HANDOFF_PROTOCOL_VERSION: nightwatch.planner-executor-handoff.v1
Status: COMPLETE
Campaign ID: nightwatch-openapi-admission-c02a-v1
OpenSpec: openspec/changes/nightwatch-openapi-admission-c02a-v1/
Planned-From: c64b56fff1237c489982a9d6cece7adea83c6387
Target Branch: main
Predecessor Task ID: nightwatch-truncation-truth-discovery-paging-c01-v1
Predecessor Status: COMPLETE

## Mission

Admit `openapiv2` as an approved root of the already-admitted
`alphauslabs/blueapi` repository and recover its committed generated Swagger
artifact through the existing `parseOpenApiRoutes` machinery. Zero new
parsers: the only parser change is in-document `$ref` → `definitions`
response binding inside the OpenAPI branch that already existed.

C-00's `ONE_WRITING_AGENT == ONE_WORKTREE == ONE_SESSION_IDENTITY` invariant
and its hygiene, deletion-gate and fast-forward-only integration protocol
remain in force as historical COMPLETE. C-01's truncation-truth and
no-eviction contracts remain in force and are re-proven against the expanded
population: C-02a is precisely the adversarial case C-01's per-repository
round-robin projection was built for, because `alphauslabs/blueapi` sorts
before `mobingilabs/ripple-api`.

## Authority and boundaries

C-02a grants no new product or runtime authority. The generated artifact is
`SOURCE_FACT` with a `GENERATED_ARTIFACT` qualifier; its generation currency
against the proto surface is `UNKNOWN` until C-02b supplies a corroborator,
and generated evidence is mechanically barred from being the sole basis of a
production admission.

`alphauslabs/blueinternal` is NOT admitted — that is a REPOSITORY admission
blocked behind C-05. No protobuf parser (C-02b), no Go/gRPC topology (C-03),
no read-only proof (C-06), no `PROD_OBSERVE`. No DEV, NEXT, or production
contact; no auth refresh; no credential or customer-data inspection; no
datastore, cloud, IAM, or Kubernetes access; no sibling-repository write; no
publication. Sibling Alphaus repositories are READ-ONLY source inputs reached
only through the existing confined read-only access object.

## Acceptance

See `openspec/changes/nightwatch-openapi-admission-c02a-v1/specs/openapi-admission/spec.md`
for the twelve normative requirements, and the task `SPEC.md` for the
campaign's acceptance criteria and declared deletions.
