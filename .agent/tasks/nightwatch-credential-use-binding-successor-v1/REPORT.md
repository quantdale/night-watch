# Credential-use binding successor v1 — Report

Status: COMPLETE

- Starting SHA: `d5175a7d676cbff5584b887363ceaa1d7d7b879f`
- Status: COMPLETE — focused implementation proof complete AND the broad residual is closed (2026-10-10)
- Problem: generic login locators can be used after live document/form
  replacement.
- Changes: one-shot non-secret DOM/JS identity binding, form action/method/
  target capture, per-effect revalidation, categorical stale failure, and
  synthetic race tests.
- Validation: dev-login security 6/6; typecheck/hardening PASS; identity and
  form-action mutations detected in disposable archives; no real credential or
  target.
- Broad validation: `gate:dev` completed with 5455 passed / 13 failed. Twelve
  are the known live-source drift set; one `reviewStore.test.ts` failure is a new
  parallel-shard temp-namespace race and passed in isolation. The clean
  `gate:milestone` replay passed every mandatory command step and completed with
  5456 passed / 12 failed; the temp race did not recur and no auth test failed.
- Remaining: preserve this blocked child. The successor loop selects shard temp
  isolation; dynamic listener coverage remains an explicit residual.

## Closure record (2026-10-10, parent campaign M13 task 14.2)

The BLOCKED status recorded above was accurate when written and is preserved
verbatim; it is closed here against receipts rather than rewritten:

- The blocker was the independently reproduced live-source drift set (12
  failures on the certified baseline), NOT a credential defect. The parent
  campaign's M3 live-source hermeticity work (tasks 4.1/4.2,
  `live-source-test-hermeticity-v1`) cleared it, and its own scope was closed by
  the M8 9.2 follow-through at `b98a48d58d512f5970cabe1242d38f11606840ac`.
- Closure receipts: `tests/unit/devCredentialEffectBinding.test.ts` 7/7;
  `tests/unit/devLoginSecurity.test.ts` 6/6; typecheck PASS; `hardening:check`
  PASS; the mutation guards (identity, form action, revalidation) each detected
  in disposable archives.
- NW-AUD-021 reconciliation: this successor narrows the original
  `dev-credential-use-binding-v1` (created `326c083f`). See audit.md's M13 14.1
  record.
