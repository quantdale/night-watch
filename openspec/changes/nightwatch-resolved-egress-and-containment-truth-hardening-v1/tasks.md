# Tasks: Resolved Egress + Containment Truth Hardening

Status: PLANNED
Change ID: nightwatch-resolved-egress-and-containment-truth-hardening-v1
Planning baseline: 4981b212eed46ffde1edac2b175f1bd1b1f826d2
Target branch: main
Budget: approximately 12 productive engineering hours. Do not idle to fill time; do not stop early while Critical/High in-scope defects remain.

## 0. Takeover, identity, and continuity

- [ ] Read AGENTS.md, .agent/PLANNER_HANDOFF.md, .agent/PLANS.md, .agent/ACTIVE_TASK.md, .agent/EXECUTION_PROMPT.md, and every file in this OpenSpec change.
- [ ] Prove repository identity is quantdale/night-watch and target branch is main.
- [ ] Fetch origin/main and reconcile current HEAD with planning baseline 4981b212eed46ffde1edac2b175f1bd1b1f826d2.
- [ ] If main moved, inspect every intervening diff before implementation and update the task Decision Log for any scope impact.
- [ ] Record clean/dirty state, upstream, Node/npm versions, OS, Playwright/Chrome availability, and current proxy port policy.
- [ ] Create continuity-v2 task files under .agent/tasks/nightwatch-resolved-egress-and-containment-truth-hardening-v1/: SPEC.md, PLAN.md, STATE.md, REPORT.md.
- [ ] Route .agent/ACTIVE_TASK.md to the new task as ACTIVE.
- [ ] Preserve completed predecessor tasks/history unchanged.
- [ ] Record exact starting SHA and safety authority: LOCAL / repository source / synthetic loopback only.

## 1. Hard H0 whole-repository audit before source edits

Do not substitute the planner's remote tree inventory for the local all-file gate.

- [ ] Generate a NUL-safe git ls-files manifest.
- [ ] Read/classify EVERY tracked regular file.
- [ ] Record tracked file count.
- [ ] Record reviewed file count.
- [ ] Require reviewed == tracked.
- [ ] Record total tracked bytes and total lines.
- [ ] Record a deterministic manifest/content digest.
- [ ] Classify every file into active runtime, tests, config, UI, corpus/fixtures, tooling/bin, workflow, docs/OpenSpec, continuity/history, generated/lock/metadata, or other explicit class.
- [ ] Deep-read every active browser/proxy/safety/evidence/real-run consumer and producer.
- [ ] Review all historical .agent/docs paths for stale instructions that could override current execution, without treating historical prose as runtime logic.
- [ ] Search TODO/FIXME/HACK/XXX/DEPRECATED markers and disposition every active-code hit.
- [ ] Search test.skip/test.only/describe.skip/describe.only and record exact current skip inventory.
- [ ] Search ts-ignore/expect-error/eslint-disable/unsafe cast/eval/new Function/shell:true/child_process and disposition every active containment-path hit.
- [ ] Search every network primitive: http/https request, fetch, net.connect/createConnection, dns lookup/resolve, Playwright browser launch/proxy, WebSocket, UDP/dgram, child process.
- [ ] Search every proxy event/summary/runtime-state reader.
- [ ] Search every browser-containment-contract and real-run-gate consumer.
- [ ] Search every environment allowlist/host classifier consumer.
- [ ] Re-review all files changed since planning baseline before editing.
- [ ] Check open issues/PRs/current docs again; record whether any new competing blocker exists.
- [ ] No source edit until H0 and baseline evidence are checkpointed in STATE.

Planner baseline reference only: 1,334 tracked blobs / 14,615,257 bytes at 4981b212....

## 2. Baseline validation and truth capture

Before production behavior changes:

