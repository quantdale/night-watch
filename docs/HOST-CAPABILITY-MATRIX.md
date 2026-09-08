# Nightwatch Host Capability and Dependency Matrix

Status: CURRENT. Maintained under NW-14 of
`docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md`.

This is the current operational answer to two questions an operator and a
release reader both need: **what must this host provide**, and **which
dependency claims still carry evidence**. It is a snapshot of qualification,
not Git authority — discover live SHAs from Git.

The rule that governs every row: an unqualified host reports **unsupported
capability**, and never inherits a pass from a host that had the capability.
Absent, skipped and unavailable are distinct from PASS everywhere in this
document.

## 1. Runtime and platform

| Requirement | Declared | Qualified on | If absent |
| --- | --- | --- | --- |
| Node.js | `engines.node >= 20` | 20.x and 22.22.1 | `npm ci` refuses; `gate:clean` qualifies a disposable Node 20 checkout explicitly |
| Operating system | not constrained in the manifest | Linux (x86_64, WSL2 kernel 6.6) | process, namespace and filesystem-identity lanes report unsupported rather than passing |
| Package manager | `npm ci` against the committed `package-lock.json` | npm 10.x; verified 2026-09-09 by a disposable `npm ci --offline`, 7 packages, lockfile byte-identical afterwards | a resolution that does not match the lockfile is a reproducibility failure, not a warning |
| Shell | none — no Nightwatch surface passes a runtime string to a shell | n/a | n/a |

Nightwatch is a **private local tool**. There is no supported deployment
target, so "portability" here means: which lanes can a given host honestly
execute, and which must it report as unavailable.

## 2. Host capabilities by lane

| Capability | Probed by | Lane that needs it | Behaviour when the host cannot provide it |
| --- | --- | --- | --- |
| Unprivileged Bubblewrap (`bwrap`) network namespace | `src/core/oops/sandbox.ts` (`nightwatch.l6-runtime-capability.v1`) | L6 process/network containment; the deep containment lane of `campaign:synthetic` | the capability reports UNSUPPORTED with a blocker code, the deterministic fail-closed path is proven instead, and the gate records the lane state (`deepContainmentLane`) rather than silently passing. `gate:local` requires PROVEN; CI accepts a recorded non-PROVEN lane but fails on an unclassifiable one |
| System Chrome | Playwright configuration (default drives system Chrome) | browser workflow lane; the Ripple readiness fixture | `npx playwright install chromium` provides a fallback; without either, browser lanes are UNAVAILABLE and must be reported as such |
| Go toolchain, allowlisted and cached | `src/core/ownerLocalReproduction/provider.ts` | W9/W10 owner-local current-source reproduction | `TOOLCHAIN_UNAVAILABLE` / `TOOLCHAIN_VERSION_UNSATISFIED` environment block. An environment block is never a defect and never a reproduction |
| IPv6 loopback | address policy and proxy admission | proxy and egress lanes | the affected cases report the unsupported address family rather than asserting an IPv4-only result |
| Parent-death / process-tree teardown | `src/core/process` teardown paths | cancellation and timeout cleanup proofs | categorical teardown is asserted where the host supports it; elsewhere the lane is unavailable |
| Sibling `REPOSITORIES` checkouts | `src/core/source/siblingSource.ts` (`DEFAULT_SIBLING_ROOT`, `NIGHTWATCH_REPOS_ROOT`) | real-source, historical and reproduction proofs | the source universe is UNAVAILABLE and the dependent proofs report that, rather than reporting an empty universe as a clean one |
| Network egress | deliberately absent from every gate lane | the public dependency-advisory assessment only | see §4: the advisory lane is UNAVAILABLE under this campaign's safety boundary |

`DEFAULT_SIBLING_ROOT` is a hardcoded absolute path, so siblings stay visible
even to `gate:clean` on the owner's machine. A sibling-absent topology is
observable only in GitHub CI — which is why an absent-sibling claim must come
from a CI receipt, not from a local run.

## 3. Validation lanes and what each one proves

Each lane is a separate claim. None subsumes another.

