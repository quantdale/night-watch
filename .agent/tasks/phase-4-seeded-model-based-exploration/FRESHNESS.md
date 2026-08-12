# Phase 4 Source Freshness and Model Invalidation Ledger

Status: `LOCAL_TRACKING_REF_ONLY`

Nightwatch does not have deployment identity for the inspected Alphaus
checkouts. A local tracking ref is not treated as the deployed source. Phase 4
records both the source basis of every approved action and any relevant delta
between that basis and the locally available tracking ref.

## Relevant source bases

| repository | model source basis | local tracking ref | freshness | relevant result |
|---|---|---|---|---|
| `mobingilabs/ripple-ui` | `d80b161b684d9153c7e5acaa65ae1752d93d8ba9` | `origin/dev` = `f6b2d2f6d580ce52227596b4f822d983bbda533b` | `LOCAL_TRACKING_REF_ONLY`; checkout is 21 commits behind tracking ref | relevant paths unchanged for J1/J2; J3 `AccountManagement.vue` and `accounts.js` changed |
| `mobingilabs/ripple-api` | `27bb007ad0c798800b6bd3b29760c966422966e7` | `origin/master` = `07114cb2506c9bc8c47c90e8e01b5d9edd6bb9de` | `LOCAL_TRACKING_REF_ONLY`; 4 commits behind | reviewed J1/J2/J3 legacy endpoint routes; deployment unresolved |
| `mobingilabs/ouchan` | `565f00a87fb7616cc23c45d4ffeabee38a41c65f` | `origin/master` = `16910fc...` | `LOCAL_TRACKING_REF_ONLY`; 55 commits behind at this audit | no Phase 4 action admitted from the delta |
| `alphauslabs/blueapi` | `691422e5dc81afd263d064986fb50fcb3ea432a9` | local `origin/main` is 2 commits ahead | `LOCAL_TRACKING_REF_ONLY` | read/write protobuf shape used only to corroborate the trusted J3 anchor |

The ellipses above are deliberate in this narrative ledger for legacy
cross-references; the machine-readable action provenance carries the complete
SHA strings.

## Narrow delta review

The relevant Ripple UI comparison was:

```text
d80b161b684d9153c7e5acaa65ae1752d93d8ba9..f6b2d2f6d580ce52227596b4f822d983bbda533b
```

Only these relevant paths changed:

- `src/pages/Account/AccountManagement/AccountManagement.vue`: account fetch
  now passes `{ vendor, withAors: true }`.
- `src/vuex/api/accounts.js`: the fetch action optionally calls
  `streamPromise('POST', \`cost/v1/${vendor}/aors:read\`)` and merges the
  response into the local list.

This is a source-semantic change, not a product anomaly. Since deployment
identity is unresolved and the supplementary endpoint is outside the frozen
J3 semantic registry, `p4.j3.vendor-switch` is `SOURCE_STALE_REVIEW_REQUIRED`
and cannot be selected by the planner.

## Invalidation policy

The Phase 4 model fingerprint includes this freshness ledger and all action
source SHAs. A relevant source change marks an action `STALE`/`REVIEW_REQUIRED`
before planning. An unrelated documentation change does not invalidate an
action. Phase 3 remains the change-intelligence owner; Phase 4 consumes its
impact/provenance output and does not advance its baseline during validation.
