# Tasks: Resolved Egress + Containment Truth Hardening

Status: IN_PROGRESS
Change ID: nightwatch-resolved-egress-and-containment-truth-hardening-v1
Planning baseline: 4981b212eed46ffde1edac2b175f1bd1b1f826d2
Target branch: main
Budget: approximately 12 productive engineering hours. Do not idle to fill time; do not stop early while Critical/High in-scope defects remain.

## 0. Takeover, identity, and continuity

- [x] Read AGENTS.md, .agent/PLANNER_HANDOFF.md, .agent/PLANS.md, .agent/ACTIVE_TASK.md, .agent/EXECUTION_PROMPT.md, and every file in this OpenSpec change.
- [x] Prove repository identity is quantdale/night-watch and target branch is main.
- [x] Fetch origin/main and reconcile current HEAD with planning baseline 4981b212eed46ffde1edac2b175f1bd1b1f826d2.
- [x] If main moved, inspect every intervening diff before implementation and update the task Decision Log for any scope impact.
- [x] Record clean/dirty state, upstream, Node/npm versions, OS, Playwright/Chrome availability, and current proxy port policy.
- [x] Create continuity-v2 task files under .agent/tasks/nightwatch-resolved-egress-and-containment-truth-hardening-v1/: SPEC.md, PLAN.md, STATE.md, REPORT.md.
- [x] Route .agent/ACTIVE_TASK.md to the new task as ACTIVE.
- [x] Preserve completed predecessor tasks/history unchanged.
- [x] Record exact starting SHA and safety authority: LOCAL / repository source / synthetic loopback only.

## 1. Hard H0 whole-repository audit before source edits

Do not substitute the planner's remote tree inventory for the local all-file gate.

- [x] Generate a NUL-safe git ls-files manifest.
- [x] Read/classify EVERY tracked regular file.
- [x] Record tracked file count.
- [x] Record reviewed file count.
- [x] Require reviewed == tracked.
- [x] Record total tracked bytes and total lines.
- [x] Record a deterministic manifest/content digest.
- [x] Classify every file into active runtime, tests, config, UI, corpus/fixtures, tooling/bin, workflow, docs/OpenSpec, continuity/history, generated/lock/metadata, or other explicit class.
- [x] Deep-read every active browser/proxy/safety/evidence/real-run consumer and producer.
- [x] Review all historical .agent/docs paths for stale instructions that could override current execution, without treating historical prose as runtime logic.
- [x] Search TODO/FIXME/HACK/XXX/DEPRECATED markers and disposition every active-code hit.
- [x] Search test.skip/test.only/describe.skip/describe.only and record exact current skip inventory.
- [x] Search ts-ignore/expect-error/eslint-disable/unsafe cast/eval/new Function/shell:true/child_process and disposition every active containment-path hit.
- [x] Search every network primitive: http/https request, fetch, net.connect/createConnection, dns lookup/resolve, Playwright browser launch/proxy, WebSocket, UDP/dgram, child process.
- [x] Search every proxy event/summary/runtime-state reader.
- [x] Search every browser-containment-contract and real-run-gate consumer.
- [x] Search every environment allowlist/host classifier consumer.
- [x] Re-review all files changed since planning baseline before editing.
- [x] Check open issues/PRs/current docs again; record whether any new competing blocker exists.
- [x] No source edit until H0 and baseline evidence are checkpointed in STATE.

Planner baseline reference only: 1,334 tracked blobs / 14,615,257 bytes at 4981b212....

## 2. Baseline validation and truth capture

Before production behavior changes:

- [x] npm run typecheck
- [x] npm run hardening:check
- [x] focused tests/unit/proxy.test.ts
- [x] focused tests/unit/safety.test.ts
- [x] focused realRunGate tests
- [x] focused runRecorder/evidence proxy tests
- [x] tests/smoke/proxy.smoke.ts using repository-native command/config
- [x] capture current OUTBOUND_POLICY_VERSION
- [x] capture current ProxyRuntimeState shape
- [x] capture current ProxyEvent / ProxySummary shape
- [x] capture existing browser launch args from src/browser/contract.ts
- [x] capture exact pass/skip/fail counts
- [x] capture focused wall time
- [x] record any pre-existing failures separately; do not attribute them to this campaign.

