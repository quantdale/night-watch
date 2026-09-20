## Why

The retained local production-evidence compatibility modules have three lifecycle integrity gaps. Browser-profile cleanup authorizes recursive deletion from an absolute path whose basename merely starts with `nightwatch-prod-profile-`; stale sweeping likewise trusts names and age without a creation identity, liveness lease, ownership/type proof, or safe base binding. The findings store stages privately but `renameSync` can overwrite an existing finding, the file-count check races concurrent writers, and success is reported without parent-directory durability. Finally, the persistence audit silently ignores missing roots, directory/stat failures, and all files after its global 20,000-file budget, yet sets `clean` solely from recorded violations.

These paths are currently local/synthetic and real production observation remains owner-gated/frozen, which limits immediate reachability. They still encode the claimed privacy prerequisite: destructive cleanup must be capability-bound, findings must not silently replace history, and an incomplete audit cannot certify clean.

## What Changes

- Bind each ephemeral profile to an opaque generation/lease and verified owner-only base; cleanup removes only that exact inactive generation.
- Make stale sweep a classified inventory with liveness proof, safe path/type/ownership checks, bounded incompleteness, and no name-only deletion.
- Publish production findings as immutable, exclusive, content/identity-bound records with serialized capacity admission and file/directory durability.
- Make persistence audit completeness explicit for roots, traversal, files, bytes, budgets, errors, and profile inventory; only a complete admitted census can be clean.
- Add concurrent-process, alias/symlink, active-profile, overwrite, crash/durability, unreadable/missing, over-budget, and mutation proof using disposable local roots only.

## Capabilities

### New Capabilities

- `production-persistence-lifecycle-integrity`: Defines capability-bound profile cleanup, immutable findings publication, truthful complete persistence audits, concurrency/crash semantics, and destructive-path proof for the retained production privacy cone.

### Modified Capabilities

None.

## Impact

- Affects `src/core/prodEvidence/{browserProfile,productionFindingsStore,persistenceAudit}.ts`, C-10/C-11 consumers, and production privacy tests.
- Preserves the owner scope freeze and production authorization gates; implementation is local/synthetic only.
- Complements the projection/firewall payload contract and local report/run-evidence changes; it owns production-local lifecycle, deletion, immutable publication, and audit completeness.
