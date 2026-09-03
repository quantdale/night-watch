# C-04 Frontend Consumer Intelligence

## Purpose

Nightwatch can describe the backend surface in detail and cannot say which UI
code calls it. C-04 derives that edge mechanically, so an operator can ask
"what calls this route" and get an answer with provenance rather than a guess.

## Starting State

- Task ID: `nightwatch-frontend-consumer-intelligence-c04-v1`
- Starting SHA: `7c0d5f5326be1983cf081888680f3c01f3f128f6`
- Session branch: `session/nightwatch-frontend-consumer-int-82a0494b`
- Predecessor `nightwatch-go-grpc-topology-binding-c03-v1` COMPLETE.

Established, measured, not to be rediscovered:

- The approved frontend universe is `mobingilabs/ripple-ui` `src` alone.
- 211 candidate call sites; the `≥ 400` criterion cannot be met (see SPEC).
- Eight axios instances, all created in `src/axios.config.js`.
- The dominant real shape is a function-local `url` variable assigned a literal
  or template, then `blueApi.get(url)` — not `axios.get('/literal')`, of which
  there are zero.
- `.vue` is not an approved extension, so 859 files are rejected on their
  extension exactly as `.proto` was before C-02b.
- C-02b/C-03 admitted 15 blueapi proto roots and 15 blue-sdk-go roots; the
  backend route population is 1,745 operations, which is what the join targets.

## Scope

`.vue` / `VUE` language admission; bounded Vue SFC script extraction; axios
instance recognition; bounded function-local path resolution; path evidence
classification; categorical backend join; hardening rules with probes;
gate-registered suites.

## Non-Goals

No rendering, execution, bundling, browser, or sibling `node_modules`. No
`@vue/compiler-sfc` or TypeScript compiler dependency. No repository admission
and no further frontend repository. No production, DEV or NEXT contact; no
credentials; no customer data.

## Safety Constraints

Read-only sibling access through `siblingSource.ts`; bounded loops and explicit
ceilings; structural routes only with query and hash stripped; no runtime or
customer value in durable evidence; fail closed to UNKNOWN; explicit synthetic
roots in fixtures; no repository write while `gate:clean` evidence is
running.

## Architecture / Approach

1. **`src/core/source/vueSfc.ts`** — a bounded `<script>` block extractor. Vue
   SFCs are not JavaScript, so the script must be lifted out before any JS
   rule sees the file. No `@vue/compiler-sfc`: a bounded scanner for the
   script open/close tags is enough for the extraction this needs, and adding
   a compiler to read a tag would be a large dependency for no extra proof.
2. **`src/core/source/frontendConsumer.ts`** — recognises `axios.create`
   instances, then call sites `<instance>.<verb>(<arg>)`, resolving `<arg>`
   through bounded function-local assignment lookup. Emits a classified path
   expression, never a bare string.
3. **`src/core/source/frontendJoin.ts`** — joins consumer edges to backend
   route facts by canonical structural identity, categorically, and never
   above the weaker of the two evidence classes.

## Milestones

### M1 — Task record, OpenSpec change, measured ceiling — IN_PROGRESS
- Acceptance: `agent:check` / `handoff:check` pass; the 211-site ceiling and
  its cause are recorded before any code.

### M2 — Adversarial corpus, asserted before the parser — NOT_STARTED
- Direct literal; template literal; runtime template segment; concatenation;
  path assembled across functions; unknown base URL; aliased instance;
  dynamically selected client; wrapper around axios; comment containing a fake
  call; string containing a fake call; dead test fixture; method mismatch;
  multiple backend matches; query construction; hash fragment; repeated slash;
  trailing slash; `..` segment; route constant; imported literal constant;
  mutated constant; stale source SHA.
- Acceptance: every case named and asserted; every non-literal path asserted
  non-`SOURCE_FACT`.

### M3 — Vue SFC extraction and the consumer parser — NOT_STARTED
### M4 — `.vue` / `VUE` admission and the real measurement — NOT_STARTED
### M5 — Backend join, categorical — NOT_STARTED
### M6 — Hardening, negative probes, gate registration — NOT_STARTED
### M7 — Validation, integration, exact-head CI, closure — NOT_STARTED

## Validation Strategy

Frontend analyzer suites, source completeness, source joins, source graph
contracts, C-01 no-eviction, C-02b/C-03 regression, typecheck, hardening,
project/handoff/agent, semantic compatibility, synthetic campaign, full
canonical regression, `gate:clean`, exact-head CI.

## Decision Log

- 2026-09-03 — Record the `≥ 400` shortfall in the SPEC before implementing.
  Reason: the ceiling is a property of the authorization boundary, not of the
  work, and discovering it at the end would read as an excuse rather than a
  measurement. Evidence: 211 call sites across the whole approved universe.
- 2026-09-03 — No `@vue/compiler-sfc`. Reason: the campaign needs the script
  text out of an SFC, which a bounded tag scanner does; a compiler would add a
  large dependency and a template AST this campaign has no use for.

## Discoveries

- There are zero `axios.get('/literal')` call sites in ripple-ui. A parser
  written to the historical design's assumed shape would have found nothing.

## Deferred Work

- Any further frontend repository: `BLOCKED_BY_C05_REPOSITORY_ADMISSION`.

## Completion Criteria

Every SPEC acceptance row PASS with exact evidence, or a truthful documented
shortfall the specification permits; canonical repository clean and synced;
session released.
