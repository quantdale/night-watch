# SPEC — nightwatch-unused-dep-removal-v1

## Frozen intent

Remove the unused `vue@2.6.12` devDependency (the repository's only
`npm audit` finding: GHSA-5j4c-8p2g-v4jx ReDoS, LOW) plus its lockfile
entries. Zero references to `vue` exist anywhere in code or configs
(verified by repo-wide grep), so the module never loads and removal
cannot change behavior.

## Hard boundaries (frozen)

`package.json` devDependencies + `package-lock.json` only; no source,
test, config, or docs changes except this task's own record; no
force-push; no history rewrite. C-00 worktree discipline throughout.

## Declared deletions

None (dependency manifest entries only; no tracked source files).

## Acceptance (frozen)

- `vue` absent from `package.json` and `package-lock.json`;
  `npm audit` reports zero vulnerabilities.
- `npm ci`, `tsc --noEmit`, offline scenario run green in the worktree.
- `hardening:check`, `agent:check`, `project:check`, `handoff:check`
  green. Integrated to `origin/main`, session released, worktree
  removed, task COMPLETE with REPORT.