- [ ] npm run typecheck
- [ ] npm run hardening:check
- [ ] focused tests/unit/proxy.test.ts
- [ ] focused tests/unit/safety.test.ts
- [ ] focused realRunGate tests
- [ ] focused runRecorder/evidence proxy tests
- [ ] tests/smoke/proxy.smoke.ts using repository-native command/config
- [ ] capture current OUTBOUND_POLICY_VERSION
- [ ] capture current ProxyRuntimeState shape
- [ ] capture current ProxyEvent / ProxySummary shape
- [ ] capture existing browser launch args from src/browser/contract.ts
- [ ] capture exact pass/skip/fail counts
- [ ] capture focused wall time
- [ ] record any pre-existing failures separately; do not attribute them to this campaign.

## 3. Mandatory reproductions before fixes

Add failing/red-team tests first. Planner findings are hypotheses until executable paths prove them.

### 3.1 Resolver invocation boundary

- [ ] Inject/spy a synthetic resolver around startOutboundProxy without granting it socket authority.
- [ ] Prove hostname-policy deny invokes resolver exactly zero times.
- [ ] Prove telemetry/optional-support/browser-background local blocks invoke resolver zero times.
- [ ] Prove an allowed hostname reaches the resolver.
- [ ] Prove current code has no resolved-address admission before the Node upstream primitive.
- [ ] Record BEFORE results.

### 3.2 Local address-class matrix

Using only injected resolver results:

- [ ] 127.0.0.1 positive control.
- [ ] ::1 positive control.
- [ ] 127.0.0.2 negative control.
- [ ] 0.0.0.0 negative.
- [ ] 169.254.0.0/16 edges.
- [ ] RFC1918 range edges.
- [ ] CGNAT/shared range edges.
- [ ] multicast edges.
- [ ] documentation/benchmark/reserved representative boundaries.
- [ ] :: unspecified.
- [ ] IPv6 link-local.
- [ ] IPv6 unique-local.
- [ ] IPv6 multicast.
- [ ] IPv6 documentation/reserved.
- [ ] IPv4-mapped IPv6 variants including mapped loopback/private/global cases.
- [ ] malformed address strings.
- [ ] family/address mismatch.
- [ ] duplicate answer forms.
- [ ] empty set.
- [ ] oversized answer set.

Record the current behavior and the target behavior for each.

### 3.3 Mixed-answer fail-closed proof

- [ ] safe + unsafe.
- [ ] global + private.
- [ ] loopback exact + alternate loopback.
- [ ] valid + malformed.
- [ ] IPv4 safe + IPv6 unsafe.
- [ ] permutations of the same multiset.
- [ ] Require target policy result invariant under answer order.
- [ ] Require zero upstream connections for every mixed-invalid case.

### 3.4 Protocol matrix

For each relevant resolver case exercise:

- [ ] HTTP absolute-form forward request.
- [ ] safe origin-form HTTP request if supported.
- [ ] CONNECT.
- [ ] WebSocket Upgrade.
- [ ] WSS path through CONNECT semantics where existing fixture architecture supports it without TLS MITM.
- [ ] Assert equivalent resolution-policy verdicts.

### 3.5 Exact-dial reproduction

Build a test seam that can observe the host/family passed to the upstream connector without external network.

- [ ] Current allowlisted hostname path shows hostname reaches implicit Node lookup/dial path.
- [ ] Target test requires numeric address reaches dial path.
- [ ] Original hostname remains Host/CONNECT authority.
- [ ] No second resolver call occurs after accepted resolution.
- [ ] Record BEFORE failing assertion before implementation.

### 3.6 Evidence-truth reproduction

- [ ] hostname allow + resolver error.
- [ ] hostname allow + unsafe address.
- [ ] hostname allow + connect refusal.
- [ ] hostname allow + connect timeout.
- [ ] Show current event/summary semantics.
- [ ] Define desired policyAuthorized/resolutionDenied/resolutionFailed/connected/connectFailed categories.
- [ ] Ensure no raw error text is required.

### 3.7 Runtime identity reproduction

- [ ] Construct current/old ProxyRuntimeState.
- [ ] Show it can satisfy current state validation/real-run gate when policy version matches.
- [ ] Add target test: hostname-only runtime identity must fail once resolved-egress binding is required.

## 4. Implement resolved-address classifier

Create the smallest pure owning module.

