# C-08 Deployment-Fact Binding — Report

- Starting SHA: `43cff07af2fe2c943ca62154ad01f185602a41d9`
- Resulting SHA: Live HEAD: DISCOVER_FROM_GIT
- Substantive implementation anchor: `777ddb14fd367f2d9ae8f8ac68c89092bd784713`
- Certified exact-head checkpoint: `70b822517d164154c9d0bfb2bd53cec72d1b0fbd`, run `33801673312`
- Task objective: give every source operation an explicit deployment-binding
  classification, so that not knowing where something runs is a recorded fact
  naming the missing hop rather than an absent field.
- Safety events: NONE
- Remaining blockers: none for C-08. C-08b is
  `C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS`.
- Recommended next phase/task: C-09 spec-derived expectations.

## The finding

Every operation carried `deploymentStatusUnresolved: true`, typed as the
literal `true`, so it could never say anything else. It looked like an answer
and conveyed nothing: an operation investigated and found unknowable was
indistinguishable from one nobody had looked at. An unrecorded unknown is the
shape a guess hides in, and the campaigns after this one want to make requests.

## What the evidence supports, measured before designing anything

**The `mochi` manifests are not locally available.** Verified four independent
ways: no repository named `mochi` at depth ≤ 2, no `ingress.yaml` anywhere
under the sibling root, no `appproxy` or `serviceproxy` directory, and no
`remote.origin.url` mentioning mochi across ~160 repositories. The two
`mochi*` paths are `blueinternal/mochi/v1` and `blue-internal-go/mochi/v1` —
protobuf for a SERVICE named mochi, not the manifest repository. So U-1 and
U-2 stay UNKNOWN carrying `C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS`, and per §76
no further effort was spent seeking access.

**`ouchan/build/config.yaml` is real deployment configuration**, and supports
only the NEGATIVE direction. Per-branch exclusions over `qa` / `next` /
`production` prove a service is not built or deployed to that environment from
this repository at this revision. `build_all: false` means non-exclusion
implies ELIGIBILITY, so the positive direction stays unknown.

**`ripple-ui/src/config/common.js` is the host matrix, and it is SOURCE_FACT.**
This is the discipline the whole campaign turns on. The file is committed,
current, and names real hosts per environment, so it reads as authoritative —
while stating only what the FRONTEND CALLS. What the infrastructure SERVES is
a different proposition, and the gap between them is exactly where a stale or
rerouted deployment hides. Classifying it `DEPLOYMENT_FACT` would be the §34
error, so `CLIENT_CONFIGURATION` is a named forbidden basis.

**`ouchan/kubeconf-dev.yaml` was never read.** Only its top-level key shape was
observed; no value was read, and no cluster was contacted.

## The result

| Measure | Value |
|---|---|
| operations | 1,851 |
| bindings | **1,851** — `totalityHolds: true` |
| state distribution | UNKNOWN 1,851; EXACT / PARTIAL / UNSUPPORTED / STALE / AMBIGUOUS all 0 |
| **positive route → endpoint `DEPLOYMENT_FACT`s** | **0** |
| operations with a proven build unit | 341 of 1,851 (all ouchan) |
| `NO_PROVEN_CLIENT_FAMILY_BINDING` (hop 1) | 1,851 |
| `C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS` (hops 2, 3) | 2,192 |
| `NO_PROVEN_SERVICE_IDENTITY` (hop 3) | 1,510 |
| ouchan services excluded from the production build | 0 |

**Zero is the honest answer**, and the acceptance criteria were written so that
reporting it PASSES while manufacturing a non-zero count from client
configuration FAILS. The unknown-reason distribution is the real product: hop 1
is unknown for a nameable reason, hop 2 is blocked for all 1,851, and the 341
operations with a proven build unit are blocked at hop 3 rather than
unclassified.

## Why hop 1 is unknown, precisely

The matrix is keyed `apiUrl.<brand>.<family>.<env>` with families `basic`,
`blue`, `login`, `auth`. C-04 proved which frontend call site reaches which
backend operation, but NOT which axios client instance that site uses, so
nothing ties an operation to a family. Matching `baseApi` to `basic` by name
would be `SERVICE_NAME_SIMILARITY`. The hop stays unknown and the missing
extraction is named rather than approximated.

Same-file `const` literals ARE resolved, because that is provable: `const
APP_PATH = 'ripple'` makes `/m/${APP_PATH}` provably `/m/ripple`. A template
naming anything not declared in the file stays a wildcard.

## The build unit comes from the file, not the name

An operation whose source path is `services/reportd/handler.go` is defined in
the `reportd` directory, and the exclusions are keyed on exactly those names.
All 341 ouchan operations are under `services/<dir>/`, so the derivation is
total for that repository. It is deliberately NOT read as C-03's
`protoServiceIdentity`, which records that the daemon directory "is never a
join key" because `services/blued` registers six proto services.

