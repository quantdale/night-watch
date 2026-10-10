## Context

Nightwatch currently treats `Node 20` as sufficient certification identity.
The GitHub workflow passes `node-version: 20` to setup-node, while
`bin/quality-gate-clean.mjs` falls back from a non-20 host to:

```text
npm exec --yes --package=node@20 -- node -p process.execPath
```

That package is absent from `package-lock.json`, the selector can resolve a
different patch over time, and the command executes before the repository gate
that the clean lane is supposed to qualify. The outer clean receipt records
only `nodeMajor: 20`; the inner gate receipt records no exact Node/npm
identity. Consequently two different toolchains can yield receipts that claim
the same reproducibility class.

This change is cross-cutting but local: it governs the executable toolchain
used by CI and clean-checkout certification. It does not govern product
runtimes, Alphaus environments, or arbitrary developer commands.

## Goals / Non-Goals

**Goals:**

- Make one versioned repository manifest the authority for exact Node and npm
  identities on each supported certification platform.
- Prove the selected executable and package-manager identity before dependency
  installation or gate execution.
- Eliminate moving runtime/package resolution from the clean gate.
- Bind clean and CI receipts to the exact same safe toolchain identity.
- Make major-only selectors, integrity drift, fallbacks, and receipt omission
  mechanically detectable and mutation-tested.
- Keep intentional toolchain rotation manual, reviewable, and atomic with its
  validation evidence.

**Non-Goals:**

- Vendoring Node/npm binaries in Git.
- Building a general package manager, automatic updater, downloader, or
  dependency bot.
- Pinning the mutable GitHub-hosted runner image; runner capability remains a
  separately reported host property.
- Replacing `package-lock.json` or npm package integrity checks.
- Executing CI, downloading a runtime, or choosing future exact versions in
  this planning campaign.
- Granting authenticated, product, sibling-write, cloud, or publication
  authority.

## Decisions

### Use one data-only toolchain manifest as the certification authority

Add a small versioned manifest, provisionally
`config/runtime-toolchain.v1.json`, with an exact semantic Node version and a
bounded entry for every supported certification platform/architecture. Each
entry binds at least:

- platform and architecture;
- exact Node version;
- full SHA-256 of the Node executable/distribution identity used by the
  verifier;
- exact npm version and an integrity identity for the npm CLI payload;
- a stable toolchain ID derived from the canonical entry; and
- review provenance and a review date suitable for human maintenance, without
  embedding credentials or local paths.

The manifest uses an owned-key, fail-closed schema. Unknown, duplicate,
missing, malformed, unsupported-platform, or non-canonical fields are errors.
The concrete digest subject (binary bytes versus reviewed distribution
artifact) must be stated by the schema and cannot vary by lane.

Alternative considered: retain `20.x` and merely record `process.version`.
That observes drift after it occurs but does not define which runtime is
authorized, cannot prevent a moving pre-gate download, and permits CI/clean
disagreement. It is rejected.

### Admit only an already provisioned, exact-match toolchain

The clean wrapper may use its current Node/npm pair or an explicitly supplied
owner-local executable root. Before `npm ci`, it resolves paths without shell
text, refuses symlinks/non-regular or ambiguous targets, hashes the governed
payloads with bounded reads, checks exact versions, and compares the canonical
observed identity with the manifest entry.

If no exact match is present, the wrapper returns a structured
`TOOLCHAIN_UNAVAILABLE`/`TOOLCHAIN_MISMATCH` result and runs neither install nor
gate. It must not invoke `npm exec`, `npx`, curl, a package registry, a version
manager, or any other automatic runtime resolver. Provisioning remains an
explicit owner action outside the certification command.

Alternative considered: pin `node@<exact-patch>` in `npm exec`. This still
executes an unverified bootstrap package outside the project lockfile and
turns certification into a network/cache-dependent install. It is rejected.

### Bind workflow selection to the same manifest, while separating action code

The workflow's setup-node input must be the exact version from the manifest,
not a major, range, wildcard, channel, or alias. Repository hardening parses
and compares that value to the manifest. The job then runs a pre-install
toolchain verifier before `npm ci` and the gate includes the resulting identity
in its receipt.