- [ ] Parse IPv4 exactly.
- [ ] Parse IPv6 exactly.
- [ ] Normalize IPv4-mapped IPv6.
- [ ] Classify unspecified.
- [ ] Classify exact loopback.
- [ ] Classify private/unique-local.
- [ ] Classify link-local.
- [ ] Classify CGNAT/shared.
- [ ] Classify multicast.
- [ ] Classify documentation.
- [ ] Classify benchmark/testing.
- [ ] Classify broadcast/reserved/special-use.
- [ ] Classify global unicast.
- [ ] Add boundary tests at start/end of each relevant CIDR, not only representative middle addresses.
- [ ] Reject unsupported/ambiguous textual forms.
- [ ] Avoid regex-only prefix classification.
- [ ] Keep module pure: no DNS, filesystem, process, network, environment mutation.
- [ ] Document standards/source rationale in code/docs without copying large external tables unnecessarily.

## 5. Implement owned resolver boundary

- [ ] Define a narrow Resolver interface returning address/family records only.
- [ ] Internal runtime owns the real resolver construction.
- [ ] Tests can inject deterministic resolver records.
- [ ] Page/product/candidate/config strings cannot inject code/callbacks.
- [ ] Enforce maximum answer count.
- [ ] Deduplicate normalized equivalents safely.
- [ ] Reject malformed/family-mismatch results.
- [ ] Define categorical resolver failures.
- [ ] Add bounded logical completion/timeout behavior.
- [ ] Be explicit if underlying OS lookup cancellation is not guaranteed.
- [ ] IP literals skip unnecessary name resolution but still pass address policy.
- [ ] Localhost cannot become external-DNS authority.
- [ ] A policy-denied hostname exits before resolver call.

## 6. Implement resolved-address policy

- [ ] local accepts exact 127.0.0.1 / ::1 semantics only.
- [ ] local rejects alternate 127/8 aliases unless current config explicitly authorizes exact address.
- [ ] dev/next/static external resolved addresses default to global unicast only.
- [ ] reject private/link-local/unspecified/multicast/documentation/benchmark/reserved/special-use external destinations.
- [ ] mixed answer sets fail closed.
- [ ] no unsafe-answer filtering followed by safe dial.
- [ ] no live DNS reconnaissance.
- [ ] no invented Alphaus CIDR.
- [ ] if real-environment private routing is required but unproven, fail closed and document owner-reviewed future policy requirement rather than weakening code.
- [ ] Add stable policy version/identity.

## 7. Exact-address connection binding

Factor shared connection preparation; do not copy resolver policy into each handler.

### 7.1 HTTP

- [ ] resolve/admit before upstream request.
- [ ] bind request connection/lookup to accepted numeric address.
- [ ] preserve original Host header.
- [ ] prevent implicit second hostname resolution.
- [ ] preserve method/path/header sanitation.
- [ ] bounded error/timeout handling.

### 7.2 CONNECT

- [ ] resolve/admit before net.connect.
- [ ] net.connect receives numeric address and family.
- [ ] original authority remains evidence/TLS identity.
- [ ] no TLS MITM.
- [ ] no resolver repeat.
- [ ] bounded error/timeout handling.

### 7.3 WebSocket Upgrade

- [ ] same resolution/admission helper.
- [ ] numeric address dial.
- [ ] original Host header preserved.
- [ ] head bytes semantics preserved.
- [ ] no resolver repeat.
- [ ] bounded error/timeout handling.

### 7.4 Protocol differential

- [ ] same input matrix -> same address-policy verdict across all three.
- [ ] one shared unit owns address safety.
- [ ] protocol framing stays outside address authority.

## 8. Sanitized lifecycle evidence and run truth

- [ ] Define whether existing allow means policy authorization; document it.
- [ ] Add categorical resolutionDenied count/outcome if absent.
- [ ] Add resolutionFailed count/outcome if absent.
- [ ] Add connected count/outcome if mechanically observable and useful.
- [ ] Add connectFailed count/outcome if mechanically observable and useful.
- [ ] Avoid false "connected" on mere socket creation.
- [ ] Preserve existing denied hostname hard-failure path.
- [ ] Make resolved-address denial a hard-failure path.
- [ ] Ensure RunRecorder.syncProxyViolations sees the new containment violation.
- [ ] Ensure summary passed cannot remain true after a resolved-address deny.
- [ ] Ensure proxy.jsonl / summary contain no raw sensitive diagnostics.
- [ ] Test authenticated-evidence file permission behavior remains correct.
- [ ] Version any changed durable schema deliberately.
- [ ] Update validators/readers/Control Center only if they consume the changed schema; no unrelated authority growth.