## Defects

| ID | Class | Summary |
|---|---|---|
| DEF-C08-1 | PRE_EXISTING | A source-cone purity rule matched `/exec(?:File)?\s*\(/` with no lookbehind, so `pattern.exec(...)` read as process execution — while the sibling rule 18 lines above already spells it `(?<!\.)exec`. Latent because the loop skips the only file in the cone that used `.exec()`. |
| DEF-C08-2 | CAMPAIGN_INTRODUCED | My own C-08 rule asserted forbidden bases with a whole-file `includes()`, so emptying the array left it passing on the comment documenting compliance. The C-02b rule already records this trap; I did not apply it. |

Two flaws in the binding module were caught before shipping:
`repository.split('/').pop()` as the service name — `SERVICE_NAME_SIMILARITY`
wearing a deployment fact's label, which would have produced a spurious
`NOT_DEPLOYED` for `mobingilabs/reportd`; and
`serviceDirectoryFromSourcePath` accepting `..`, since a dot matches the
directory character class, so `services/../etc/passwd` yielded `..` as a build
unit that an exclusion pattern could match to fabricate a deployment fact. The
second was caught by this campaign's own test.

DEF-C08-1 also explains a process lesson worth keeping: the pre-commit
hardening run PASSED vacuously, because that rule iterates GIT-TRACKED files
and both new modules were still untracked. Committing is what exposed it — the
second instance this night of "verify, do not assume the check covered you".

## Validation

| Check | Result |
|---|---|
| `typecheck`, `hardening:check`, `handoff:check`, `project:check`, `agent:check`, `workspace:check` | all PASS |
| `tests/unit/c08DeploymentBinding.test.ts` | 32 passed / 0 failed |
| negative probes D1–D11 | **11/11 DETECTED**, all restored, tree clean after each |
| **canonical regression** at `777ddb1` | **3,489 / 3,476 / 13 skipped / 0 failed**, 0 failure blocks |
| **`gate:local`** at `777ddb1` | PASS, eleven groups, receipt `receipt:sha256:c31e7af0e0975c9676fa57b4`, synthetic lane 799/799 |
| **`gate:clean`** at `777ddb1` | PASS, eleven groups, Node 20, **`siblingWrites: 0`**, inner `receipt:sha256:9fca6a784b64e4bc81d6204f`, outer `clean-receipt:sha256:dbc28a42418230b5e5b4d68a` |
| **exact-head CI** | **PASS**, run `33801673312` at `70b8225`, eleven groups, Node 20, receipt `receipt:sha256:745edcfc991cc6b37da54233` |

## CI skip accounting

| `SYNTHETIC_CAMPAIGN` | total | passed | skipped | failed |
|---|---|---|---|---|
| `4e0bfc1` (post-C-05) | 767 | 732 | 35 | 0 |
| `70b8225` (certified) | 799 | 762 | **37** | 0 |
| delta | +32 | **+30** | **+2** | 0 |

The +2 is exactly the two sibling-gated cases — the real host matrix and the
real build config — predicted before the run and confirmed by it. 30 of the 32
new cases execute in CI.

## Requirement ledger

| # | Acceptance requirement | Status | Evidence |
|---|---|---|---|
| 1 | Every operation carries a binding record | PASS | 1,851 → 1,851, `totalityHolds: true` |
| 2 | No silent absence; totality enforced by regression | PASS | totality is structural (map over the population) and asserted; probe D4 |
| 3 | Every `DEPLOYMENT_FACT` traces to deployment evidence; forbidden bases probed | PASS | only build exclusions qualify, negatively; six forbidden bases declared; probes D1, D2, D11 |
| 4 | U-1 and U-2 explicit UNKNOWNs with their blocker, never inferred | PASS | typed `resolved: false`; blocker recorded; probe D3; manifest absence verified four ways |
| 5 | Evidence identity complete; changed artifact yields STALE | PASS | `{repoId, sourceSha, path, extractorVersion, digest}`; STALE on digest, SHA or extractor-version change |
| 6 | C-03 topology consumed, not rewritten | PASS | C-03 is read for service topology and its "never a join key" rule is honoured; the build unit comes from the operation's own source path instead |
| 7 | No execution or request authority, proven by probe | PASS | probe D6; both modules data-only; probes D7, D8 |
| 8 | Zero runtime contact | PASS | no production, NEXT or DEV request; no cluster, kubectl or cloud API; `kubeconf-dev.yaml` unread |
| 9 | Regression, local, clean and exact-head CI green; siblingWrites 0; released | PASS | all four green; `siblingWrites: 0`; session released |

Status: COMPLETE
