# Task State

## Identity

Task ID: nightwatch-deployment-fact-binding-c08-v1
Phase: DEPLOYMENT_FACT_BINDING_C08_V1
Status: COMPLETE
Starting SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
Last validated implementation SHA: 777ddb14fd367f2d9ae8f8ac68c89092bd784713
Last substantive checkpoint SHA: 777ddb14fd367f2d9ae8f8ac68c89092bd784713
Live HEAD authority: GIT
Current local/remote HEAD: DISCOVER_FROM_GIT
Branch: session/nightwatch-deployment-fact-bindi-9d9f8b7b
Last checkpoint: exact-head GitHub run 33801673312 at 70b8225 passed all eleven required groups on Node 20 with receipt receipt:sha256:745edcfc991cc6b37da54233; gate:local receipt:sha256:c31e7af0e0975c9676fa57b4 and gate:clean PASS with inner receipt receipt:sha256:9fca6a784b64e4bc81d6204f and siblingWrites 0; canonical regression 3,489/3,476/13/0; 1,851 operations bound to 1,851 bindings with 0 positive route-to-endpoint DEPLOYMENT_FACTs, which is the honest answer while the mochi manifests are unavailable; 11/11 negative probes detected; DEF-C08-1 and DEF-C08-2 both repaired
CONTINUITY_PROTOCOL_VERSION: nightwatch.agent-continuity.v2

STARTING_SHA: 43cff07af2fe2c943ca62154ad01f185602a41d9
LAST_VALIDATED_IMPLEMENTATION_SHA: 777ddb14fd367f2d9ae8f8ac68c89092bd784713
LAST_SUBSTANTIVE_CHECKPOINT_SHA: 777ddb14fd367f2d9ae8f8ac68c89092bd784713
LAST_DOCUMENTATION_CHECKPOINT_SHA: 70b822517d164154c9d0bfb2bd53cec72d1b0fbd
LIVE_HEAD_AUTHORITY: GIT
FINAL_CI_AUTHORITY: GITHUB_ACTIONS_FOR_RELEASE_CHECKPOINT
PROJECT_VERDICT_EFFECT: PRESERVE

## Objective

Give every source operation an explicit deployment-binding classification, so
that "we do not know where this runs" is a recorded fact naming the missing
hop rather than an absent field.

## Current Milestone

COMPLETE / STOP — M1 through M8 are closed and all nine acceptance rows PASS.
Certified by exact-head CI run 33801673312 at `70b8225`.

## Completed Milestones

- M1 — task record, OpenSpec change, session claim, measured evidence survey.
- M2 — the binding model: an explicit three-hop chain, the six-state
  vocabulary, and C-15b's `FACT_CATEGORIES` reused rather than duplicated.
- M3 — build-exclusion extractor, the one real deployment-evidence source,
  admitted only in the NEGATIVE direction.
- M4 — host-matrix extractor, classified SOURCE_FACT, with same-file `const`
  literals resolved so `${APP_PATH}` becomes the `ripple` the file proves.
- M5 — totality over all 1,851 operations; U-1 and U-2 explicit with their
  blocker.
- M6 — evidence identity and STALE behaviour on digest, SHA or extractor
  version change.
- M7 — hardening rule, 11 negative probes, and the no-authority proof; found
  and repaired DEF-C08-1 and DEF-C08-2.
- M8 — integrated by verified fast-forward; exact-head CI PASS at `70b8225`
  with the predicted +2 CI skips confirmed; project truth reconciled; session
  released.

## Work In Progress

NONE — the campaign is COMPLETE.

## Exact Next Action

STOP — C-08 is COMPLETE and certified. The next authorized campaign in this
overnight portfolio is C-09 spec-derived expectations. C-08b is
`C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS` and cannot be started.

## Files Changed

- `.agent/tasks/nightwatch-deployment-fact-binding-c08-v1/{SPEC,PLAN,STATE,REPORT}.md` — new
- `openspec/changes/nightwatch-deployment-fact-binding-c08-v1/**` — new
- `.agent/ACTIVE_TASK.md`, `.agent/EXECUTION_PROMPT.md` — routed to C-08