## 3. Mandatory reproductions before fixes

Add failing/red-team tests first. Planner findings are hypotheses until executable paths prove them.

### 3.1 Resolver invocation boundary

- [x] Inject/spy a synthetic resolver around startOutboundProxy without granting it socket authority.
- [x] Prove hostname-policy deny invokes resolver exactly zero times.
- [x] Prove telemetry/optional-support/browser-background local blocks invoke resolver zero times.
- [x] Prove an allowed hostname reaches the resolver.
- [x] Prove current code has no resolved-address admission before the Node upstream primitive.
- [x] Record BEFORE results.

### 3.2 Local address-class matrix

Using only injected resolver results:

- [x] 127.0.0.1 positive control.
- [x] ::1 positive control.
- [x] 127.0.0.2 negative control.
- [x] 0.0.0.0 negative.
- [x] 169.254.0.0/16 edges.
- [x] RFC1918 range edges.
- [x] CGNAT/shared range edges.
- [x] multicast edges.
- [x] documentation/benchmark/reserved representative boundaries.
- [x] :: unspecified.
- [x] IPv6 link-local.
- [x] IPv6 unique-local.
- [x] IPv6 multicast.
- [x] IPv6 documentation/reserved.
- [x] IPv4-mapped IPv6 variants including mapped loopback/private/global cases.
- [x] malformed address strings.
- [x] family/address mismatch.
- [x] duplicate answer forms.
- [x] empty set.
- [x] oversized answer set.

Record the current behavior and the target behavior for each.

### 3.3 Mixed-answer fail-closed proof

- [x] safe + unsafe.
- [x] global + private.
- [x] loopback exact + alternate loopback.
- [x] valid + malformed.
- [x] IPv4 safe + IPv6 unsafe.
- [x] permutations of the same multiset.
- [x] Require target policy result invariant under answer order.
- [x] Require zero upstream connections for every mixed-invalid case.

### 3.4 Protocol matrix

For each relevant resolver case exercise:

- [x] HTTP absolute-form forward request.
- [x] safe origin-form HTTP request if supported.
- [x] CONNECT.
- [x] WebSocket Upgrade.
- [x] WSS path through CONNECT semantics where existing fixture architecture supports it without TLS MITM.
- [x] Assert equivalent resolution-policy verdicts.

### 3.5 Exact-dial reproduction

Build a test seam that can observe the host/family passed to the upstream connector without external network.

- [x] Current allowlisted hostname path shows hostname reaches implicit Node lookup/dial path.
- [x] Target test requires numeric address reaches dial path.
- [x] Original hostname remains Host/CONNECT authority.
- [x] No second resolver call occurs after accepted resolution.
- [x] Record BEFORE failing assertion before implementation.

### 3.6 Evidence-truth reproduction

- [x] hostname allow + resolver error.
- [x] hostname allow + unsafe address.
- [x] hostname allow + connect refusal.
- [x] hostname allow + connect timeout.
- [x] Show current event/summary semantics.
- [x] Define desired policyAuthorized/resolutionDenied/resolutionFailed/connected/connectFailed categories.
- [x] Ensure no raw error text is required.

### 3.7 Runtime identity reproduction

- [x] Construct current/old ProxyRuntimeState.
- [x] Show it can satisfy current state validation/real-run gate when policy version matches.
- [x] Add target test: hostname-only runtime identity must fail once resolved-egress binding is required.

## 4. Implement resolved-address classifier

Create the smallest pure owning module.

- [x] Parse IPv4 exactly.
- [x] Parse IPv6 exactly.
- [x] Normalize IPv4-mapped IPv6.
- [x] Classify unspecified.
- [x] Classify exact loopback.
- [x] Classify private/unique-local.
- [x] Classify link-local.
- [x] Classify CGNAT/shared.
- [x] Classify multicast.
- [x] Classify documentation.
- [x] Classify benchmark/testing.
- [x] Classify broadcast/reserved/special-use.
- [x] Classify global unicast.
- [x] Add boundary tests at start/end of each relevant CIDR, not only representative middle addresses.
- [x] Reject unsupported/ambiguous textual forms.
- [x] Avoid regex-only prefix classification.
- [x] Keep module pure: no DNS, filesystem, process, network, environment mutation.
- [x] Document standards/source rationale in code/docs without copying large external tables unnecessarily.