`nightwatch-ci-action-supply-chain-integrity-v1` separately pins the
`actions/setup-node` implementation to a full commit SHA. Both controls are
required: an immutable setup action does not make a mutable `node-version: 20`
exact, and an exact Node input does not pin the action code that installs it.

### Put exact safe identity in both inner and outer receipts

Define one canonical safe identity record containing exact Node version, exact
npm version, platform, architecture, manifest-entry digest, observed-integrity
digest(s), and stable toolchain ID. It contains no filesystem path, registry
response, environment value, username, or raw command output.

The quality-gate receipt and clean wrapper receipt both carry the record. The
outer wrapper rejects a missing inner identity, a schema mismatch, or any
field/digest disagreement. CI evidence is valid only when the same admitted
identity appears in the executed gate receipt. `nodeMajor` may remain only as
derived compatibility data; it is never sufficient authority.

### Guard the contract with structural validation and non-vacuous mutations

Focused tests cover manifest parsing, canonicalization, current/external
toolchain admission, unsupported platforms, exact version and digest
mismatches, symlink/irregular paths, no-install-on-refusal, receipt parity, and
safe diagnostics. Hardening and the mutation registry must detect at least:

- exact workflow version changed to `20`, `20.x`, `latest`, or another range;
- manifest Node or npm integrity changed/removed;
- `npm exec --package=node@20` or an equivalent moving fallback reintroduced;
- verifier moved after `npm ci` or omitted;
- exact identity removed from either receipt; and
- clean/CI or inner/outer toolchain identities made inconsistent.

The positive control proves one exact admitted identity reaches a PASS receipt;
negative probes must prove install and gate callbacks were not reached.

### Rotate toolchains as a single reviewed certification change

An update selects an exact supported Node/npm pair through an owner-authorized
review, records upstream provenance and integrity, updates the manifest and
exact workflow input together, runs focused negative/mutation tests, obtains a
fresh clean receipt, then obtains fresh exact-head CI evidence. Old receipts
remain historical evidence bound to their former toolchain ID and are never
relabeled.

## Risks / Trade-offs

- **Local clean validation becomes less convenient when the admitted runtime
  is absent** → fail with a precise owner action and document explicit
  provisioning; never make a certification command an implicit installer.
- **Binary or npm payload digests can differ across platforms** → admit only
  explicit platform/architecture entries and fail closed elsewhere; do not
  normalize unknown packaging.
- **A compromised runtime may lie about its version** → combine version output
  with integrity over governed bytes and execute no project install before the
  comparison.
- **Hashing the executable does not attest the host kernel or shared
  libraries** → keep host capability/topology evidence separate and avoid
  claiming full machine reproducibility.
- **Exact pins require maintenance** → use a visible review date and bounded
  manual update procedure; staleness is surfaced, never auto-remediated.
- **Two active changes touch the workflow** → implement the CI-action pinning
  change first or reconcile both in one authorized implementation session;
  strict requirements from both remain mandatory.

## Migration Plan

1. In a future authorized implementation session, choose the exact supported
   Node/npm pair and record reviewed platform integrity evidence.
2. Add the manifest schema/parser and focused malformed/unsupported tests.
3. Add the read-only toolchain observer/admission core and safe identity type.
4. Update the workflow to its exact version and add the pre-install verifier.
5. Replace the clean wrapper's `node@20` resolver with exact local admission
   and structured fail-closed results.
6. Add identity to inner/outer receipts and enforce equality.
7. Add hardening rules and mutation probes, then run the required local and
   clean validation cone.
8. After CI-action pins are also in place, integrate through C-00 and obtain a
   fresh exact-head executed CI receipt.

Rollback may restore the previous fully admitted manifest entry and exact
workflow version. Rollback to a major-only selector, moving resolver, or
receipt without exact identity is forbidden.

## Open Questions

- Which exact Node/npm version and platform artifact digests are current and
  owner-approved at implementation time? Resolve from fresh reviewed upstream
  evidence; this planning campaign intentionally does not use network
  authority to select them.
- Which stable npm CLI payload is hashed across the supported Node
  distribution layout? The implementation must choose one deterministic,
  documented subject and prove it on every admitted platform before expanding
  support.