## Validation Ledger

| Check | Result |
|---|---|
| `npm run session:status` (canonical, pre-start) | PASS |
| operation population at 43cff07 | 1,851 — blueapi 1,181 / ouchan 341 / ripple-api 223 / wave-api 55 / blueinternal 51 |
| `ouchan/services/` service count | 131 |
| mochi repository present at depth ≤ 2 | **NO** |
| any `ingress.yaml` under the sibling root | **NONE** |
| any `appproxy` / `serviceproxy` directory | **NONE** |
| `remote.origin.url` mentioning mochi across ~160 repositories | **NONE** |
| the two `mochi*` paths found | `blueinternal/mochi/v1`, `blue-internal-go/mochi/v1` — protobuf for a SERVICE named mochi, not the manifest repository |
| `ouchan/build/config.yaml` | present; per-branch build EXCLUSIONS over `qa` / `next` / `production`, `build_all: false` |
| `ripple-ui/src/config/common.js` | present, 8,989 bytes; route-prefix × environment → host matrix |
| U-2 services in `ouchan/services/` | `rbac` PRESENT, `user` PRESENT, `openid-connect-server` PRESENT, `gateway` ABSENT, `safe-box` ABSENT |
| `ouchan/kubeconf-dev.yaml` | exists; top-level key shape observed only, NO value read, and deliberately not used |
| **binding totality** | 1,851 operations to **1,851 bindings**, `totalityHolds: true` |
| **byState** | UNKNOWN 1,851; EXACT / PARTIAL / UNSUPPORTED / STALE / AMBIGUOUS all 0 |
| **positive route to endpoint DEPLOYMENT_FACTs** | **0** — the honest answer with the manifests unavailable |
| operations with a proven build unit | **341 of 1,851** (all ouchan, derived from their own source path) |
| unknown-reason distribution | `NO_PROVEN_CLIENT_FAMILY_BINDING` 1,851 (hop 1); `C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS` 2,192 (hop 2 for all, hop 3 for the 341); `NO_PROVEN_SERVICE_IDENTITY` 1,510 |
| ouchan operations excluded from the production build | **0** — no product service producing operations is excluded; the mechanism is proven non-vacuous by unit test against a service that IS excluded |
| `tests/unit/c08DeploymentBinding.test.ts` | **32 passed / 0 failed** |
| negative probes D1-D11 | **11/11 DETECTED**, all restored, tree clean after each |
| **canonical regression** at `777ddb1` | **3,489 total / 3,476 passed / 13 skipped / 0 failed**, 0 failure blocks |
| **`gate:local`** at `777ddb1` | **PASS, eleven groups**, receipt `receipt:sha256:c31e7af0e0975c9676fa57b4`; synthetic lane 799/799 |
| **`gate:clean`** at `777ddb1` | **PASS, eleven groups**, Node 20, `siblingWrites: 0`, `cleanBefore/cleanAfter: true`; inner `receipt:sha256:9fca6a784b64e4bc81d6204f`, outer `clean-receipt:sha256:dbc28a42418230b5e5b4d68a` |

## Decisions Made During This Task

- The `ripple-ui` host matrix is SOURCE_FACT, not DEPLOYMENT_FACT: it is
  committed CLIENT configuration saying what the frontend calls, which is a
  different claim from what the infrastructure serves. Consequence: the
  positive route→endpoint `DEPLOYMENT_FACT` count may legitimately be zero.
- The binding is an explicit three-hop CHAIN, not one flat state, because the
  campaign's real product is knowing WHICH hop is missing.
- Only the NEGATIVE direction is admitted from build exclusions: exclusion on
  a branch proves not-deployed-there, while non-exclusion proves eligibility
  and not deployment.

## Defects found

