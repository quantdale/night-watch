# Final Completion and L6 Containment Report

Task ID: nightwatch-final-completion-and-l6-containment-v1
Phase: FINAL-COMPLETION-AND-L6-CONTAINMENT-V1
Status: COMPLETE
Terminal outcome: `PROJECT_COMPLETE_LOCAL_CLEAN_CERTIFIED`
CONTINUITY_PROTOCOL_VERSION: `nightwatch.agent-continuity.v2`
PHASE_FINAL_COMPLETION_AND_L6_CONTAINMENT_V1_STATUS: `COMPLETE`

This report contains only repository-local, synthetic and categorical release
evidence. It contains no credentials, customer values, runtime findings or
external product evidence. The predecessor's `PROJECT_NOT_COMPLETE_BLOCKED`
state is preserved as history because its L6 proof was incomplete.

## Repository and SHA roles

- Starting SHA: `6743401eabdbf1d3eca1d87a2dbdc3fc8cd53a20`.
- Substantive implementation checkpoint: `e278da19f5fbc62107528033716f271cbb64e1de`.
- Release/documentation checkpoint used for certification: `2576c5751d33bb40046246e8fcf57c7cc5c30a57`.
- Final documentation SHA: discovered from Git; it is a documentation-only
  descendant of the release checkpoint.
- CI-observed SHA: `2576c5751d33bb40046246e8fcf57c7cc5c30a57`.
- CI-executed SHA: `NONE`.
- Branch/remote: `main` / `origin`; final push is fast-forward and local
  `HEAD == origin/main`.

## Whole-repository audit

The fresh NUL-safe audit read and hashed every regular tracked path. At the
final pre-closure audit there were `1391` tracked, `1391` reviewed, `1391`
regular, `0` non-regular and `0` missing paths; total bytes were `15234494`
and LF lines `304156`.

- Path manifest digest: `sha256:5331fa6254cf9f370d41f4fddaf4a7cc1270f743eea144253185af4a54e46856`.
- Pre-closure content manifest digest:
  `sha256:fc3801e790d2f6758c8c1bdb35aaf3493289baee916553d69ba54161045ab471`.
- Role counts: agent-continuity `460`; config `26`; corpus-fixture `112`;
  durable-doc-history `66`; gate-tooling `57`; root-metadata `2`;
  runtime-source `413`; test `241`; UI `14`.
- Aggregate discovery scans covered markers `80/33` files; skip/retry/only/
  fixme/slow `653/225`; suppressions `4/4`; process launch `391/116`;
  network primitives `366/84`; filesystem/path safety `2679/384`;
  lifecycle `232/57`; authority/currentness `18838/1130`; secret-like terms
  `2786/418`; dynamic evaluation `69/46`. These are search-surface counts,
  not defects.
- The predecessor audit's `1372` paths reconciled to `1377` after its
  checkpoint additions, `1389` after successor planning, and `1391` after
  the two L6 source/test paths. No unexplained tracked-path deletion remains.

## Material defects and repairs

1. **P1 — L6 process/DNS escape proof absent.** The old OOPS path used plain
   `spawn`, and Bubblewrap was only observed, not proven. The fix is the
   versioned rootless namespace/relay supervisor in `src/core/oops/l6.ts`,
   readiness-gated from OOPS execution. The L6 suite and full canonical,
   clean and isolated suites pass.
2. **P1 — M3/M8 and CI truth could contradict each other.** Project state now
   distinguishes terminal blocked, local-clean complete, and CI-certified
   complete; live, substantive, local, clean, observed-CI, executed-CI and
   documentation SHA roles are separate. Blocked-vs-complete and zero-step
   CI regressions pass.
3. **P2 — stale safety retries.** Authenticated and proxy smoke retries were
   removed; safety matrices run with retries `0` and pass.
4. **P2 — synthetic gate inventory drift.** Inventory now derives the fixed
   campaign test files from `package.json`; it reports `156` unique
   authoritative files and zero duplicate executions.
5. **P2 — Control Center static-file race.** Reads now use `O_NOFOLLOW`,
   descriptor-root confinement and pre/post inode/size/mtime checks; traversal
   and symlink regressions pass.
