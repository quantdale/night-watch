# Proposal — OpenAPI Admission (C-02a)

## Why

`parseOpenApiRoutes` was written, tested, and unreachable. The only thing
stopping Nightwatch from reading all 591 `alphauslabs/blueapi` HTTP operations
was `APPROVED_ROOTS['alphauslabs/blueapi'] = ['billing']`, which does not
include `openapiv2`. The scan visited the repository, found one candidate
file, and rejected it as `SOURCE_LANGUAGE_UNSUPPORTED`; `admittedFileCount`
was 0 and every blueapi operation was invisible.

The independent review measured the artifact directly:
`openapiv2/apidocs.swagger.json` at `691422e5` is Swagger 2.0, 1,435,500
bytes, 462 paths, 591 verb-bound operations, 1,179 `definitions`. That is one
line of owner-approved data away from being the highest-yield source in the
system, and it does not require the new proto lexer that C-02 originally
assumed.

It does require honesty about what the file is. The swagger mirror is
*approximately* but not *exactly* current against the protos (get 185 vs 187,
delete 60 vs 61, post 253 vs 254) and is regenerated only when somebody runs
the generator.

## Change

Admit exactly one new root and classify what it yields:

> `blueapi/openapiv2` becomes an approved root of the already-admitted
> `alphauslabs/blueapi` repository; the existing `parseOpenApiRoutes` gains
> in-document `$ref` → `definitions` response binding and no other parser is
> written; the resulting evidence is `SOURCE_FACT` with a `GENERATED_ARTIFACT`
> qualifier, carries a generation-currency check against the proto surface
> that answers `UNKNOWN` rather than guessing, and is mechanically barred from
> being the sole basis of a production admission.

`alphauslabs/blueinternal` is out of scope: it is not a member of the
repository universe at all, so admitting it is a REPOSITORY admission and
belongs to C-05.

## Impact

The whole population moves from 223 to 814 operations (223 Ripple + 591
blueapi, zero dropped, zero deduplicated) and `responseContracts` from 58 to
649, with 970 response contracts bound from the artifact's own definitions and
0 unresolved. No new product, runtime, network, persistence, or admission
authority is created; the new evidence class can only deny.