| Lane | Command | Class it covers |
| --- | --- | --- |
| Root compile | `npm run typecheck` | `src`, `tests`, `scenarios`, `config`, `corpus`. Excludes `ui/**` and `bin/*.mjs` by construction |
| Bin parse | `node --check` over every tracked `bin/*.mjs` | the `BIN_SYNTAX` class of the validation universe |
| Structural invariants | `npm run hardening:check` | offline boundary rules, including the validation-universe completeness rule |
| Authoritative gate | `npm run gate:local` / `gate:ci` | the eleven required groups; 252 unique test files at this checkpoint |
| Full regression | `npm test` | the `FULL_REGRESSION` class — every offline suite, including those the bounded gate does not select. **Run it on a committed tree**: two `selfDevAdoptionCli` cases correctly refuse a dirty authoritative source and would otherwise report the harness rather than the code |
| Clean checkout | `npm run gate:clean` | reproducibility from a disposable Node 20 checkout with no reused `node_modules` |
| UI | `ui/control-center`: `npm run typecheck && npm run test && npm run build` | the `UI_LANE` class; separate lockfile, runner and program |
| Browser workflow | browser lane on a qualified host | the `BROWSER_WORKFLOW` class |
| Owner manual | owner-run harnesses under explicit authorization | the `MANUAL_OWNER` and `LIVE_APP_SMOKE` classes |
| Exact-checkpoint CI | GitHub Actions on the candidate SHA | the CI claim. Record the run ID and executed SHA; never project execution from a local workflow parse |

`npm run validation:universe` reports the discovered/classified counts and the
inventory digest that binds them. An unclassified test fails
`hardening:check`.

## 4. Dependency assessment

| Dependency | Version | Kind | Assessment |
| --- | --- | --- | --- |
| `@playwright/test` | 1.62.1 | dev | the root test runner. Pinned exactly; upgrades are a deliberate, separately validated change |
| `@types/node` | ^22.10.0 | dev | types only, no runtime |
| `typescript` | ^5.7.0 | dev | compiler only, no runtime |
| `vue` | 2.6.12 | dev **fixture** | upstream EOL; retained deliberately on a reachability argument — see below |

### The Vue 2.6.12 development fixture

**What it is.** One devDependency, reached from exactly one place:
`tests/unit/rippleReadiness.test.ts` loads `vue/dist/vue.js` into a Playwright
page via `require.resolve`, to prove that Vue REPLACES the bootstrap mount
element with the rendered shell — the behaviour the real Ripple product's
`render: h => h(App)` bootstrap depends on.

**Reachability.** Vue never executes in any Nightwatch runtime path. It is
loaded only inside a browser page, in one offline test, against page content
the test itself writes, with a fixed render function rather than a template
compiled from untrusted input, and with no network. The Vue 2 advisory class
that matters in practice — template compilation over attacker-controlled
input — has no path here, because no untrusted string reaches a template.

**Why the version is pinned rather than upgraded.** 2.6.12 is the version the
product bootstraps with. The fixture's job is to model the product, so
upgrading it would make the fixture stop representing what it exists to
represent. Replacing it would require equivalent parser and mount-replacement
coverage against the same product behaviour, which no newer version provides.

**Why it cannot simply be removed.** It was removed once as "unused", and
`require.resolve` is invisible to import scanners, so the break surfaced only
on a fresh install (DEF-FC-03). `checkDeclaredDependencyResolvability` in
`bin/hardening-check.mjs` now enforces that every bare specifier tracked
source reaches is a declared dependency.

**Upstream status: END OF LIFE.** `npm ci` emits
`vue@2.6.12: Vue 2 has reached EOL and is no longer actively maintained`.
This is stated plainly because it changes the shape of the argument: no
upstream patch will ever arrive, so retention rests **entirely** on the
reachability argument above rather than on a promise of future fixes. If that
argument ever weakens — if the fixture begins compiling a template from
anything but its own literal content — the dependency must go, and there is
no upgrade path to fall back on.

**Owner decision.** RETAIN, as a development fixture, on the reachability
argument alone. Review conditions, any one of which reopens this: the Ripple
product moves off Vue 2; the fixture starts compiling a template from
non-fixture input; an advisory is published whose reachable path does not
depend on template compilation; or the fixture's single call site grows a
second consumer.

**Review date.** 2026-09-09.

**What is NOT claimed.** No current online advisory scan was performed. This
campaign's safety boundary prohibits network dependency fetching, so
`npm audit` and any registry-backed advisory query are **UNAVAILABLE**, not
clean. That lane needs its own evidence: a read-only advisory query under
permitted network access, recorded with its query date. An absent scan is
never a passing scan.

## 5. Documentation currency

`docs/CURRENT_STATE.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`,
`docs/ARCHITECTURE.md` and `docs/SAFETY_MODEL.md` are **append-heavy
historical records**, each well over ten thousand lines, in which current and
historical truth are interleaved. They remain the archive and are not
rewritten: historical receipts, SHAs and decisions stay exactly as recorded.

For the current answer, read in this order:

1. `README.md` — what Nightwatch is and how to run it;
2. **this document** — what the host must provide and which lanes prove what;
3. `AGENTS.md` — the agent contract, C-00 worktree protocol and permanent rules;
4. `.agent/ACTIVE_TASK.md` — the active campaign and its authority;
5. `docs/MASTER-IMPLEMENTATION-HARDENING-PLAN.md` §4 — the findings register
   with each finding's current status and resolution evidence.

The archives answer "how did we get here". These five answer "where are we".