6. **P2 — UI toolchain advisories.** Vite is `6.4.3`, Vitest `3.2.7`, and
   the nested UI audit is clean. The root `vue@2.6.12` remains a direct
   dev-only legacy Vue 2 readiness fixture dependency; its sole low advisory
   has only a major Vue 3 fix and is non-runtime/non-blocking.
7. **P2 — current Chrome 151 screenshot deadlock.** A minimal synthetic
   reproduction timed out in Playwright's compositor but succeeded in `57ms`
   with `--disable-software-rasterizer`. The launch contract now selects that
   path and screenshot capture has a `10s` bound; the three canonical passive
   flows pass.
8. **P2 — journey action attribution/fixture defects.** The fixture's POST
   mutation route was shadowed by GET, and the action intent ended before
   delayed request events. Method-specific routing, visible/enabled checks,
   bounded `250ms` intent grace and current-Chrome forced-click handling now
   preserve the safety assertions; the interaction cone passes `35/35`.
9. **P2 — L6 relay-volume bound was declared but unenforced.** The parent now
   permits at most eight relay calls per contained runtime and terminates on
   the ninth; the dedicated regression passes `6/6` for the L6 suite.

No unresolved P0/P1 defect or blocking P2 release defect remains.

## L6 architecture and proof

The identity is `nightwatch.process-network-containment.v1` with control
protocol `nightwatch.l6-af-unix-control.v1`.

- Bubblewrap runs rootless with user, PID and network namespaces,
  `--as-pid-1`, `--die-with-parent`, `--new-session`, `--clearenv`, an exact
  parent Node runtime binding, and no external network interface. The view is
  a minimal read-only `/usr`, `/bin`, `/lib*`, `/etc`, `/proc` and `/dev`, with
  owner-only temporary/home mounts; no root, sudo, firewall, hosts/DNS or
  system-proxy mutation is used.
- The namespace-local proxy accepts only bounded fixed GET/upgrade forms. Its
  only parent authority is a permissioned inherited AF_UNIX socket carrying
  length-prefixed frames (maximum 64 KiB); requests, headers, responses and
  output are bounded, and relay volume is capped at eight calls. The parent
  callback invokes the existing Phase 5/L5 policy relay; it does not accept
  arbitrary socket-forward instructions or create a second destination policy.
- Direct qualification attempts `dns.lookup`, Node resolver calls against
  synthetic UDP DNS, synthetic TCP DNS, direct TCP, IPv6, IPv4-mapped IPv6,
  UDP, HTTP and HTTPS, plus a spawned grandchild. Parent TCP/DNS-TCP/UDP
  listeners receive zero direct hits. Only the fixed AF_UNIX HTTP and
  WebSocket-upgrade probe is allowed through the relay.
- Browser qualification launches the real Chrome helper inside the same L6
  envelope with a private profile, local proxy, resolver rules blocking
  `*.invalid`, DNS-prefetch/preconnect fixtures and background traffic. It
  proves the synthetic relay result, zero direct TCP/UDP hits and expected
  browser speculative containment. Full browser WebSocket data authority
  remains the existing L5 observer; L6 proves the synthetic upgrade bridge.
- Process-tree proof covers direct child, grandchild, parent death, relay loss,
  target crash, timeout, browser/helper startup, bounded output, process-group
  termination and temporary-directory cleanup. Unsupported/startup/relay/
  DNS/process-tree states project categorical blocked capability values and
  never fall back to uncontained authenticated execution.
- Authenticated OOPS creates no workspace or child until a fresh complete
  `READY` capability is asserted. Any readiness, relay, liveness or cleanup
  failure is fail-closed; successful results identify `L6_ROOTLESS_NAMESPACE`.

## Test and skip receipts

- Explicit unit command: `2570` passed, `13` skipped, `0` failed of `2583`,
  workers `1`, retries `0`, elapsed `4:48.78`, peak RSS `1486860 KiB`.
- Canonical command `npx playwright test --project=nightwatch --workers=1
  --retries=0`: `2604` passed, `13` skipped, `0` failed of `2617`, elapsed
  `4:29.19`, peak RSS `1507792 KiB`.
- Topology-correct isolated Node 20 command: `2604` passed, `13` skipped,
  `0` failed of `2617`, elapsed `4:46.53`, peak RSS `1397616 KiB`; fresh
  sibling-topology clone/install, private HOME/cache, clean before/after,
  no module/auth/finding reuse and sibling writes `0`.
