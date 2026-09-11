# Audit — C-02b, before implementation

Audited at `fab7675883b15bdfc29bcc946d52b2762fe96b2f` against the working
tree, the pinned sibling checkouts, and the authoritative gate manifests.

## A-1 — The language gate, not the root gate, is what blocks protobuf today

`APPROVED_EXTENSIONS` in `src/core/source/approvedScan.ts` lists
`.php .ts .tsx .js .jsx .go .json .yaml .yml`. `SOURCE_SCAN_LANGUAGES` in
`src/core/source/scanTypes.ts` lists `PHP TYPESCRIPT JAVASCRIPT GO OPENAPI
YAML`. `alphauslabs/blueapi` already has `billing` as an approved root, and
`billing/v1/billing.proto` already lives inside it. The file is therefore
already inside the granted boundary and is rejected on its extension alone.

Consequence: C-02b adds a language and an extension. It does not add a root
and it does not add a repository. This is a strictly narrower change than
C-02a, which did add a root.

## A-2 — The approved universe contains exactly two proto files

Measured by enumeration over the approved roots at the pinned SHAs:
`alphauslabs/blueapi` `billing/v1/billing.proto` (129,892 bytes) and
`mobingilabs/ouchan` `pkg/sapphire/proto/v1/types.proto`, which declares zero
services. Every other approved root yields none.

Consequence: the entire C-02b yield comes from one file, and the ≥147
acceptance criterion is a statement about that file. The ouchan file is still
worth parsing: a proto with zero services is the honest negative case, and it
proves the parser does not invent a service where none is declared.

## A-3 — The historical streaming figure does not survive the boundary

The master plan's "662 annotated RPCs" and the ~90-streaming-RPC expectation
count the whole `blueapi` repository. Inside the approved universe the
measured surface is 147 RPCs, of which 33 are server-streaming, 0
client-streaming and 0 bidirectional.

Consequence: C-02b reports 33, not 90, and records why. The larger figure is
reachable only through roots that C-05 governs. Reporting 90 would require
reading source this campaign is not authorized to read.

## A-4 — The generated artifact offers an exact join key, and the existing
currency check would not use it

`openapiv2/apidocs.swagger.json` carries 591 operations, 147 tagged `Billing`,
each with an `operationId` of the form `Billing_<RpcName>`. Meanwhile
`evaluateGenerationCurrency` compares `protoOperationCount` to
`artifactOperationCount` and returns `CURRENT` on equality.

Consequence, and the sharpest finding in this audit: if C-02b simply populated
`PROTO_SURFACE_CORROBORATIONS` with `{ protoOperationCount: 147 }`, the
artifact would be promoted from `UNKNOWN` to `CURRENT` — and thereby out of
one production-admission denial — **without a single route, verb or symbol
ever being compared**. Two surfaces can agree on 147 while disagreeing on
every path in it. The count path is a necessary condition wearing a sufficient
condition's clothes.

C-02b therefore supplies a per-operation corroboration record and treats the
count comparison as subordinate to it. A count agreement with any
non-MATCH operation must not yield `CURRENT`.

## A-5 — Adding 147 operations is precisely the F-27 eviction hazard

`F-27` recorded that a single global operation budget plus `repoId`-first
ordering lets `alphauslabs/blueapi` consume the budget and silently zero
`mobingilabs/ripple-api`. C-01 closed the silent part and added the
no-eviction requirement. C-02b is the first campaign after C-01 to add a large
block of blueapi operations, so it is the first real test of that regression.

Consequence: the no-eviction assertion is an acceptance row with its own
evidence, not a line in a test file that happens to still pass.

## A-6 — Campaign suite registration is not automatic, and two existing
campaign suites appear unregistered

The CI workflow (`.github/workflows/hardening.yml`) runs exactly one step,
`npm run gate:ci`. The gate's eleven groups run the manifests
`config/semantic-compatibility.v1.json` (phases 9–26) and
`config/synthetic-campaign.v1.json` (an explicit file list). There is no group
that runs `tests/unit` wholesale.

`tests/unit/c02aOpenApiAdmission.test.ts` and
`tests/unit/c06PhpReadOnlyProof.test.ts` are in neither manifest.

Consequence: C-02b registers its own suites explicitly and adds a membership
assertion so the registration cannot be silently dropped. The status of the
two pre-existing suites is confirmed mechanically during validation and
reported; it is a pre-existing condition, not one this campaign introduces,
and repairing it is raised in the report rather than absorbed silently.

## A-7 — Test topology must not be inferred

C-11 produced 49 failures from `workspaceRoot = path.resolve(checkout, '..')`.
Every C-02b fixture takes an explicit root. The parser modules take source
text, never a path, so they have no filesystem authority to infer from; the
only fixtures that touch the real sibling tree gate themselves on the
repository's existing sibling-topology helper and skip categorically when it
is absent.
