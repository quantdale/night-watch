# Phase 10B — Contained DEV Deep-Semantic Acceptance (record)

> D-60, 2026-08-17. Authorization:
> `PHASE_10B_CONTAINED_DEV_SEMANTIC_ACCEPTANCE_ONLY` (owner-pasted prompt).
> Task records:
> `.agent/tasks/phase-10b-contained-dev-deep-semantic-acceptance/`.

## Outcome

```
PHASE_10B_STATUS: COMPLETE
PHASE_10B: COMPLETE_DEV_DEEP_SEMANTIC_ACCEPTANCE_VERIFIED
PHASE_10B_DEV_RESULT: PASS
DEEP_INVARIANT_DEV_VALIDATION: VERIFIED
PRODUCT_SEMANTIC_MISMATCH: NONE_OBSERVED
PHASE_10_STATUS: COMPLETE
NEXT ACTION: STOP
```

ONE current real-source v2 deep semantic contract was verified against the
contained DEV product: exactly ONE launcher invocation owning FIRST + ONE
fresh-context REPLAY of the fixed `ripple-common-exchange-read` journey
(`ripple.common-exchange.read`, KNOWN_READ), evaluating the CURRENT deep
expectation `ripple.common-exchange.read.real-source-deep` re-derived at the
freshness-approved snapshot.

## Fixed identity and deep contract

- journeyId: `ripple-common-exchange-read`
- targetId: `ripple.common-exchange.read`
- expectationId: `ripple.common-exchange.read.real-source-deep`
- source SHA (approved + observed): `169df39d3cdf56c88f98d45d06eae6e48c3d8f6d`
  (mobingilabs/ripple-api master; unchanged from Phase 10A — no drift)
- journey source: `818ce2da19a25b31d715221c8cde30aae837fd77`
  (mobingilabs/ripple-ui dev; unchanged — no journey drift)
- evidence digest: `ev:sha256:1447fe1342d804528a062b73`
- resolved invariant set (4, all current): `TYPE_MATCH [] ARRAY`;
  `FIELD_PRESENT [0, month]`; `FIELD_PRESENT [0, exchange_rate]`;
  `TYPE_MATCH [0, exchange_rate] OBJECT`
- expectedInvariantTotal: 4 (derived from the resolved expectation)
- required deep invariant: `TYPE_MATCH [0, exchange_rate] OBJECT` (asserted
  present before count comparison)

## Acceptance evidence (safe)

Artifact: `artifacts/nightwatch-20260816T161421Z-878e-phase10b-acceptance.json`
plus per-observation recording dirs (`...-first`, `...-replay`) with
manifest/events/network-metadata/proxy/repositories/summary only — no raw
bodies, screenshots, traces, or credentials.

| pass | resolved | receipts | outcome | total | pass | N/A | violations | findings | deep invariant observed |
|---|---|---|---|---|---|---|---|---|---|
| FIRST | 1 | 1 | PASS | 4 | 4 | 0 | 0 | 0 | yes |
| REPLAY (fresh context) | 1 | 1 | PASS | 4 | 4 | 0 | 0 | 0 | yes |

- semanticReplayDeterministic: true; journeyReplayDeterministic: true
- source/evidence identity identical across passes
- safety vector (both passes): production 0, NEXT 0, KNOWN_MUTATION 0,
  ACTION_CAUSED_UNKNOWN 0, unknown destinations 0, proxy hard violations 0,
  DB 0, infra 0, screenshots 0, authenticated traces 0, raw body
  persistence 0, AI/model calls 0, Alphaus writes 0
- privacy structural audit: PASS (0 raw body files / screenshots / traces /
  storage-state copies / raw semantic scalars / credential fields)
- sibling repo task-caused changes: 0 (pre-existing dirty state
  mtime-verified; FIRST == REPLAY snapshots identical)
- launcherInvocations 1; browserContextsCreated 2; devObservationPasses 2;
  completedJourneyPairs 1

## Gates before product contact

- Historical Phase 9B harness preserved byte-identical (9B regression 34/34);
  Phase 10B harness matrix 24/24; isolated full-history checkout
  1134 passed / 4 skipped / 0 failed; campaign:synthetic 27/27;
  owner-provenance 91/91; agent:check/audit PASS; project:check + catalog
  integrity PASS at clean tree.
- Substantive checkpoint `658ca11bedcc422eb63495b2963f8cd32dcbe7f6`; exact
  implementation CI `31957667198` completed / success (33/33 incl. the
  Phase 10B LOCAL/SYNTHETIC matrix step); GitHub Actions never contacts DEV.
- §17 fresh remote re-discovery immediately before the launcher: PASS
  (both heads unchanged).
- Auth structural gate (boolean-only): PASS (file valid, regular, 0600, no
  symlink; token structurally present; env dev; app alphaus; cookie
  page-readable; unexpired; re-checked before FIRST and before REPLAY).
- Containment: L0 CDP Fetch guard, L1 HTTP route policy, L2 WebSocket
  policy, L3 ServiceWorker/SharedWorker containment, L4 unrouted request
  detection, L5 mandatory loopback proxy; QUIC off, non-proxied WebRTC off,
  trace off, screenshots off, raw response persistence off, DOM snapshot
  off, mutation registry ON.

## Meaning and limits (honest)

- This proves ONE real current L3 source-derived semantic contract
  (including the item-level type contract) executes and PASSES against the
  contained DEV product — root-array PASS alone would NOT have been
  acceptance, and the deep invariant was decisively evaluated (zero N/A).
- It does NOT prove all exchange-rate semantics are correct; no payload
  values were retained (aggregate receipts only, §10); item-0 blueprint
  convention; synthetic corpus precision is not production precision.
- Phase 9B (`...real-source-shape`, D-57) remains historical-only evidence;
  the deep identity is distinct.

## Harness (additive, narrow)

- `src/core/phase10b/deepAcceptance.ts` (pure, no fs/network/DB/AI
  authority; hardening-guarded)
- `bin/phase10b-launcher-args.mjs`, `bin/phase10b-real.mjs`
- `playwright.phase10b.config.ts`,
  `tests/manual/phase10b-contained-dev-deep-semantic.ts`
- `tests/unit/phase10bHarness.test.ts` (24-item matrix)
- `bin/hardening-check.mjs` Phase 10B purity + integration seam guards;
  `.github/workflows/hardening.yml` Phase 10B matrix step (LOCAL/SYNTHETIC)
- npm script `phase10b:real`; no journey/expectation/target/URL selectors,
  no fallback, no retry.