## 9. Runtime state and pre-real-run gate

- [ ] Add/evolve resolved-egress containment identity.
- [ ] tests/globalSetup emits it.
- [ ] direct runner emits/uses the same contract.
- [ ] runtime parser exact-validates it.
- [ ] realRunGate requires it.
- [ ] old runtime state fails.
- [ ] malformed/newer unknown runtime state fails.
- [ ] environment mismatch still fails.
- [ ] proxy health still fails closed.
- [ ] browser contract still proves all existing seven mandatory controls or an explicitly versioned stronger shape.
- [ ] no authenticated state is loaded during this campaign.

## 10. Browser DNS residual qualification

This workstream is bounded and conditional.

- [ ] Re-audit current Chrome launch args and docs residual.
- [ ] Do NOT add resolver flags by guesswork.
- [ ] Determine whether a zero-external-contact mechanical experiment can prove browser speculative DNS confinement.
- [ ] If yes, build it entirely from local/synthetic fixtures/temp artifacts.
- [ ] Verify mandatory proxy still carries normal synthetic traffic.
- [ ] Verify denied synthetic destination still reaches zero upstream sockets.
- [ ] Verify any new flag/control is present in direct runner and Playwright config through the shared contract.
- [ ] If proof is not possible without external DNS/root/network namespaces, record BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL.
- [ ] Do not implement Docker, namespaces, firewall, root networking, hosts-file mutation, or system DNS reconfiguration.

This workstream does not block completion if the residual remains truthfully documented; it blocks any claim of complete process-level isolation.

## 11. Adversarial hardening matrix

- [ ] resolver returns same address repeated many times.
- [ ] resolver order permutation.
- [ ] resolver changes answer between separate requests.
- [ ] ensure each request re-enters policy according to chosen design.
- [ ] no stale global cache can silently preserve an invalidated answer.
- [ ] address strings with whitespace/zone-id/alternate forms disposition.
- [ ] IPv6 bracket handling.
- [ ] hostname casing/trailing-dot/userinfo existing parser regressions.
- [ ] unexpected ports.
- [ ] connect-close races.
- [ ] client disconnect during resolver wait.
- [ ] proxy shutdown during resolver/dial.
- [ ] resolver completion after logical timeout cannot create a late socket.
- [ ] one protocol failure cannot crash proxy process.
- [ ] event write failure disposition remains safe.
- [ ] no unhandled rejection.
- [ ] no new global mutable cross-test state.
- [ ] no unbounded timers/listeners/answer accumulation.
- [ ] no open handles after tests.

## 12. Focused validation after each slice

Run repository-native exact commands discovered from package.json/current docs. At minimum:

- [ ] npm run typecheck
- [ ] npm run hardening:check
- [ ] tests/unit/proxy.test.ts
- [ ] new resolved-address classifier tests
- [ ] new resolver/binding tests
- [ ] tests/unit/safety.test.ts
- [ ] realRunGate tests
- [ ] runRecorder/evidence tests
- [ ] tests/smoke/proxy.smoke.ts
- [ ] browser containment/contract tests
- [ ] relevant privacy/redaction tests
- [ ] git diff --check
- [ ] no new skip/only markers

Fix every introduced Critical/High regression before advancing.

## 13. Full local acceptance cone

