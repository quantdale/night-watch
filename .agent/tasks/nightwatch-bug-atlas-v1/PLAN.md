// Lane D plan (executed as built).

1. Claim session in the assigned worktree (done: sess-3a8164a5e0b5).
2. Survey frozen protocol (atlas/untrusted/versions) + repo cones
   (siblingSource, changeIntelligence/git, process/childEnvironment,
   hardening-check scopes) so the lane reuses engines and trips no cone.
3. Implement pure modules: types, sanitize, validate, store, fixtures.
4. Implement miner (pure parser + read-only git pass, DATA_BLOCKED taxonomy)
   and snapshot (owner-private JSON, 0700/0600, no SQLite — not installed and
   package-lock.json is frozen).
5. Acceptance tests in tests/unit/bugAtlas.test.ts (21 cases).
6. Typecheck + focused tests; probe real mining read-only; snapshot check.
7. Write REPORT.md, commit on session branch, yield with evidence.
