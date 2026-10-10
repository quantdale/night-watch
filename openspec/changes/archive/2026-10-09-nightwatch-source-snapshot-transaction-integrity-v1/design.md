## Context

`scanSource` obtains one SHA before walking a repository and stamps that SHA onto every later file record. No terminal SHA check closes the observation interval. `createCallScopedSourceReadView` compares later reads with inventory digests, but on mismatch returns the new bytes so downstream callers can classify them. Route discovery parses those bytes directly without checking the inventory digest, while other source roles use local checks. The resulting operation retains the old `sourceSha`; relevant-file evidence retains the old digest; and `toPhase24CandidateInput` asserts an exact snapshot match.

The confined source boundary validates path components and uses `O_NOFOLLOW` on the final source file, but pathname-based parent validation and later pathname use are separate effects. A replaced parent can change the object reached after validation. This proposal treats repository generation, path identity, and content identity as one transaction rather than independent best-effort checks.

## Goals / Non-Goals

**Goals:** exact source-generation binding; uniform digest enforcement; race-resistant path traversal; explicit access authority; truthful ledgers/currentness/cache eligibility; adversarial mutation proof.

**Non-Goals:** modify sibling repositories, create filesystem snapshots, expand admitted roots, infer contracts from stale source, or authorize contained DEV semantics.

## Decisions

### Close every source transaction

Each repository transaction records a supported Git/source identity before enumeration and revalidates it after all reads needed for the result. A changed, unavailable, ambiguous, or unsupported identity makes the repository transaction non-current. A multi-repository discovery is current only for repositories whose own transaction closed successfully; cross-repository evidence cannot combine incompatible generations.

### Never analyze mismatched bytes

The call-scoped view returns `null` or an explicit safe mismatch result when a re-read differs from its inventory digest. It never hands mismatched text to a parser. Every source role—route, handler, request, response, route provider, middleware, proto/OpenAPI artifact, and response-flow declaration—uses the same verified-read primitive.

### Derive authority rather than asserting it

Repository records, surfaces, cache entries, and Phase 24 inputs carry a mechanically derived transaction status. `sourceSnapshotMatches` is true only after successful closure. A mismatch makes currentness non-current, disables semantic/portfolio eligibility, and prevents cache publication.

### Hold path identity across use

Traversal and reads use descriptor-relative operations with no-follow semantics where supported, retain directory/file identity through the read, and compare pre/post file metadata appropriate to the platform. Unsupported hosts or detected replacement fail closed. Git HEAD and referenced metadata receive the same ancestry and identity treatment.

### Make access class explicit

Real-source access requires an explicit owner-approved repository capability. Synthetic fixture access uses a separate constructor/classification and can never be relabeled as real-source evidence. The historical omitted-options behavior is migrated rather than retained as implicit authority.

### Make the ledger total

Currentness, enumeration, content reads, refusals, mismatches, revalidation, and transaction outcome are counted under fixed bounds. A consumer can distinguish an empty repository from an unobserved, refused, raced, or partially read one without diagnostics containing source text.

## Risks / Trade-offs

Repository activity during analysis will cause conservative refusal and may require retry from a fresh transaction. Descriptor-relative APIs vary by platform; an unsupported implementation must report unavailable rather than fall back to the pathname race. Synthetic callers require explicit migration.

## Migration Plan

1. Freeze all real and synthetic source-access callers and source-file roles.
2. Add transaction/result and exact ledger schemas with hostile-race fixtures.
3. Introduce verified descriptor-relative reads and pre/post repository identity checks.
4. Migrate all parsers, joins, cache publication, and Phase 24 projection to verified transaction evidence.
5. Split real and synthetic access construction and prohibit implicit admission.
6. Run source, semantic, Phase 24, hardening, local/clean, and full regression gates without sibling or DEV contact.

## Open Questions

None. A changed source generation is unavailable for current authority even when some individual files happen to retain the same digest.
