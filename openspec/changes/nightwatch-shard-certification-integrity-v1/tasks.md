## 1. Contract and reproduction

- [ ] 1.1 Freeze the receipt schema, bounds, categorical outcomes, and parser.
- [ ] 1.2 Add failing tests for all-skipped, zero-executed, null/unknown, and
      malformed receipts.
- [ ] 1.3 Preserve a normal mixed pass/skip control and current coverage/
      exclusivity assertions.

## 2. Implementation

- [ ] 2.1 Add a bounded atomic Playwright execution reporter.
- [ ] 2.2 Pass an owned receipt path to each shard and read it after exit.
- [ ] 2.3 Make receipt classification authoritative; retain text only as
      diagnostic output.
- [ ] 2.4 Refuse missing, malformed, unknown, zero-executed, and all-skipped
      receipts with stable categorical codes.

## 3. Adversarial protection

- [ ] 3.1 Test partial/oversized receipt writes, duplicate outcomes, malformed
      counts, and reporter failure.
- [ ] 3.2 Mutate away executed/unknown/atomic guards and prove detection.
- [ ] 3.3 Prove no test, assertion, skip, retry, coverage, or exclusivity
      behavior is silently weakened.

## 4. Validation and handoff

- [ ] 4.1 Run focused tests, `gate:dev`, and `gate:milestone`.
- [ ] 4.2 Strict-validate this change and reconcile task/report truth.
- [ ] 4.3 Commit through the owned C-00 session and reassess the next campaign.