- [ ] npm run typecheck PASS.
- [ ] npm run hardening:check PASS.
- [ ] npm run quality-gate:spec PASS if current repository uses it in acceptance.
- [ ] npm run test:owner-provenance PASS.
- [ ] npm run gate:inventory PASS.
- [ ] npm run campaign:synthetic PASS where containment contract is consumed.
- [ ] npm run test:semantic-compat PASS if shared durable identity changed.
- [ ] npm run agent:check PASS.
- [ ] npm run agent:audit PASS.
- [ ] npm run project:check PASS.
- [ ] npm run gate:local PASS.
- [ ] npm run gate:clean PASS / repository current clean Node20 equivalent.
- [ ] canonical complete serial Playwright regression PASS with exact test/skip/fail counts.
- [ ] local browser outer-proxy synthetic smoke PASS.
- [ ] built/UI gates only if a consumed DTO/schema actually changed.
- [ ] no accidental test-results/artifacts/storage-state/credentials/private temp files tracked.
- [ ] no unexplained performance regression.
- [ ] record focused proxy before/after wall time and open-handle state.

## 14. Clean-checkout and topology proof

- [ ] Create disposable clean checkout/worktree according to repository policy.
- [ ] Use Node 20 baseline.
- [ ] npm ci.
- [ ] recreate only approved read-only sibling topology if current gate requires it.
- [ ] run required clean gate.
- [ ] run focused proxy/resolver suite in clean checkout.
- [ ] prove no dependency on untracked local config, hosts file edits, DNS override, or developer machine state.
- [ ] remove disposable state safely.

## 15. Identity / compatibility audit

For every changed identity record BEFORE -> AFTER -> reason -> consumers.

- [ ] OUTBOUND_POLICY_VERSION changed only if hostname policy semantics changed.
- [ ] resolved-address policy version.
- [ ] proxy containment runtime identity.
- [ ] ProxyEvent/ProxySummary durable shape/version if changed.
- [ ] real-run contract identity if changed.
- [ ] no unrelated source analyzer identity change.
- [ ] no unrelated semantic/replay/dossier/campaign identity change.
- [ ] old runtime state cannot masquerade as new containment state.
- [ ] no compatibility shim weakens the new invariant.

## 16. Safety accounting

Final report must state exact counts/booleans for:

- [ ] DEV contacts = 0
- [ ] NEXT contacts = 0
- [ ] production contacts = 0
- [ ] live Alphaus DNS reconnaissance = 0
- [ ] authenticated storage-state loads = 0
- [ ] customer/data/datastore operations = 0
- [ ] cloud/infra operations = 0
- [ ] sibling repository writes = 0
- [ ] publication/external findings = 0
- [ ] runtime external AI/model calls = 0
- [ ] Docker/network namespace/firewall/root networking changes = 0
- [ ] force pushes = 0

## 17. Exact-head Git and CI truth

- [ ] Commit only validated durable checkpoints.
- [ ] Push main according to single-writer rules.
- [ ] Verify origin/main == local HEAD.
- [ ] If current policy requires exact-head Actions observation, inspect once after push.
- [ ] Executed passing steps may be recorded as CI evidence.
- [ ] steps=[] / null remains NO_STEPS_BILLING_OR_PLATFORM_BLOCK.
- [ ] Never weaken workflow or retry churn solely to change external billing/platform state.

## 18. Durable closure

- [ ] STATE updated at every durable milestone.
- [ ] REPORT includes all-file audit counts/digest.
- [ ] REPORT includes BEFORE reproductions and AFTER results.
- [ ] REPORT includes address-class matrix.
- [ ] REPORT includes protocol differential matrix.
- [ ] REPORT includes evidence/summary semantics.
- [ ] REPORT includes runtime identity migration.
- [ ] REPORT includes browser DNS residual disposition.
- [ ] REPORT includes every changed file and why.
- [ ] REPORT includes exact test counts/skips/failures/timings.
- [ ] REPORT includes safety accounting.
- [ ] Update docs/SAFETY_MODEL.md for the exact new L5 invariant and remaining L6 residual.
- [ ] Update docs/ARCHITECTURE.md, CURRENT_STATE.md, ROADMAP.md, DECISIONS.md only where durable truth changed.
- [ ] Mark OpenSpec tasks complete only when evidence exists.
- [ ] Set .agent/ACTIVE_TASK.md terminal COMPLETE with next action STOP.
- [ ] Final push.
- [ ] Stop. Do not auto-select another campaign in the executor session.

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
