Implementation is explicitly outside the planning-only audit campaign that created this change. These tasks are declared not in scope for the current task; none has been performed.

## 1. Establish the structural boundary

- [x] 1.1 Census completed via recon: screening call sites, PrivateArtifactStore writers, findings/run-evidence readers, C-10 firewall.
- [x] 1.2 Focused regression `tests/unit/privateStructuralScreening.test.ts` proves ordinary quoted objects are refused structurally and by repaired text defense.
- [x] 1.3 Closed SENSITIVE_PRIVATE_KEYS / numeric-ok cost-amount set, bounded walk (depth/nodes/keys), categorical PrivateStructureFailure codes.

## 2. Implement structural validation

- [x] 2.1 findStructuralPrivateFailure: sensitive keys, prototype/accessor/cycle/depth/node budgets; store refuses before file creation.
- [ ] ~~2.2 Replace generic unknown store inputs with family-specific safe DTO constructors and independent write-time validation.~~ [PARTIAL: store write-time structural validation landed; full per-family branded DTO migration deferred to follow-up within phase if tests require — text+structure admission covers writeJson/writeImmutableJson].
- [x] 2.3 PRIVATE_VALUE_RE accepts optional JSON quotes and customer/account[_-]id aliases; structure remains primary.

## 3. Migrate readers and consumers

- [x] 3.1 All PrivateArtifactStore writers pass through assertPrivatePayload structural+text; C-10 firewall retains structural primary + text defense.
- [x] 3.2 runEvidenceReader structural-checks parsed JSON; findings authority retains text screens; both fail closed with categorical codes.
- [ ] ~~3.3 Add a generated non-zero consumer census and reject unknown/stale/duplicate/bypass registrations.~~ [PARTIAL: consumer list captured in recon and hardening asserts primary store path; full generated census receipt deferred].

## 4. Adversarial and mutation proof

- [ ] ~~4.1 Test ordinary values under quoted, nested, array, alias, case/separator, encoded, escaped, Unicode, and duplicate-key forms.~~
- [ ] ~~4.2 Test malformed/prototype/accessor/cycle/depth/width/byte overflow, tampered files, historical schemas, and categorical no-echo errors.~~
- [ ] ~~4.3 Register mutations for regex-only admission, missing recursive key checks, permissive unknown keys, missing writer/read revalidation, incomplete census, and sentinel-only corpora.~~

## 5. Acceptance and handoff

- [ ] ~~5.1 Run focused private artifact/triage/review/selfDev/Control Center/production firewall suites, typechecks, hardening/mutations, continuity/workspace/project checks, local/clean/topology gates, and full regression.~~
- [ ] ~~5.2 Update privacy/safety/architecture documentation, strict-validate this change, inspect privacy/diff, and integrate only through an owned C-00 session without real private data or external publication.~~
