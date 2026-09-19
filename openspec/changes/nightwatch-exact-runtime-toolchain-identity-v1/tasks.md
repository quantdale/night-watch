Implementation is explicitly outside the planning-only audit campaign that
created this change. These tasks are declared not in scope for the current
task; none has been performed.

## 1. Freeze the runtime-toolchain contract

- [ ] ~~1.1 Under explicit implementation-session authority, select the exact
  supported Node/npm versions and platform artifacts from fresh reviewed
  upstream evidence; record provenance without placing machine paths or
  network responses in tracked data.~~
- [ ] ~~1.2 Add the owned-key `nightwatch.runtime-toolchain.v1` manifest schema
  with exact semantic versions, bounded platform/architecture entries, full
  integrity identities, review provenance, and canonical toolchain IDs.~~
- [ ] ~~1.3 Add strict parser/canonicalizer tests for valid entries and for
  unknown, duplicate, missing, malformed, unsupported, non-canonical,
  major-only, range, wildcard, channel, and alias values.~~

## 2. Observe and admit an already provisioned toolchain

- [ ] ~~2.1 Implement a read-only toolchain observer that resolves the current
  or explicit owner-local Node/npm pair without shell text and bounds every
  version/integrity read.~~
- [ ] ~~2.2 Refuse symlinked, irregular, unreadable, ambiguous, wrong-platform,
  version-mismatched, and integrity-mismatched toolchains with fixed safe
  reason codes.~~
- [ ] ~~2.3 Prove the observer returns one canonical identity containing no
  executable/cache/home path, username, environment value, registry data, or
  raw command output.~~
- [ ] ~~2.4 Add callback-spy tests proving every refusal occurs before
  dependency installation or quality-gate execution.~~

## 3. Remove moving clean-gate bootstrap

- [ ] ~~3.1 Delete `resolveNode20Toolchain`'s
  `npm exec --yes --package=node@20` path and replace it with exact local
  manifest admission.~~
- [ ] ~~3.2 Return structured `TOOLCHAIN_UNAVAILABLE` and
  `TOOLCHAIN_MISMATCH` clean receipts with install/gate marked not run.~~
- [ ] ~~3.3 Preserve disposable local cloning, exact source HEAD, no
  `node_modules` reuse, `npm ci --ignore-scripts`, clean-before/after checks,
  bounded cleanup, safe child environment, and structured receipt authority.~~

## 4. Bind CI to the same exact identity

- [ ] ~~4.1 Update the authoritative workflow's setup-node input to the exact
  manifest version and add pre-install runtime-toolchain verification.~~
- [ ] ~~4.2 Extend workflow hardening to parse the exact selector, compare it
  with the manifest, and reject major/range/wildcard/channel/alias or divergent
  values.~~
- [ ] ~~4.3 Reconcile this workflow edit with the full-SHA action identities
  required by `nightwatch-ci-action-supply-chain-integrity-v1`; neither control
  may weaken or substitute for the other.~~

## 5. Make receipts attest exact toolchain parity

- [ ] ~~5.1 Extend the quality-gate and clean-receipt schemas with exact Node
  version, exact npm version, platform, architecture, manifest-entry digest,
  observed integrity digest(s), and stable toolchain ID.~~
- [ ] ~~5.2 Require field-for-field canonical identity equality between inner
  and outer clean receipts and make missing/malformed/disagreeing identity
  non-PASS.~~
- [ ] ~~5.3 Bind executed CI evidence to the same identity and preserve
  `nodeMajor` only as non-authoritative derived compatibility data.~~
- [ ] ~~5.4 Add privacy-contract tests proving paths, environment, raw output,
  and unbounded upstream metadata cannot enter receipts or diagnostics.~~

## 6. Adversarial and mutation proof

- [ ] ~~6.1 Add focused positive tests proving one exact manifest identity is
  admitted and reaches identical inner/outer PASS receipts.~~
- [ ] ~~6.2 Add negative tests for selector drift, exact-version disagreement,
  Node/npm digest drift, unsupported platforms, unsafe paths, missing receipt
  fields, and inner/outer or clean/CI disagreement.~~
- [ ] ~~6.3 Register non-vacuous real-surface mutations for a `20` workflow
  selector, changed/removed integrity, reintroduced `node@20` fallback,
  verifier-after-install ordering, omitted receipt identity, and parity bypass;
  prove detection and byte-for-byte restoration.~~

## 7. Maintenance, documentation, and certification

- [ ] ~~7.1 Document explicit owner-local provisioning and manual rotation:
  provenance review, atomic manifest/workflow update, focused/mutation tests,
  fresh clean evidence, and fresh exact-head CI evidence.~~
- [ ] ~~7.2 Update reproducibility, CI hardening, onboarding, validation-lane,
  release-condition, project-state, and continuity surfaces without relabeling
  historical receipts.~~
- [ ] ~~7.3 Run focused tests, `npm run hardening:check`,
  `npm run hardening:rules`, `npm run validation:universe`, root and bin
  typechecks, `npm run gate:local`, and the exact-toolchain clean gate.~~
- [ ] ~~7.4 Strict-validate this change, inspect the privacy and dependency
  surface, integrate only through the owned C-00 session, and record the real
  exact-head CI result without projecting absent execution.~~