**DEF-C08-1 — a hardening rule could not tell `RegExp.exec` from process
`exec`. PRE_EXISTING and latent.** The source-cone purity rule matched
`/exec(?:File)?\s*\(/` with no lookbehind, so `pattern.exec(...)` read as
process execution — while the sibling rule eighteen lines above already spells
it `(?<!\.)exec`. It stayed hidden because the loop skips `siblingSource.ts`,
the only file in `src/core/source/` that used `.exec()`, and no other module in
the cone did. C-08 added the first two that do and the rule fired on correct
code. Repair: the lookbehind is added and `child_process` joins the
alternation so tightening `exec` cannot weaken the rule; both directions
re-proven with a bare `spawn(` and a `writeFile(`.

This also explains why the pre-commit hardening run passed: the loop iterates
GIT-TRACKED files, and both modules were still untracked, so the check was
vacuous for them. Committing is what exposed it — a second instance of the
"verify, do not assume" lesson from C-05.

**DEF-C08-2 — my own C-08 rule matched a comment instead of the declaration.
CAMPAIGN_INTRODUCED, caught by its own probe.** The rule asserted each
forbidden basis with a whole-file `includes()`, and `CLIENT_CONFIGURATION` is
also named in the prose explaining why it is forbidden — so emptying the array
left the check passing on the very comment documenting compliance. The C-02b
rule already records this exact trap ("Read the DECLARATION, not the file"), so
the repository knew the answer and I did not apply it. Repair: the rule
extracts the `Object.freeze` array and strips comments before testing
membership.

Two flaws in the binding module itself, both caught before shipping:
`repository.split('/').pop()` as the service name — `SERVICE_NAME_SIMILARITY`
wearing a deployment fact's label, which would have produced a spurious
`NOT_DEPLOYED` for `mobingilabs/reportd`; and
`serviceDirectoryFromSourcePath` accepting `..`, since a dot matches the
directory character class, so `services/../etc/passwd` yielded `..` as a build
unit that could be matched against an exclusion pattern to fabricate a
deployment fact. The second was caught by this campaign's own test.

## Discoveries

- The route → runtime-endpoint chain breaks at a nameable place:
  `route ──SOURCE_FACT──▶ host ──U-1──▶ k8s service ──U-2──▶ deployed?`, and
  both unknowns share the single blocker of an unavailable `mochi`.
- Two of U-2's five named services are absent from `ouchan/services/`
  entirely, which constrains deployment without settling it.

## Blockers

None for C-08. C-08b is `C08B_BLOCKED_BY_ORGANIZATIONAL_ACCESS`, which C-08
records as the reason U-1 and U-2 stay UNKNOWN rather than working around.

## Safety Events

NONE

## Deferred / Follow-Up

C-08b owns U-1 and U-2 and is blocked. C-13's precondition is therefore unmet,
which C-08 records rather than circumvents.

## Resume Recipe

Task complete. Do not resume; any follow-up starts as a new authorized task.

## Completion Snapshot

C-08 is COMPLETE and certified.

Substantive implementation anchor: 777ddb14fd367f2d9ae8f8ac68c89092bd784713
Certified exact-head checkpoint: 70b822517d164154c9d0bfb2bd53cec72d1b0fbd
Live HEAD: DISCOVER_FROM_GIT
Tests: canonical regression 3,489 / 3,476 / 13 skipped / 0 failed; semantic
compatibility 2,033 / 2,020 / 13 / 0; synthetic campaign 799/799 locally and
799 / 762 / 37 skipped / 0 failed in CI; the new `c08DeploymentBinding` suite
32/32.
Artifacts: `src/core/source/deploymentBinding.ts` (three-hop chain, six-state
vocabulary, totality); `src/core/source/deploymentEvidence.ts` (two bounded
extractors with their classifications asserted at the source);
`checkC08DeploymentBindingBoundary`.
Known issues: none introduced. U-1 and U-2 remain UNKNOWN, which is correct
and blocked on organizational access; C-13's precondition is therefore unmet
and that is recorded rather than worked around. Hop 1 needs an axios
client-family extraction that C-08 deliberately did not guess.
Recommended next task: C-09 spec-derived expectations.
