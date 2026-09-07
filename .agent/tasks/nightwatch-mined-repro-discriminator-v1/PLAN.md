# PLAN — nightwatch-mined-repro-discriminator-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: IN_PROGRESS

## Steps

1. Verify background (done): `createPreFixViewExecutor` returns
   `NOT_AVAILABLE` when `discriminator === null`; `tryDefineMinedBenchmarkCase`
   computes hidden `knownFailingTest`; target case `mobingilabs/ouchan`
   `5985281b43cd` with test
   `services/billingd/services/billingsvc/childbillinggroup_test.go`,
   `vendor/` present, `go1.25.3` installed. Fix archive is ~287 MB, so the
   engine materializes blob-by-blob with batched `git show` reads (`git archive` was rejected after the real ouchan run proved in-tree `export-ignore` silently drops go.mod/services; see REPORT).
2. Implement `src/core/benchmark/containedTestReplay.ts`:
   `MinedTestReplayDescriptor` + strict parser, `runContainedTestReplay`
   (validate → resolve parent → stream two trees → copy added test into
   pre tree → bounded `go test` per tree → classify → cleanup in
   `finally`), injectable `runPackage` for offline tests, secret-scrubbed
   truncated stderr head (harness-side only).
3. Wire discriminator: `case.ts` accepts/validates/freezes optional
   `minedReplay` (malformed → throw; descriptor secrets re-asserted absent
   from visible blobs); `minedCases.ts` builds it from the isolated
   `knownFailingTest`; `hunt.ts` executes it on `RERUN_SAFE_REPRODUCTION`
   when no visible discriminator exists, behind the file-grounding gate,
   with neutral reasoner-visible bytes; `huntDossier.ts` gains a neutral
   mined-replay dossier; `index.ts` re-exports.
4. Write `tests/unit/containedTestReplay.test.ts` (fabricated git repos,
   injected runners, one shell-script fake-`go` for the timeout path):
   all verdict branches, materialization contents, timeout, cleanup, no
   sibling mutation, hunt-level leak + grounding-gate tests.
5. Run targeted tests, `typecheck`, `hardening:check`; fix fallout.
6. Real ouchan replay via a temporary scratch spec (deleted afterwards):
   record command, wall time, verdict, stderr head in REPORT.md; prove the
   sibling unmutated.
7. Write REPORT.md, commit on the session branch, stop (no integrate/push).

## Decisions

- `INCONCLUSIVE` maps to `NOT_REPRODUCED`, `ENVIRONMENT_BLOCKED` maps to
  `NOT_AVAILABLE` on the reasoner-visible tool result (frozen vocabulary).
- Timeouts classify as `INCONCLUSIVE` (toolchain ran, no signal), never as
  a reproduction.
- A passing run with no test executed (`no test files`) classifies as
  `ENVIRONMENT_BLOCKED`, never as a pass (a vacuous pass must not mint
  `NOT_REPRODUCED` credit).
- Visible discriminators keep strict precedence over mined replay in the
  executor (existing behavior byte-identical when a discriminator exists).