- Semantic compatibility: `1923/1910/13/0` (total/passed/skipped/failed),
  22 phases and 142 files.
- Owner provenance: `91/91`; synthetic campaign: `72/72`; retry-free safety
  smoke: `8/8`; L6 focused suite: `6/6`; adversarial cone: `306/306`.
- Control Center server and authority cone pass; UI typecheck passes, UI
  tests are `11/11`, build verifier is `3` files / `259566` bytes with no
  external references, and browser qualification is `1/1`.

The default suite has 13 executed skip identities, with exact parity in the
canonical and isolated runs:

- `tests/unit/phase14ContractReport.test.ts:391` — `--snapshot builds a
  live inventory from the disposable source snapshot` (snapshot absent).
- `tests/unit/phase14FreshSourceAdmission.test.ts:87` — C3-01 through C3-07
  (seven fresh exact-snapshot tests; snapshot absent).
- `tests/unit/phase14FreshSourceAdmission.test.ts:196` — C3-10 through C3-13
  (four fresh currentness tests; snapshot absent).
- `tests/unit/selfDevSandboxConfinement.test.ts:160` — G, foreign-UID/chown
  capability unavailable to the unprivileged test process.

The all-file census also found four manual real-environment authorization
guards (`phase2c`, `phase4`, `phase5`, `phase7`); those tests are not part of
the default release suite and are explicit opt-in guards, not hidden local
behavior. There are no `.only` or `.fixme` tests and no safety-critical test
retry remains.

## Gate receipts and representative journeys

- `npm run typecheck`, `hardening:check`, `handoff:check`, `agent:check`,
  `project:check`, `quality-gate:spec` and `gate:inventory`: PASS on the
  clean release checkpoint. Agent history reports 62 strict-v2 tasks, 24
  historical-v1 warnings, strict errors `0`.
- Local quality gate at `2576c57`: all ten groups PASS; receipt
  `receipt:sha256:94f8c00ea1f09d81a5973947`; semantic `1923/1910/13/0`,
  owner `91`, synthetic `72`; wall `3:56.59`, peak RSS `1231420 KiB`.
- Clean Node 20 gate at `2576c57`: install and all ten groups PASS; clean
  receipt `clean-receipt:sha256:5459eedccc6e5c05eabf2786`; clean before/after
  true and no module/auth/finding reuse.
- `npm run scenario -- --env=local`: PASS in `8.55s`, peak RSS `244264 KiB`;
  local fixture journey and redacted evidence are complete.
- `npm run status:local` remains intentionally a local-readiness renderer and
  does not inspect persisted release checkpoints; `npm run project:check` is
  the release-truth authority.
- Representative Control Center cold start reports `0ms` and route batch
  `4ms` for seven synthetic routes; browser view qualification is green.
- Temporary clean clones, L6 runtime directories, browser profiles, test
  output and private HOME/cache roots were removed. No Nightwatch process,
  Bubblewrap namespace or relay remains after qualification.

## CI classification

The exact release-checkpoint observation is GitHub Actions run
`33190456115`, job `98914301082`, head
`2576c5751d33bb40046246e8fcf57c7cc5c30a57`. It completed `failure` in about
three seconds before runner provisioning; the job has `runner_id=0`, no
runner name, `steps=[]`, and no failure log. Recent exact-head pushes show
the same immediate zero-step pattern. This distinguishes an external
Actions runner/billing/platform restriction from a repository workflow step
failure. The workflow remains checkout → Node 20 → `npm ci --ignore-scripts`
→ `npm run gate:ci`; it was not rewritten or retried.

Accordingly, CI is not called PASS and `CI_EXECUTED_SHA` remains `NONE`.

## Repository hygiene and remaining work

The two remote planning branches, `plan/nightwatch-control-center` and
`plan/nightwatch-repo-local-integrations`, contain only historical planning
documents and no unique unsuperseded implementation. They are preserved as
remote history; deletion is unnecessary and was not authorized by repository
policy. No generated/private/authenticated artifact is tracked.

Remaining work: `NONE` within the authorized product scope. GitHub Actions
requires a future runner-provisioned exact release-checkpoint observation to
become CI-certified; that external condition does not block this truthful
local/clean certification.
