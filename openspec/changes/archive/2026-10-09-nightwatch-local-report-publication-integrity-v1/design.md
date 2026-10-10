## Context

Five report commands (`cache-key-contract`, `record-identity`, `release-freshness`, `silent-zero-output`, and `test-oracle-quality`) replace fixed ignored `artifacts/**/current.json` files with direct writes. `change-intelligence` uses the same pattern for its selected output. `gate-topology` directly writes timestamp-named certification receipts beneath `artifacts/topology-receipts/`. These schemas are declared persisted/private artifacts, but their writers bypass the safe publication patterns used by gate receipts, schema export, and owner-private stores.

Direct `mkdirSync` plus `writeFileSync` follows prepared ancestor or leaf symlinks, truncates an old current report before the new bytes are complete, and inherits inconsistent file modes. Millisecond-only topology receipt names can collide, making a nominally historical receipt replaceable. The ignored tree makes these failures easy to miss in review, while its contents can still influence local certification and operator decisions.

This change governs repository-local ignored publication only. Owner-private finding/review stores, retention mutation journals, explicit schema exports, and external owner-selected evidence roots have separate authority and remain outside this boundary.

## Goals / Non-Goals

**Goals:**

- Inventory every current ignored report/receipt publisher and assign an explicit publication profile.
- Admit bytes, schema, size, destination ancestry, leaf type, and publication profile before changing the destination.
- Make replaceable current reports atomic, private, complete, and concurrency-defined.
- Make historical topology receipts immutable and collision-safe.
- Fail categorically without following symlinks, exposing machine paths, corrupting the last complete report, or representing an unpublished receipt as success.
- Detect future direct-write bypasses through structural and non-vacuous mutation enforcement.

**Non-Goals:**

- Changing report payload schemas, analytical algorithms, gate verdicts, or source-authority rules except for a bounded publisher identity if needed for immutable receipt naming.
- Making ignored artifacts authoritative Git evidence or publishing them outside the local owner environment.
- Providing hostile same-operating-system-account isolation; a process that can arbitrarily rewrite the repository can also rewrite this implementation.
- Replacing the crash-consistent retention journal, private finding/review stores, gate receipt transport, or general schema export mechanisms.
- Solving generic CLI parsing, help, stdout, or absolute-path display behavior already owned by the production-completion operator CLI contract.

## Decisions

### Centralize publication behind two explicit profiles

Add a small `bin/lib/local-report-publisher.mjs` boundary with no network, subprocess, repository-discovery, or product authority. Callers supply already constructed data, an exact schema validator, a byte/count limit, an output path, and one of two profiles:

- `CURRENT_REPLACE` for regenerable `current.json` reports; and
- `APPEND_IMMUTABLE` for historical gate-topology receipts.

A checked inventory maps all seven callers, their default destination, schema identity, maximum serialized bytes, and profile. It is the sole allowlist for ignored report publication. Direct filesystem writes from an inventoried caller are forbidden.

Alternative considered: copy the existing write sequence into every CLI and add local checks. That leaves seven policy copies and gives later writers no complete enforcement denominator.

### Complete all data admission before filesystem mutation

The publisher first canonicalizes and serializes the complete payload in memory, applies the exact caller schema validator, enforces a fixed byte bound, and calculates its digest. Serialization failure, schema disagreement, or overflow returns a bounded refusal before creating a directory, temporary file, receipt, or destination.

Default destinations are repository-root anchored and confined to their declared ignored artifact subtrees. An explicit operator `--out` remains an intentional destination selection, but the resolved absolute path, every existing ancestor, the destination parent, and any existing leaf must satisfy one safe walk: ancestors are real non-symlink directories, the leaf is absent or a bounded regular file allowed by the selected profile, and path identity remains stable across publication. Relative traversal, broken links, symlink leaves/ancestors, device/FIFO/socket leaves, unsafe replacement, and identity disagreement fail before destination mutation. Public results use categorical identities, never absolute paths or raw filesystem errors.

Alternative considered: forbid all explicit destinations outside `artifacts/`. That would silently take away established operator-controlled local export behavior and is unnecessary to close symlink/type/race hazards. Explicit selection remains authority for the named regular file, not authority to follow links or mutate unrelated paths through them.

### Publish current reports with same-directory exclusive staging and atomic replacement

For `CURRENT_REPLACE`, create a unique unpredictable temporary regular file in the verified destination directory with exclusive create and mode `0600`. Write the admitted bytes, flush and close the file, reopen/verify its type, size, and digest, revalidate the parent/destination identities, then atomically rename it onto the destination and flush directory metadata where the qualified platform supports it. Clean up only the exact temporary identity owned by this invocation.

An observer therefore sees the preceding complete report or the new complete report, never a truncated intermediate. Concurrent valid publishers are linearized by atomic commit: each process can report its own committed digest, and the last completed rename is the current generation. Every generation is complete and schema-valid; no process may delete or edit another process's staging file. A platform without the required safe-open/atomic-replace semantics refuses publication.

Alternative considered: acquire a persistent lock for every current report. Locks introduce crash takeover and manual-recovery authority even though these reports are regenerable. Atomic linearized replacement provides the required integrity with less state.

### Publish topology receipts as immutable, exclusive files

