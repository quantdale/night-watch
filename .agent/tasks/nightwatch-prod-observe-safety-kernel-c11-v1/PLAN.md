# C-11 `PROD_OBSERVE` Safety Kernel

## Purpose

Build the component that DECIDES. After C-11 the repository can demonstrate,
against mock production, that no request is issued unless every required
machine authority grants it — and can show which authority denied when one does.

## Starting State

- Task ID: `nightwatch-prod-observe-safety-kernel-c11-v1`
- Starting Nightwatch SHA: `060fef41205b29210d9bd8416aca97c03b028e4f`
- Relevant architecture: `src/core/prodProvenance/**` (C-10.5 source-bound
  vocabularies), `src/core/prodPrivacy/**` (C-10 projection, opaque handles,
  policy), `src/core/prodEvidence/**` (firewall, persistence audit),
  `src/core/safety/realRunGate.ts` (DEV/NEXT authority, to be left alone),
  `src/core/safety/hosts.ts` (`KNOWN_PRODUCTION_HOSTS`, deny-only),
  `src/core/environment/index.ts` (D-4 allowlist).
- Dependencies: none outside the repository. Offline throughout.
- Established facts that must not be rediscovered: the full design
  reconciliation in the OpenSpec `audit.md` and `design.md`, including the
  eighteen-gate chain and the mapping from the historical `G0`–`G11`.

## Scope

C1 design reconciliation (complete) → C2 authorization and separation → C3 the
admission chain → C4 budgets, breakers, containment → C5 mock production and
the denial matrix → C6 PQ receipt → C7 hardening, registration and validation.

## Non-Goals

C-12 / P1; real production, DEV or NEXT contact; credentials; increasing
`READ_ONLY_PROVEN`; modifying C-10 or C-10.5.

## Safety Constraints

As SPEC. Loopback-only mock production; synthetic sentinels only.

## Architecture / Approach

See the OpenSpec `design.md`. The load-bearing choices:

- **Identity, not arithmetic.** The admission chain is a versioned named
  ordered list with a definition digest. The historical acceptance criterion was
  a COUNT, which is unfalsifiable: eleven checks can be run while a twelfth is
  omitted and still satisfy "all eleven exercised". Gate identity fails closed
  where a count cannot.
- **Separation is an import-graph property.** Enforced both directions by
  hardening, with shared modules taking policy by injection and no default,
  because a default policy is a silent allow.
- **The allowlist is built, never inverted.** A deny table that means "allow" in
  one mode is one boolean from catastrophe.
- **Zero contact is proven network-side.** An instrumented loopback server
  counts received requests; an internal boolean is not accepted as evidence.

## Milestones

### M1 — Design reconciliation

- Objective: resolve every conflict before writing code.
- Files/areas: OpenSpec `audit.md`, `design.md`.
- Implementation actions: classify all historical requirements; resolve the
  gate-count contradiction; document the identifier mapping.
- Acceptance criteria: no requirement left unclassified; no obsolete
  requirement implemented.
- Validation commands: `npm run handoff:check`
- Status: DONE

### M2 — Authorization class and separation

- Objective: a distinct, consumable `PROD_OBSERVE` authority that cannot be
  reached from the DEV/NEXT cone.
- Files/areas: `src/core/prodObserve/**` (new), `bin/hardening-check.mjs`.
- Implementation actions: authorization class with one-shot consumption;
  `productionRunGate`; external config loader with integrity validation;
  independent allowlist; import-graph hardening rules.
- Acceptance criteria: `realRunGate` byte-unchanged in behaviour; every
  separation rule negative-probed.
- Validation commands: `npm run typecheck`, `npm run hardening:check`
- Status: DONE

### M3 — The admission chain

- Objective: eighteen named gates, each individually falsifiable.
- Files/areas: `src/core/prodObserve/admissionChain.ts` and gate modules.
- Implementation actions: implement the chain and each gate; bind route
  authority to C-10.5 derivation and parameters to C-10 handles; kill switch at
  entry and pre-dispatch.
