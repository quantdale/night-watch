# Credential-use binding successor v1 — Report

- Starting SHA: `d5175a7d676cbff5584b887363ceaa1d7d7b879f`
- Status: IN_PROGRESS
- Problem: generic login locators can be used after live document/form
  replacement.
- Changes: one-shot non-secret DOM/JS identity binding, form action/method/
  target capture, per-effect revalidation, categorical stale failure, and
  synthetic race tests.
- Validation: dev-login security 6/6; typecheck/hardening PASS; identity and
  form-action mutations detected in disposable archives; no real credential or
  target.
- Remaining: implementation checkpoint, broad gates, and reassessment. Dynamic
  listener coverage remains an explicit residual.
