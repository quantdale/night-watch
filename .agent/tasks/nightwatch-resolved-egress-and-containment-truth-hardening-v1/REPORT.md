# Resolved Egress + Containment Truth Hardening — Execution Report

Status: IN_PROGRESS
Task ID: `nightwatch-resolved-egress-and-containment-truth-hardening-v1`
Phase: RESOLVED-EGRESS-AND-CONTAINMENT-TRUTH-HARDENING-V1
CONTINUITY_PROTOCOL_VERSION: `nightwatch.agent-continuity.v2`
Starting SHA: `9a70e7f3e81255d56352b9efb291f0fb4f4f03de`
Validated implementation SHA: `3db48ed7d35a0a816ef1a801c86a1d14ddf60b27`
Safety scope: LOCAL / repository source / synthetic loopback only

This report records the completed implementation and validation evidence. The
terminal status remains IN_PROGRESS until the final documentation checkpoint,
exact-head verification, and clean-tree continuity transition are committed.

## Objective and scope

The campaign closes the L5 gap in which an allowlisted hostname could reach a
hostname-valued Node upstream primitive without a Nightwatch-owned
resolved-address admission decision. The completed invariant is:

`hostname policy authorization -> bounded owned resolution -> complete answer-set admission -> exact numeric address/family binding`.

The implementation covers HTTP forward proxying, HTTPS/WSS CONNECT, and
WebSocket HTTP Upgrade. It preserves the existing hostname policy, browser
containment, passive/read-only model, privacy boundary, owner freeze, semantic
oracles, source-proof authorities, and no-publication rule. It does not run a
real Alphaus environment, live DNS reconnaissance, authenticated product
testing, or L6/container/network-namespace work.

## Takeover and H0 audit

- `git pull --ff-only origin main` fast-forwarded the requested repository from
  `4981b21` to clean live starting SHA `9a70e7f`; branch `main` tracked the
  private `origin` remote `quantdale/night-watch`.
- The changed paths between the planning SHA and the starting SHA were all
  prompt/OpenSpec planning artifacts. No source or test implementation drift
  was found.
- Pre-activation NUL-safe manifest: `1,339` tracked, regular, and reviewed
  files; `0` non-regular paths; `14,678,946` bytes; `293,399` newline lines;
  ordered path/content digest
  `sha256:77ab538468b754f90ec0ff30c518d68244794d4c049218f35571c43de5dbb4e4`.
- Post-activation H0 recheck: `1,343` tracked, regular, and reviewed files;
  `0` non-regular paths; `14,699,899` bytes; `293,908` newline lines;
  ordered path/size/content digest
  `sha256:cfae197f3f977cd2916e5b30c644550ee36610c02adf786641f8975e6d56979c`.
- Post-activation classes: active-runtime `409`, tests `233`, config `6`, UI
  `14`, corpus/fixtures `112`, tooling/bin `51`, workflow `1`, docs/OpenSpec
  `50`, continuity/history `440`, generated/lock/metadata `19`, and
  other-explicit `8`; reviewed equals tracked.
- Marker inventory found only the intentional continuity self-scan vocabulary
  in `bin/agent-continuity-protocol.mjs:335-336`. The exact existing skip
  inventory is the 16 historical/manual capability or availability guards
  recorded in STATE; no campaign skip or `only` marker was introduced.
- Existing network primitives were reviewed as confined to the established
  proxy, browser fixtures/launchers, tests, and hardening scans. The pre-fix
  proxy used hostname-valued `http.request`/`net.connect` after hostname
  policy allow; no resolver or exact-address authority existed.
- Existing browser flags were preserved: `--proxy-bypass-list=<-loopback>`,
  `--disable-quic`, and
  `--force-webrtc-ip-handling-policy=disable_non_proxied_udp`, together with
  the reviewed background-networking, sync, update, network-hint, and
  fetching-hint restrictions.
- No open issue or pull request competed with this campaign at the final
  repository review (`gh issue list` and `gh pr list` both empty).

## Baseline and mandatory BEFORE reproductions

The activation baseline passed `npm run typecheck`,
`npm run hardening:check`, focused proxy/safety/real-run-gate/evidence and
proxy-smoke suites, and the full local gate: `283.64s`, all nine groups green,
semantic compatibility `1,903 total / 1,890 passed / 13 skipped / 0 failed`,
owner provenance `91 passed`, synthetic campaign `66 passed`, receipt
`receipt:sha256:af4db19337c1ca46035bce61`.

The pre-fix red-team suite was added before production source edits and ran
`0 passed / 2 failed` in `3.65s`. Its policy-denied, telemetry,
optional-support, and browser-background cases made zero resolver calls. The
allowlisted hostname made zero calls to the injected resolver and reached the
upstream boundary as `{ hostname: 'allowed.synthetic.test', family: undefined
}`. The unsafe synthetic answer was not admitted: the proxy returned `200`
and the unsafe fixture was contacted, while the required result was `502` and
zero upstream requests. No external DNS was used.