## 5. Implement owned resolver boundary

- [x] Define a narrow Resolver interface returning address/family records only.
- [x] Internal runtime owns the real resolver construction.
- [x] Tests can inject deterministic resolver records.
- [x] Page/product/candidate/config strings cannot inject code/callbacks.
- [x] Enforce maximum answer count.
- [x] Deduplicate normalized equivalents safely.
- [x] Reject malformed/family-mismatch results.
- [x] Define categorical resolver failures.
- [x] Add bounded logical completion/timeout behavior.
- [x] Be explicit if underlying OS lookup cancellation is not guaranteed.
- [x] IP literals skip unnecessary name resolution but still pass address policy.
- [x] Localhost cannot become external-DNS authority.
- [x] A policy-denied hostname exits before resolver call.

## 6. Implement resolved-address policy

- [x] local accepts exact 127.0.0.1 / ::1 semantics only.
- [x] local rejects alternate 127/8 aliases unless current config explicitly authorizes exact address.
- [x] dev/next/static external resolved addresses default to global unicast only.
- [x] reject private/link-local/unspecified/multicast/documentation/benchmark/reserved/special-use external destinations.
- [x] mixed answer sets fail closed.
- [x] no unsafe-answer filtering followed by safe dial.
- [x] no live DNS reconnaissance.
- [x] no invented Alphaus CIDR.
- [x] if real-environment private routing is required but unproven, fail closed and document owner-reviewed future policy requirement rather than weakening code.
- [x] Add stable policy version/identity.

## 7. Exact-address connection binding

Factor shared connection preparation; do not copy resolver policy into each handler.

### 7.1 HTTP

- [x] resolve/admit before upstream request.
- [x] bind request connection/lookup to accepted numeric address.
- [x] preserve original Host header.
- [x] prevent implicit second hostname resolution.
- [x] preserve method/path/header sanitation.
- [x] bounded error/timeout handling.

### 7.2 CONNECT

- [x] resolve/admit before net.connect.
- [x] net.connect receives numeric address and family.
- [x] original authority remains evidence/TLS identity.
- [x] no TLS MITM.
- [x] no resolver repeat.
- [x] bounded error/timeout handling.

### 7.3 WebSocket Upgrade

- [x] same resolution/admission helper.
- [x] numeric address dial.
- [x] original Host header preserved.
- [x] head bytes semantics preserved.
- [x] no resolver repeat.
- [x] bounded error/timeout handling.

### 7.4 Protocol differential

- [x] same input matrix -> same address-policy verdict across all three.
- [x] one shared unit owns address safety.
- [x] protocol framing stays outside address authority.

## 8. Sanitized lifecycle evidence and run truth

- [x] Define whether existing allow means policy authorization; document it.
- [x] Add categorical resolutionDenied count/outcome if absent.
- [x] Add resolutionFailed count/outcome if absent.
- [x] Add connected count/outcome if mechanically observable and useful.
- [x] Add connectFailed count/outcome if mechanically observable and useful.
- [x] Avoid false "connected" on mere socket creation.
- [x] Preserve existing denied hostname hard-failure path.
- [x] Make resolved-address denial a hard-failure path.
- [x] Ensure RunRecorder.syncProxyViolations sees the new containment violation.
- [x] Ensure summary passed cannot remain true after a resolved-address deny.
- [x] Ensure proxy.jsonl / summary contain no raw sensitive diagnostics.
- [x] Test authenticated-evidence file permission behavior remains correct.
- [x] Version any changed durable schema deliberately.
- [x] Update validators/readers/Control Center only if they consume the changed schema; no unrelated authority growth.

## 9. Runtime state and pre-real-run gate