- Acceptance criteria: one-fault denial for every gate with its categorical
  reason.
- Validation commands: focused C-11 suites
- Status: DONE

### M4 — Budgets, breakers, containment

- Objective: race-safe reservation budgets, terminal breakers, categorical
  containment reporting.
- Acceptance criteria: concurrency cannot oversubscribe; a failed request is
  not refunded; the CI containment carve-out stays explicit.
- Validation commands: focused C-11 suites
- Status: DONE

### M5 — Mock production and the denial matrix

- Objective: loopback-only mock production; complete one-fault matrix with
  network-side zero-contact proof.
- Acceptance criteria: every pre-dispatch denial leaves the received-request
  count at zero, asserted against the server.
- Validation commands: focused C-11 suites
- Status: DONE

### M6 — Positive path and PQ receipt

- Objective: prove the kernel is not vacuously always-deny, and emit a
  tamper-resistant receipt.
- Acceptance criteria: exactly one expected request on the positive path; the
  full tamper matrix fails closed.
- Validation commands: focused C-11 suites
- Status: DONE

### M7 — Hardening, registration and validation

- Objective: every invariant mechanically enforced and proved non-vacuous;
  every suite gate-registered.
- Acceptance criteria: all negative probes detected; the registration validator
  fails on an unregistered suite.
- Validation commands: the full C-11 validation sequence
- Status: DONE

### M8 — Integration and exact-head CI

- Objective: certified closure.
- Acceptance criteria: all eleven required groups PASS at the exact head;
  canonical checkout clean; `origin/main` synchronized; `siblingWrites = 0`.
- Validation commands: `node bin/nightwatch-session.mjs integrate`, `gh run view`
- Status: NOT_STARTED

## Validation Strategy

Focused: the C-11 suites, `typecheck`, `hardening:check`. Global:
`handoff:check`, `project:check`, `agent:check`, `agent:audit`,
`gate:inventory`, `test:semantic-compat`, `campaign:synthetic`, all proxy and
containment suites, all C-10 and C-10.5 suites, the complete canonical
regression, `gate:local`, `gate:clean`, then exact-head GitHub Actions.

R-11's lesson applies throughout: commit before running a gate and do not touch
the tree while one runs, because a dirty checkout voids `PATCH_INTEGRITY` and
the clean gate outright.

## Decision Log

- 2026-09-03 — Decision: replace the gate COUNT with a versioned named ordered
  chain; reason: `design.md §5.2` says eleven and labels twelve, and the
  acceptance criterion was phrased as a count, which an implementation can
  satisfy while omitting a check; evidence: the labels `G0`–`G11`; consequence:
  the receipt records ordered gate IDs and a definition digest, and the
  historical mapping is documented rather than the number preserved.
- 2026-09-03 — Decision: eighteen gates, splitting host admission from
  resolved-address admission; reason: they are independent facts that `G6`
  conflated, and a host can be admitted while its resolved address set is not;
  consequence: each denies separately with its own categorical reason.
- 2026-09-03 — Decision: prove zero contact network-side; reason: an internal
  boolean cannot distinguish "denied" from "denied but already dispatched";
  consequence: the mock server is instrumented and the assertion is made against
  its received-request count.

## Discoveries

- The historical design's gate-count contradiction is real and load-bearing,
  not cosmetic: the acceptance criterion inherits it.
- `design.md §5.6` allows `ORDINARY_USER` at P2/P3 while the authorized stage
  policy requires `ORG_ENFORCED_READ_ONLY` from P2 onward. Recorded as a
  NARROWING rather than silently following either text.

## Deferred Work

- C-12 P1 passive production observation, which requires new explicit owner
  authorization after review of the completed C-11 evidence.

## Completion Criteria

Every SPEC acceptance criterion satisfied, with evidence in `STATE.md` and
`REPORT.md`.
