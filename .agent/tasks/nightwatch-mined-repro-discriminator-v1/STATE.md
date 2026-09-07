# STATE — nightwatch-mined-repro-discriminator-v1

CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2
Status: COMPLETE
Next: terminal — await orchestrator review and integration. Do NOT push to
`main`; do NOT run `nightwatch-session integrate`.

## Waypoints

- Session claimed (`sess-d14ab6544225`); `session:status` prints
  `class=OWNED_SESSION`; base `d2aa960c` clean.
- Implemented: `containedTestReplay.ts` (new engine), `case.ts`
  (`minedReplay` hidden descriptor), `minedCases.ts` (descriptor builder),
  `hunt.ts` (executor branch + grounding gate + audit + dossier wiring),
  `huntDossier.ts` (neutral mined dossier), `index.ts` (barrel exports),
  `tests/unit/containedTestReplay.test.ts` (21 tests, all offline).
- Final validation: `typecheck` PASS, `hardening:check` PASS, all four
  acceptance files 53/53 PASS, no test deleted or weakened.
- Real ouchan replay: `REPRODUCED` / `PRE_FAIL_POST_PASS` in 73 s
  (pre FAIL exit 1, post PASS exit 0); sibling `status --porcelain` /
  `worktree list` / `HEAD` diff IDENTICAL pre/post. Scratch spec deleted.
- Two in-flight defects found and fixed: absolute-path hole in the
  descriptor parser; `git archive` unfaithful under `export-ignore`
  (→ batched-`show` materialization + regression test); `go?` regex
  misparse in go.mod toolchain selection.
- `node_modules` symlink (offline validation aid) restored as-found; see
  REPORT. Worktree holds only owned-path changes; committed on the
  session branch; NOT integrated.
- No blockers. No out-of-ownership change.