## Implementation evidence

### Address classifier and answer-set admission

`src/proxy/addressPolicy.ts` is pure and has no Node, filesystem, network, or
process authority. It uses strict numeric IPv4/IPv6 parsing and integer range
classification rather than fragile textual-prefix checks. The exercised
matrix covers:

- IPv4 unspecified, exact/alternate loopback, RFC1918 private, link-local,
  CGNAT/shared, documentation, benchmark, special-use, multicast, broadcast,
  reserved, and global-unicast boundary values.
- IPv6 unspecified, exact loopback, link-local, unique-local, multicast,
  documentation, benchmark, special-use, reserved, and global-unicast
  boundaries, with canonical equivalent spellings.
- IPv4-mapped IPv6 loopback/private/global forms: classification is visible
  to the pure classifier, while admission rejects mapped addresses
  conservatively.
- malformed text, leading-zero/whitespace variants, brackets/zones,
  compression errors, embedded-tail ambiguity, and address/family mismatch.
- duplicate forms, empty answers, more than the bounded eight-answer limit,
  safe plus unsafe, global plus private, exact loopback plus alternate
  loopback, valid plus malformed, IPv4-safe plus IPv6-unsafe, and order
  permutations.

Local admission accepts only exact canonical `127.0.0.1` and `::1`; external
`dev`/`next` admission accepts only global-unicast answers. The complete answer
set must be acceptable before deterministic selection. Raw addresses do not
enter events, summaries, findings, fingerprints, dossiers, or error text.

### Resolver authority and race behavior

`src/proxy/resolver.ts` owns the internal `node:dns/promises` lookup. Callers
receive only bounded `{address, family}` records and cannot inject socket or
callback authority. Numeric literals and exact localhost canonicalization do
not call the resolver. Hostnames are lowercased, resolution is reached only
after hostname policy allow, answer count and address length are bounded, and
the logical timeout is bounded. Resolver errors, malformed/family-invalid or
empty answers, unsafe/mixed sets, and late completion fail closed. A resolver
that completes after timeout cannot create a socket.

### Exact protocol binding

HTTP, CONNECT, and WebSocket Upgrade use the same resolver/admission helper.
HTTP sends the exact numeric destination and family with `agent: false` and
retains the original `Host`; CONNECT and Upgrade retain original authority
semantics while dialing only the admitted numeric address/family. The focused
protocol suite proves safe loopback success, unsafe loopback zero-contact,
connection refusal classification, resolver timeout/late completion, and
WebSocket authority preservation. Denied, telemetry, optional-support, and
browser-background decisions return before resolution and never invoke the
resolver.

### Lifecycle evidence and runtime identity

`ProxyEvent` lifecycle fields distinguish hostname policy authorization,
resolution admitted/denied/failed, connection attempted/connected/failed/not
attempted, bounded connection failure categories, and containment violations.
`ProxySummary` is `nightwatch.proxy-summary.v2`; policy authorization is kept
distinct from resolution and connection counts, legacy outcome coverage is
explicit, and containment violations are counted as hard failures. Raw IPs,
resolver/OS diagnostics, headers, cookies, bodies, query strings, and tokens
are excluded.

The runtime and real-run gate require all current identities:

- hostname policy unchanged: `phase-2a-browser-background-policy-v1`;
- proxy containment: `nightwatch.proxy-containment.v2`;
- resolved address policy: `phase-1.2-resolved-address-policy-v1`;
- exact address binding: `phase-1.2-exact-address-binding-v1`.

Old or malformed runtime state cannot masquerade as the new containment
contract. Existing source analyzer, semantic/replay, dossier, campaign, and
owner-policy identities were audited unchanged. An unwritable event log marks
the proxy unhealthy, blocks later requests, and tears down any upstream
created before a failed lifecycle write.

## Browser residual and adversarial closure

The browser launch contract and controls remain unchanged. The campaign did
not claim to prove process-level DNS isolation. The exact residual is
`BROWSER_DNS_PREFETCH_REMAINS_L6_RESIDUAL`: Chromium speculative DNS activity
is not itself a proxy event, while the proxy performs no resolution for
denied/unknown targets and uses the admitted numeric destination for allowed
targets. L6/container, system DNS/hosts changes, privileged firewall rules,
Docker, root networking, and TLS MITM remain out of scope.

## Validation ledger

All focused and full validation used repository-owned synthetic loopback
fixtures. Results:

- `npm run typecheck`: PASS.
- `npm run hardening:check`: PASS.
- Final focused proxy/resolver/address/protocol/evidence/destination/
  containment/real-run-gate/Control Center/redaction/storage/safety cone:
  `158 passed / 0 failed / 5.2s`.