For `APPEND_IMMUTABLE`, derive a filename from a bounded sortable time component, the admitted content digest, and a collision-resistant per-invocation token. Publish through a same-directory exclusive temporary file, verify bytes and identity, and commit with a no-replace operation. An existing destination is never overwritten, even if timestamps or digests match. A collision retries only with a new bounded token before any public success; exhaustion fails categorically.

The CLI may emit success only after the immutable receipt is durably committed and verified. `--no-receipt` remains an explicit non-publication mode and must not claim that a receipt exists. Discovery and retention of topology receipts stay bounded by existing policy; this change does not silently delete history.

Alternative considered: retain `${Date.now()}.json` and reject collisions. That prevents overwrite but creates avoidable availability failures under concurrency and provides no content binding.

### Treat durability as a qualified capability, not an unconditional claim

The shared publisher qualifies the filesystem operations needed by each profile. File flush, close, atomic replace/no-replace, and parent-directory flush are ordered explicitly. If a supported platform cannot provide one required primitive, the command returns `LOCAL_REPORT_PUBLICATION_UNSUPPORTED` and leaves the preceding report/history unchanged. It must not downgrade to a direct write.

Temporary files are non-authoritative. Stale temporary files are ignored by consumers and may be reported by bounded maintenance inspection, but a normal invocation removes only a temporary file whose identity and invocation token it owns. It never broadly cleans the directory.

### Make the inventory and bypass guard authoritative and non-vacuous

Add a structural hardening rule that combines CLI artifact metadata, persisted-schema declarations, the checked publication inventory, and source inspection. It fails when an ignored `artifacts/**` writer is unclassified, an inventory entry lacks a real caller/schema/profile/test owner, an inventoried caller directly invokes filesystem write/rename APIs for its publication, or a declared caller bypasses the shared publisher.

Mutation probes must alter each dimension independently: remove an inventory row, change a profile, reintroduce direct `writeFileSync`, skip schema/size admission, allow a symlink, drop exclusive create, replace immutable no-replace with rename, omit flush/verification, weaken mode, expose a raw path/error, and let a failed publish return success. Every probe must prove it changed bytes, fail the intended guard/test, and restore the original bytes.

### Verify real process behavior with external sentinels and fault injection

Focused helper tests cover malformed data, bounds, ancestry and leaf types, permissions, parent identity replacement, concurrency, collisions, and stale staging files. Child-process tests invoke every real CLI against isolated temporary repositories and explicit output roots. Ancestor/leaf symlinks point at sentinel files outside the fixture; every refusal must leave sentinel bytes and prior complete report bytes unchanged.

Injected faults cover create, partial write, flush, close, verify, replace/no-replace commit, and parent sync boundaries. Concurrent child processes prove current-report completeness and topology-receipt cardinality. Tests use synthetic values only and assert that stdout/stderr contain categorical errors without fixture paths or raw host messages.

## Risks / Trade-offs

- **Directory durability differs across platforms** -> qualify the exact supported primitive set and refuse publication rather than claiming durability after a partial fallback.
- **Atomic last-commit-wins current reports do not preserve every concurrent generation** -> current reports are explicitly regenerable snapshots; each caller receives its own digest and historical needs use `APPEND_IMMUTABLE` instead.
- **Parent identity checks cannot defend against an omnipotent same-user adversary** -> state the same-account threat boundary, minimize check/commit gaps, and require stable-identity verification without claiming sandbox isolation.
- **Explicit output paths expand the ancestry checked by the publisher** -> keep traversal bounded, reject unsupported roots/types, and preserve only deliberate regular-file selection.
- **Unique immutable receipt names change discovery assumptions** -> keep the `.json` glob and receipt schema stable, update tests/consumers to parse content rather than infer identity solely from a millisecond filename.
- **Strict private modes can differ from existing report permissions** -> create every committed inode at `0600`; report a refusal where the platform cannot prove the mode.
- **A killed process can leave a staging file** -> staging is uniquely named and non-authoritative; normal runs neither consume nor broadly remove it.

## Migration Plan

1. Add the checked seven-caller inventory and failing structural/mutation probes without changing writers.
2. Implement the shared publisher, schema/size admission, safe path walk, both profiles, categorical errors, and fault-injection seams.
3. Add helper and child-process adversarial tests, including external sentinels, concurrent current writers, topology collisions, permissions, and every persistence boundary.
4. Migrate the five fixed report writers and change-intelligence to `CURRENT_REPLACE`; preserve their payload schemas and established explicit-output behavior.
5. Migrate gate-topology to `APPEND_IMMUTABLE`, update receipt discovery for the new filename shape, and prove one immutable receipt per successful concurrent invocation.
6. Enable the bypass guard and non-vacuous mutation registry, then run focused suites, bin/root typechecks, schema/hardening rules, validation-universe, local gate, and clean-checkout certification.
7. Update architecture/operator truth and integrate through an owned C-00 session only.

Rollback may disable an affected command while preserving already committed artifacts. It must not restore direct truncating writes or make an immutable topology receipt replaceable. Existing valid `current.json` files and timestamp-only topology receipts remain readable historical artifacts; migration does not rewrite them.

## Open Questions

- Which current platform set can prove parent-directory flush and no-replace commit with the Node runtime used by Nightwatch? Resolve through synthetic qualification before enabling each profile on that platform.
- Should explicit output paths outside the repository be retained for every report command or narrowed by individual CLI contracts? Preserve current intentional behavior for this change; any removal is a separately reviewed CLI compatibility decision.