- [x] Add/evolve resolved-egress containment identity.
- [x] tests/globalSetup emits it.
- [x] direct runner emits/uses the same contract.
- [x] runtime parser exact-validates it.
- [x] realRunGate requires it.
- [x] old runtime state fails.
- [x] malformed/newer unknown runtime state fails.
- [x] environment mismatch still fails.
- [x] proxy health still fails closed.
- [x] browser contract still proves all existing seven mandatory controls or an explicitly versioned stronger shape.
- [x] no authenticated state is loaded during this campaign.

## 10. Browser DNS residual qualification

This workstream is bounded and conditional.

- [x] Re-audit current Chrome launch args and docs residual.
- [x] Do NOT add resolver flags by guesswork.
- [x] Determine whether a zero-external-contact mechanical experiment can prove browser speculative DNS confinement.
- [x] If yes, build it entirely from local/synthetic fixtures/temp artifacts.
- [x] Verify mandatory proxy still carries normal synthetic traffic.
- [x] Verify denied synthetic destination still reaches zero upstream sockets.
- [x] Verify any new flag/control is present in direct runner and Playwright config through the shared contract.
- [x] If proof is not possible without external DNS/root/network namespaces, record BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL.
- [x] Do not implement Docker, namespaces, firewall, root networking, hosts-file mutation, or system DNS reconfiguration.

This workstream does not block completion if the residual remains truthfully documented; it blocks any claim of complete process-level isolation.

## 11. Adversarial hardening matrix

- [x] resolver returns same address repeated many times.
- [x] resolver order permutation.
- [x] resolver changes answer between separate requests.
- [x] ensure each request re-enters policy according to chosen design.
- [x] no stale global cache can silently preserve an invalidated answer.
- [x] address strings with whitespace/zone-id/alternate forms disposition.
- [x] IPv6 bracket handling.
- [x] hostname casing/trailing-dot/userinfo existing parser regressions.
- [x] unexpected ports.
- [x] connect-close races.
- [x] client disconnect during resolver wait.
- [x] proxy shutdown during resolver/dial.
- [x] resolver completion after logical timeout cannot create a late socket.
- [x] one protocol failure cannot crash proxy process.
- [x] event write failure disposition remains safe.
- [x] no unhandled rejection.
- [x] no new global mutable cross-test state.
- [x] no unbounded timers/listeners/answer accumulation.
- [x] no open handles after tests.

## 12. Focused validation after each slice

Run repository-native exact commands discovered from package.json/current docs. At minimum:

- [x] npm run typecheck
- [x] npm run hardening:check
- [x] tests/unit/proxy.test.ts
- [x] new resolved-address classifier tests
- [x] new resolver/binding tests
- [x] tests/unit/safety.test.ts
- [x] realRunGate tests
- [x] runRecorder/evidence tests
- [x] tests/smoke/proxy.smoke.ts
- [x] browser containment/contract tests
- [x] relevant privacy/redaction tests
- [x] git diff --check
- [x] no new skip/only markers

Fix every introduced Critical/High regression before advancing.

## 13. Full local acceptance cone

- [x] npm run typecheck PASS.
- [x] npm run hardening:check PASS.
- [x] npm run quality-gate:spec PASS if current repository uses it in acceptance.
- [x] npm run test:owner-provenance PASS.
- [x] npm run gate:inventory PASS.
- [x] npm run campaign:synthetic PASS where containment contract is consumed.
- [x] npm run test:semantic-compat PASS if shared durable identity changed.
- [x] npm run agent:check PASS.
- [x] npm run agent:audit PASS.
- [x] npm run project:check PASS.
- [x] npm run gate:local PASS.
- [x] npm run gate:clean PASS / repository current clean Node20 equivalent.
- [x] canonical complete serial Playwright regression PASS with exact test/skip/fail counts.
- [x] local browser outer-proxy synthetic smoke PASS.
- [x] built/UI gates only if a consumed DTO/schema actually changed.
- [x] no accidental test-results/artifacts/storage-state/credentials/private temp files tracked.
- [x] no unexplained performance regression.
- [x] record focused proxy before/after wall time and open-handle state.