- Browser/contract/privacy cone: `44 passed / 0 failed / 23.2s`.
- `npm run test:owner-provenance`: `91 passed / 0 failed / 9.7s`.
- `npm run test:semantic-compat`: `22 phases / 141 files / 1,903 total /
  1,890 passed / 13 inherited skips / 0 failed`.
- `npm run campaign:synthetic`: `66 passed / 0 failed / 15.5s`.
- `npm run quality-gate:spec`: PASS; nine groups; definition digest
  `sha256:3d0a4c3f845f91c348a994bb056b130a286c3102e1f86267124328299fa26a47`.
- `npm run gate:inventory`: PASS; nine authoritative logical groups and 152
  unique files.
- `npm run agent:check`: PASS with only the expected documentation checkpoint
  advance and historical legacy-v1 warnings; no strict-v2 error.
- `npm run agent:audit`: PASS; 82 tasks, 58 strict-v2, 24 legacy-v1, 0 strict
  errors.
- `npm run project:check`: PASS; canonical catalog count 1, catalog digest
  `sha256:bd35b934b852f192c2ba0f10c242dde3ebab492c66cd6760427f128a7dfba968`,
  Phase 8 complete, promotion authority `NONE`.
- `npm run gate:local`: PASS on docs checkpoint
  `6f475224073109dd210dd021018e84f26f8c0c44`; all nine groups; semantic
  `1,903/1,890/13/0`; final local receipt
  `receipt:sha256:49e2f3b6120820eb316a7253`; package-lock digest
  `sha256:e87bf7337541d2ce03bb701deb09fc14853b5711c45688fcf8b647d04ebfe45c`.
- `npm run gate:clean`: final clean Node20 run passed all nine groups with
  source head `6f475224073109dd210dd021018e84f26f8c0c44`, clean-before/after
  true, no reused `node_modules`, no auth/owner state, zero sibling writes,
  gate receipt `receipt:sha256:0beb7929d83067728eeb340c`; and clean receipt
  `clean-receipt:sha256:da154ae5aa8c49d50db6f2f6`. A first clean attempt had a
  single transient Phase24 lifecycle failure; five direct Node20 repeats
  passed, then the complete clean gate passed without source weakening.
- Canonical serial `npm test -- --project=nightwatch --workers=1
  --reporter=line`: `2,573 passed / 16 skipped / 0 failed` out of `2,589`,
  wall time `7.2m`.
- Control Center UI typecheck: PASS. UI tests: `11 passed` in two files. UI
  build: PASS, three files and 259,566 bytes, no external references or
  embedded content. Built UI browser check: `1 passed`, all seven views.
- Dev-server browser verification: body content present, no overlay, zero
  console errors; the browser and Vite process were closed after verification.
- `git diff --check`: PASS for the implementation and documentation changes;
  no added skip/only markers or sensitive tracked artifacts were found.

## Safety accounting

All counts are zero: DEV contacts `0`; NEXT contacts `0`; production contacts
`0`; live Alphaus DNS reconnaissance `0`; authenticated storage-state loads
`0`; customer/data/datastore operations `0`; cloud/infra operations `0`;
sibling repository writes `0`; publication/external findings `0`; runtime
external AI/model calls `0`; Docker/network namespace/firewall/root-networking
changes `0`; force pushes `0`. No Alphaus repository was modified.

## Files changed and rationale

All changes since the live starting SHA are listed below. The implementation
checkpoint contains the source/test entries; durable docs and continuity
entries are the campaign closure.

