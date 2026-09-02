# C-11 `PROD_OBSERVE` Safety Kernel

## Task purpose

Implement and certify the `PROD_OBSERVE` production-qualification kernel
against MOCK/SYNTHETIC production only, so that Nightwatch is demonstrably
incapable of issuing a production request unless every required machine
authority grants it.

Observable outcome: a versioned Production Qualification receipt carrying the
complete ordered gate chain exercised against mock production, 100% denial of
every non-admitted case with network-side proof of zero contact before
dispatch, one non-vacuous positive synthetic path, and D-4 textually and
semantically intact.

## Established starting state

- Task ID: `nightwatch-prod-observe-safety-kernel-c11-v1`
- Starting SHA: `060fef41205b29210d9bd8416aca97c03b028e4f`
- Predecessor: `nightwatch-proxy-gate-reliability-r11-v1`, `COMPLETE` and
  certified by exact-head run `33656654543` / job `100336766433` at `e11cf64`.
- The design reconciliation is COMPLETE and recorded in the OpenSpec
  `audit.md` and `design.md`. Do not re-derive it. In particular:
  - the historical `design.md §5.2` "eleven gates" labelled `G0`–`G11` is
    twelve identifiers; the count is replaced by a versioned NAMED chain of
    eighteen gates, with the mapping documented;
  - `config/observation/prod.v1.json` is SUPERSEDED by F-09 (external-only);
  - "invert `KNOWN_PRODUCTION_HOSTS`" is SUPERSEDED by F-10;
  - reusing or parameterizing `realRunGate` is SUPERSEDED by F-11;
  - "a separate launcher is separation" is SUPERSEDED by F-12;
  - P1 passive observation is DEFERRED_TO_LATER_STAGE per F-13.
- C-11 consumes existing surfaces rather than reinventing them:
  `src/core/prodProvenance/**` for source-bound vocabularies,
  `src/core/prodPrivacy/parameterProvenance.ts` for opaque handles,
  `src/core/prodPrivacy/policy.ts` for the production privacy policy, and
  `src/core/prodEvidence/**` for the firewall and persistence audit.

## Required deliverables

- A distinct `PROD_OBSERVE` authorization class: finite, scoped, expiring,
  one-shot, failing `ALREADY_CONSUMED` on reuse, aliased to nothing.
- A distinct `productionRunGate`; `realRunGate` unchanged.
- Mechanically enforced import-graph separation in both directions, with
  injected policy and no default.
- External-only observation configuration with full integrity validation, and a
  production allowlist built solely from it.
- The versioned named ordered admission chain, digested, with all eighteen
  gates implemented and individually falsifiable.
- Reservation-before-dispatch race-safe budgets; terminal categorical breakers;
  kill switch at entry and immediately before dispatch.
- A loopback-only mock production environment covering the full fixture set.
- A complete one-fault denial matrix with network-side zero-contact proof.
- One non-vacuous positive synthetic PQ path.
- A versioned privacy-safe PQ receipt with a full tamper matrix.
- Hardening rules for every C-11 invariant, each proved non-vacuous.
- A validator that fails when an intended C-11 suite is gate-unregistered.

## Explicit non-goals

- C-12 / P1 real production observation is NOT implemented or begun.
- No real production, DEV or NEXT contact of any kind.
- No credential, auth-state, cookie or token is created, requested or read.
- `READ_ONLY_PROVEN` is not increased; C-06 proof semantics are untouched.
- No repository-owned production allowlist; no production host added anywhere
  outside the unloadable `config/environments/production.json`.
- C-10 privacy algebra and C-10.5 provenance binding are consumed, not modified.

## Safety constraints

- Mock production is loopback-only. No external DNS, no real Alphaus host.
- No cloud, IAM, Kubernetes, datastore or customer-data access. No external
  publication. No sibling-repository write; siblings are read only.
- Synthetic sentinels only; no real customer identifier in any test or record.
- No force push, history rewrite, destructive reset, `skip-worktree`,
  `assume-unchanged`, hidden Git configuration, or repository-local hook.
- No test deletion, `test.skip`, runner retry, or timeout inflation as a
  correctness fix. No hardening, privacy, C-06, C-10 or C-10.5 rule weakened.
- Implementation happens only in the owned session worktree
  `session/nightwatch-prod-observe-safety-k-5d5e338f`.

## Acceptance criteria

- Reconciled design implemented; gate-count ambiguity resolved by name.
- D-4 intact; production remains non-loadable; deny table never inverted.
- Separate production run gate; import graphs mechanically separated.
- Every gate individually tested; all one-fault cases deny; every pre-dispatch
  denial proven to leave the mock server's request count at zero.
- Kill switch checked at entry and pre-dispatch, with the revocation race
  tested.
- Positive synthetic path succeeds with exactly one expected request.
- PQ receipt valid and tamper-resistant; persistence audit clean.
- Zero real production, DEV or NEXT contact; zero credentials inspected;
  `siblingWrites = 0`.
- All C-11 suites gate-registered; canonical regression zero failures; no new
  skipped tests; `gate:local` PASS; clean Node 20 gate PASS; exact-head GitHub
  Actions PASS with all eleven required groups.

## Declared Deletions

None. This task deletes no tracked file.