## 14. Clean-checkout and topology proof

- [x] Create disposable clean checkout/worktree according to repository policy.
- [x] Use Node 20 baseline.
- [x] npm ci.
- [x] recreate only approved read-only sibling topology if current gate requires it.
- [x] run required clean gate.
- [x] run focused proxy/resolver suite in clean checkout.
- [x] prove no dependency on untracked local config, hosts file edits, DNS override, or developer machine state.
- [x] remove disposable state safely.

## 15. Identity / compatibility audit

For every changed identity record BEFORE -> AFTER -> reason -> consumers.

- [x] OUTBOUND_POLICY_VERSION changed only if hostname policy semantics changed.
- [x] resolved-address policy version.
- [x] proxy containment runtime identity.
- [x] ProxyEvent/ProxySummary durable shape/version if changed.
- [x] real-run contract identity if changed.
- [x] no unrelated source analyzer identity change.
- [x] no unrelated semantic/replay/dossier/campaign identity change.
- [x] old runtime state cannot masquerade as new containment state.
- [x] no compatibility shim weakens the new invariant.

## 16. Safety accounting

Final report must state exact counts/booleans for:

- [x] DEV contacts = 0
- [x] NEXT contacts = 0
- [x] production contacts = 0
- [x] live Alphaus DNS reconnaissance = 0
- [x] authenticated storage-state loads = 0
- [x] customer/data/datastore operations = 0
- [x] cloud/infra operations = 0
- [x] sibling repository writes = 0
- [x] publication/external findings = 0
- [x] runtime external AI/model calls = 0
- [x] Docker/network namespace/firewall/root networking changes = 0
- [x] force pushes = 0

## 17. Exact-head Git and CI truth

- [x] Commit only validated durable checkpoints.
- [x] Push main according to single-writer rules.
- [x] Verify origin/main == local HEAD.
- [x] If current policy requires exact-head Actions observation, inspect once after push.
- [x] Executed passing steps may be recorded as CI evidence.
- [x] steps=[] / null remains NO_STEPS_BILLING_OR_PLATFORM_BLOCK.
- [x] Never weaken workflow or retry churn solely to change external billing/platform state.

## 18. Durable closure

- [x] STATE updated at every durable milestone.
- [x] REPORT includes all-file audit counts/digest.
- [x] REPORT includes BEFORE reproductions and AFTER results.
- [x] REPORT includes address-class matrix.
- [x] REPORT includes protocol differential matrix.
- [x] REPORT includes evidence/summary semantics.
- [x] REPORT includes runtime identity migration.
- [x] REPORT includes browser DNS residual disposition.
- [x] REPORT includes every changed file and why.
- [x] REPORT includes exact test counts/skips/failures/timings.
- [x] REPORT includes safety accounting.
- [x] Update docs/SAFETY_MODEL.md for the exact new L5 invariant and remaining L6 residual.
- [x] Update docs/ARCHITECTURE.md, CURRENT_STATE.md, ROADMAP.md, DECISIONS.md only where durable truth changed.
- [x] Mark OpenSpec tasks complete only when evidence exists.
- [x] Set .agent/ACTIVE_TASK.md terminal COMPLETE with next action STOP.
- [x] Final push.
- [x] Stop. Do not auto-select another campaign in the executor session.

## Productive time-shape guidance

Suggested allocation, not a timer:

- hour 0-1.5: takeover + literal all-file audit + baseline
- hour 1.5-3: failing resolver/address/evidence reproductions
- hour 3-5: address classifier + resolver authority
- hour 5-7: exact-address binding across HTTP/CONNECT/WS + timeout/race repair
- hour 7-8.5: evidence/runtime gate/version integration
- hour 8.5-9.5: browser DNS residual qualification + adversarial matrix
- hour 9.5-11: full local/clean regression and repairs
- hour 11-12: docs/continuity/exact-head evidence/final push

If all acceptance is genuinely complete sooner, do not pad. If an in-scope Critical/High defect remains near the budget boundary, prefer truthful INCOMPLETE/BLOCKED state to false completion.
