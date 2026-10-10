Implementation is explicitly outside the planning-only audit campaign that
created this change. These tasks are declared not in scope for the current
task; none has been performed.

## 1. Freeze and verify action identities

- [ ] ~~1.1 Under explicit implementation-session authority, resolve the intended
  `actions/checkout` and `actions/setup-node` v4 releases to reviewed full
  upstream commit SHAs and record release-to-SHA provenance without adding a
  runtime network lookup.~~
- [ ] ~~1.2 Define the exact two-entry action allowlist with strict
  owner/repository and 40-lowercase-hex commit validation, duplicate refusal,
  and no tag/branch/abbreviation representation.~~
- [ ] ~~1.3 Replace both authoritative workflow tag refs with the reviewed full
  SHAs and retain non-authoritative human-readable version comments.~~

## 2. Exact workflow action parser and hardening

- [ ] ~~2.1 Implement a bounded parser for executable workflow `uses:` entries
  that returns exact identities and line locations and fails closed on
  unsupported YAML/action forms.~~
- [ ] ~~2.2 Replace `checkPhase23QualityGate`'s unanchored substring regex with
  exact parsed-inventory comparison against the governed allowlist.~~
- [ ] ~~2.3 Require exactly one checkout action and one setup-node action, and
  reject missing, duplicate, reordered-if-order-is-authoritative, additional,
  local, Docker, reusable-workflow, or malformed action entries.~~
- [ ] ~~2.4 Preserve the existing two-run-command bound, read-only permissions,
  Node 20 qualification, offline gate, forbidden authenticated/private paths,
  and exact-head CI classification behavior.~~

## 3. Adversarial proof

- [ ] ~~3.1 Add focused positive tests for the exact reviewed pins and
  non-vacuous two-entry parsed inventory.~~
- [ ] ~~3.2 Add negative tests for tags, branches, abbreviated/uppercase/malformed
  SHAs, SHA suffixes, owner/repository lookalikes, subpaths, comments posing as
  entries, duplicate/missing/additional actions, local actions, Docker actions,
  and reusable workflows.~~
- [ ] ~~3.3 Add a registered real-source mutation probe that changes one valid
  full SHA to another well-formed SHA and prove detection plus byte-for-byte
  restoration.~~
- [ ] ~~3.4 Add a registered historical-regression probe using a lookalike owner
  or suffixed ref that the old substring regex accepted, and prove the new rule
  rejects it.~~
- [ ] ~~3.5 Verify probe enumeration is non-vacuous and that comment-only or
  no-match mutations cannot count as detected action-identity probes.~~

## 4. Maintenance and validation

- [ ] ~~4.1 Document the manual action-update procedure: upstream release
  review, full-SHA provenance, atomic workflow/allowlist update, negative
  matrix, local/clean gates, C-00 integration, and fresh exact-head CI
  observation.~~
- [ ] ~~4.2 Run the focused workflow/Phase 23 tests, `npm run hardening:check`,
  `npm run hardening:rules`, `npm run validation:universe`, and
  `npm run typecheck`.~~
- [ ] ~~4.3 Run `npm run gate:local` and a fresh Node 20 `npm run gate:clean`;
  inspect receipts, privacy surface, workflow diff, and action inventory.~~
- [ ] ~~4.4 Strict-validate this OpenSpec change, reconcile current project/task
  truth, integrate only through the owned C-00 session, and record the actual
  exact-head CI result without projecting an unexecuted run as evidence.~~
