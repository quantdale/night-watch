# Audit — repository master hardening implementation

`docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` inventoried the whole tracked
repository at review baseline `1942ea37757bbb914de6281f505ee6118b5c67f0` and
closed as `REVIEW COMPLETE — execution has not started`. This change executes
its findings register. Inspected before freeze, and re-verified against live
source at `0ac7b3d037b5059f670eca715fc30adaf58e7334`:

- `bin/nightwatch-session.mjs` — the only surface that mutates worktree,
  branch or ownership state. `commandStart` inspects the *current* topology
  and creates the worktree before the candidate registration is modelled;
  `checkWorktreeMetadata` (`bin/workspace-integrity.mjs:437`) compares
  `worktrees.length > maxWorktrees` over worktrees that already exist. A
  failed ownership-record write returns with the branch and worktree already
  created. NW-06.
- `src/core/agentProtocol/validate.ts`, `.../tools.ts`,
  `src/core/autonomousFinding/dossier.ts` — closed vocabularies built with
  `Object.fromEntries` and queried by truthiness, so prototype-inherited
  names pass membership and `lookupAgentTool` returns an inherited function.
  The frozen `nightwatch.agent-protocol.v1` intent, termination-reason,
  severity, environment and confidence vocabularies are the trust boundary
  the reasoner writes into. NW-01.
- `src/core/policy/privateArtifacts.ts`,
  `src/core/prodEvidence/productionFindingsStore.ts` — derive repository and
  workspace roots from `__dirname`, so the same configured path is rejected
  from the canonical checkout and accepted from an external linked worktree.
  Worktree-location independence exists elsewhere (`DEFAULT_SIBLING_ROOT`,
  `NIGHTWATCH_REPOS_ROOT`, enforced by `hardening:check`) but was not adopted
  here. NW-02.
- `src/core/bugAtlas/snapshot.ts` — checks the directory leaf then calls
  `writeFileSync` directly on the destination, so a configured
  `../escape.json` writes outside the state root and an existing leaf symlink
  is followed. NW-03.
- `src/core/agentRuntime/localCampaign.ts` — truncates the destination then
  chmods it, reads unbounded before decoding, and can delete an existing
  same-ID checkpoint before new durable progress exists. Established
  immutable evidence and review stores already use stronger staged
  no-replace patterns; this mutable store was written separately. NW-04.
- `src/api/phase5/relay.ts` — default `fetch` receives no `AbortSignal`; a
  `Promise.race` timeout rejects without aborting upstream work; auth-header
  acquisition sits outside the timer and a redirect gets another full
  timeout. NW-05.
- `src/controlCenter/server/sse.ts` — caps client count but ignores
  `response.write(false)`, so one stalled consumer accumulates queued bytes.
  NW-12.
- `bin/nightwatch-control-center.mjs` — the shipped launcher builds a default
  collector without `reviewAuthority` and a server without `reviewDecision`,
  so the supported review capability exists only as library injection.
  Existing browser tests inject authority directly and do not exercise the
  shipped path. NW-09.
- `ui/control-center/src/api.ts`, `.../App.tsx` — server endpoints accept
  cursors and expose continuations, but the loaders request only limits, so
  records beyond the first page of each view are unreachable.
  `fetchSnapshot` checks a schema-version prefix then casts, fetches carry no
  signal or deadline, and every SSE event increments a shared refresh key
  without burst coalescing. NW-10, NW-11.
- `src/browser/fixtures/storageState.ts` — the JSON catch wraps the native
  parser message, which on current Node carries a prefix of the malformed
  input. NW-13.
- quality-gate manifests, `package.json`, UI scripts,
  `.github/workflows/hardening.yml` — explicit manifests selected 208 unique
  ordinary test files at the fixed baseline while 321 tracked
  `.test.ts`/`.smoke.ts` files existed. The live tree now has more, because
  W10 added focused tests. Group inventory validates declarations against
  each other, never against the discovered universe. NW-08.
- `.agent/ACTIVE_TASK.md`, programme records, `docs/CURRENT_STATE.md`,
  `docs/DECISIONS.md`, `docs/ROADMAP.md` — five central documents interleave
  current and historical truth, and decision identities D-29 through D-34 are
  duplicated. NW-07.
- root and UI manifests — a Vue 2.6.12 development fixture emits a
  deprecation warning; root TypeScript excludes the UI and the bin JavaScript,
  so those need their own lanes. NW-14.

Consumed, not re-executed: NW-15, the W10 reproduction-surface wave, complete
and certified at implementation `62d23e2622ab0a282584c5cf27d92b6b603f9192`
and documentation `ec3eacf61c1b5bd3557eaf90594aecb2cd633b4f`.

Gap: no prospective worktree admission, no own-key vocabulary closure, no
single topology-aware private-path authority, no confined Atlas publication,
no atomic generation-bearing campaign checkpoint, no end-to-end relay
deadline, no per-client SSE bound, no shipped review opt-in, no client
pagination, no discovered-universe validation accounting.
