# Workstream B — Fresh Source Bundle & Semantic Observer Integration

Parent task: `phase-13-real-campaign-semantic-runtime-integration`
Authority: local/source only. No DEV.

## B1. Goal

Make the real campaign source architecture capable of receiving a frozen, freshness-attested semantic expectation bundle and attaching the existing semantic oracle through the existing browser/network observer seam.

## B2. Source bundle DTO

Introduce one versioned, strict, safe data object representing semantic authority frozen for a campaign.

Required concepts:

- bundle version/ID;
- source repo ID and branch/ref;
- freshness-approved source SHA;
- expectation ID;
- target ID;
- source evidence digest;
- source derivation version;
- collection-admission version where applicable;
- resolver state;
- DEV reachability classification;
- approved campaign journey/operation mapping;
- `DEPLOYMENT_STATUS_UNRESOLVED`.

Unknown fields reject. Identity is deterministic.

No source code text, customer values, credentials, runtime body values, or deployment claims.

## B3. Freshness producer vs pure consumer

Keep source discovery outside pure triage/oracle consumers.

Producer boundary may use read-only Git/GitHub metadata and disposable filesystem snapshots. Pure semantic/campaign consumers receive only validated data.

No canonical sibling mutation.

## B4. Frozen bundle semantics

Once a campaign manifest freezes a semantic bundle:

- remote source movement does not silently update it;
- current executable comparison detects drift;
- resume stops or requires a new campaign;
- resolver source mismatch fails closed;
- stale/unavailable cannot be upgraded by caller flags.

## B5. Existing runtime authority mapping

Create a fixed table only for already-approved campaign journeys/operations that have mechanically derived semantic targets.

For each entry record:

- journey/operation ID;
- target ID;
- expected current expectation class/ID;
- route/operation authority provenance;
- whether browser semantic observation, API semantic observation, or both are mechanically available.

No arbitrary selector and no new target.

## B6. Semantic observer seam

Use the current `NightwatchContextOptions.semanticOracle` -> `NetworkObserver` path.

Do not create a second interception stack.

For supported campaign work:

- build semantic hook from validated current resolver;
- inject only the fixed target authority;
- let raw response exist transiently for projection;
- persist only safe receipts/findings/summaries;
- attach semantic evidence to the resulting campaign candidate.

## B7. Unsupported mappings

If an approved campaign operation has no mechanically valid semantic expectation or no existing semantic observer path, classify it explicitly as unsupported for semantic authority while preserving protocol-only campaign behavior.

No guessing.

## B8. Current-source canary

At local acceptance:

- fresh-resolve `mobingilabs/ripple-api` master;
- create a disposable snapshot;
- derive current historical + collection expectations needed by the fixed mapping;
- resolve them at exact SHA;
- record count and failures;
- classify any source change;
- prove canonical sibling writes 0.

No product contact.

## B9. Tests

Minimum:

1. bundle strict schema;
2. deterministic identity;
3. bundle source SHA drift;
4. evidence-digest drift;
5. derivation-version drift;
6. unavailable source;
7. stale resolver;
8. fixed mapping accepts known target;
9. arbitrary target rejects;
10. arbitrary journey rejects;
11. unsupported approved surface remains protocol-only;
12. semanticOracle injected only when bundle resolved/current;
13. partial receipt preserved;
14. anomaly finding preserved safely;
15. no raw response persistence;
16. bundle frozen across remote-advance fixture;
17. fresh new campaign bundle can rederive after source advance;
18. canonical sibling write 0 canary;
19. privacy sentinel 0;
20. determinism >=3.

## B10. Acceptance

The real campaign source code must have one mechanically bounded path from current source bundle -> resolver -> existing semantic observer seam -> safe campaign semantic evidence, with no DEV execution and no new product authority.