- `.agent/ACTIVE_TASK.md` — routes the active continuity-v2 task.
- `.agent/tasks/nightwatch-resolved-egress-and-containment-truth-hardening-v1/PLAN.md` — living milestones and validation plan.
- `.agent/tasks/nightwatch-resolved-egress-and-containment-truth-hardening-v1/REPORT.md` — this execution handoff.
- `.agent/tasks/nightwatch-resolved-egress-and-containment-truth-hardening-v1/SPEC.md` — frozen campaign intent.
- `.agent/tasks/nightwatch-resolved-egress-and-containment-truth-hardening-v1/STATE.md` — execution waypoint and evidence ledger.
- `openspec/changes/nightwatch-resolved-egress-and-containment-truth-hardening-v1/tasks.md` — all 297 evidence-backed OpenSpec tasks closed.
- `src/auth/directRunner.ts` — supplies current proxy identities to direct-runner state.
- `src/browser/context.ts` — consumes categorical proxy containment violations.
- `src/controlCenter/adapters/runAdapter.ts` — maps schema-v2 proxy summaries and safety failures.
- `src/controlCenter/authorities/runEvidenceReader.ts` — validates/migrates proxy evidence with conservative legacy handling.
- `src/controlCenter/contracts/runs.ts` — carries schema-v2 lifecycle and containment DTOs.
- `src/core/evidence/destinationManifest.ts` — records containment violations as blocked evidence.
- `src/core/evidence/runRecorder.ts` — records identities, lifecycle violations, and truthful run failure state.
- `src/core/evidence/types.ts` — extends manifest/evidence contracts for containment identity and violations.
- `src/core/safety/realRunGate.ts` — rejects state missing any current containment identity.
- `src/proxy/addressPolicy.ts` — pure bounded IPv4/IPv6 classifier and complete answer-set admission.
- `src/proxy/events.ts` — validates bounded lifecycle events and violation semantics.
- `src/proxy/identity.ts` — owns proxy containment and exact-binding identities.
- `src/proxy/resolver.ts` — owns bounded internal resolution and late-result-safe admission.
- `src/proxy/runtime.ts` — validates the current runtime state shape and identities.
- `src/proxy/server.ts` — routes HTTP/CONNECT/Upgrade through resolution, exact numeric binding, lifecycle accounting, and event-write fail-closed handling.
- `src/proxy/types.ts` — defines resolver, connection, violation, summary-v2, and runtime contracts.
- `tests/globalSetup.ts` — writes the current proxy identities into test runtime state.
- `tests/manual/phase10b-contained-dev-deep-semantic.ts` — consumes the current containment violation predicate.
- `tests/manual/phase22-contained-dev-semantic.ts` — consumes the current containment violation predicate.
- `tests/manual/phase2a-authenticated.ts` — consumes the current containment violation predicate.
- `tests/manual/phase2a-canary.ts` — consumes the current containment violation predicate.
- `tests/manual/phase2b-real-journeys.ts` — consumes the current containment violation predicate.
- `tests/manual/phase2c-real-journeys.ts` — consumes the current containment violation predicate.
- `tests/manual/phase4-real-exploration.ts` — consumes the current containment violation predicate.
- `tests/manual/phase7-real-campaign.ts` — consumes the current containment violation predicate.
- `tests/manual/phase9b-contained-dev-semantic.ts` — consumes the current containment violation predicate.
- `tests/unit/addressPolicy.test.ts` — covers numeric address boundaries, mapped forms, malformed/family cases, and whole-set policy.
- `tests/unit/controlCenterRunEvidenceReader.test.ts` — covers schema-v2 and conservative legacy evidence reading.
- `tests/unit/destinationManifest.test.ts` — covers containment violations in destination evidence.
- `tests/unit/evidence.test.ts` — covers recorder identity, violation, and privacy behavior.
- `tests/unit/proxy.test.ts` — covers proxy lifecycle, failure mapping, and unwritable event-log fail-closed behavior.
- `tests/unit/proxyResolvedProtocols.test.ts` — covers exact HTTP/CONNECT/Upgrade binding and protocol differential behavior.
- `tests/unit/realRunGate.test.ts` — covers current identity admission and old/malformed state rejection.
- `tests/unit/resolvedEgressHardening.test.ts` — records the before defect and after safe/unsafe exact-address regression.
- `tests/unit/resolver.test.ts` — covers bounded resolver, literals, timeout, late completion, malformed, mixed, and oversized answers.
- `docs/ARCHITECTURE.md` — records the current exact-address L5 pipeline and topology.
- `docs/CURRENT_STATE.md` — records current resolved-egress capability, validation, identity, and residual truth.
- `docs/DECISIONS.md` — adds D-84 for the hostname-allow plus resolved-address decision.
- `docs/ROADMAP.md` — updates completed Phase 1.2 deliverables and exclusions.
- `docs/SAFETY_MODEL.md` — states the exact L5 invariant, evidence semantics, and L6 residual.

No generated artifact, storage state, credential, private finding, test result,
or external environment output was added.

## Git and external CI truth

Validated checkpoints were committed and pushed serially: activation
`372f51d12ebd7d5345c5444ff27602ba9508bf08`; intentional red reproduction
`86e804ea6d8b066137ea02cc80ba7e3a112a929b`; validated implementation
`3db48ed7d35a0a816ef1a801c86a1d14ddf60b27`; continuity documentation
`a8cc0b42dd722561f67bd7efc3d0d3f905550682`; repaired documentation
checkpoint `6f475224073109dd210dd021018e84f26f8c0c44`. The final closure
commit(s) will be verified from Git and recorded after this report and the
terminal continuity fields are committed. Force-push was never used.

External CI was not observed as a green authority. Any absent, zero-step, or
platform/billing-blocked run remains non-evidence under repository policy; no
workflow was weakened or retried to alter that external state.

## Deferred / follow-up

L6 container/network namespace isolation, privileged firewall/root networking,
system DNS/hosts changes, TLS MITM, live Alphaus DNS/address reconnaissance,
real-product acceptance, and unrelated authority/schema redesign remain
explicitly deferred. No successor campaign is selected by this task.
