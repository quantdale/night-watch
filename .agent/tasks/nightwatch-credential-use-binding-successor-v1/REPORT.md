# Credential-use binding successor v1 — Report

- Starting SHA: `d5175a7d676cbff5584b887363ceaa1d7d7b879f`
- Status: IN_PROGRESS — implementation/focused proof complete; clean milestone replay pending
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
  parallel-shard temp-namespace race and passes in isolation. The first
  `gate:milestone` stopped at `project:check` because the strict OpenSpec repair
  was uncommitted, so it must be replayed from the clean checkpoint.
- Remaining: clean milestone replay, final child classification, and reassessment. Dynamic
  listener coverage remains an explicit residual.
