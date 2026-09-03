# Proposal — C-05 Universe Discovery + Admission Hygiene

## Why

149 git repositories sit under Nightwatch's sibling root. Six are admitted.
Nothing in the codebase states that as a rule: admission is computed as
`RIPPLE_REPOSITORIES` filtered to `scope === 'IN_SCOPE'` INTERSECTED with the
keys of `APPROVED_ROOTS`, across two files. Neither list is the owner-approved
universe, and the real membership rule is an intersection nobody wrote down. A
repository present in one and missing from the other is silently not admitted
rather than reported as a contradiction.

Discovery does not exist as a separate concept at all, so there is no place to
say "we can see 149 repositories and may read 6".

Two further problems sit behind that.

`src/core/changeIntelligence/map.ts` persists mutable Git state —
`checkedOutSha`, `trackingSha`, `ahead`, `behind`, `dirty` — as normative
source configuration. Measured against live Git with no fetch, the
checkout-local fields are all still accurate, but **10 of 18 remote-tracking
fields have diverged**: `ouchan` records `behind: 25` and is 310 behind;
`ripple-ui` records 21 and is 74. Nothing detects the divergence, so a reader
cannot tell a current value from a decayed one.

And the claim that unapproved repositories are unread rests on
`operations = 0`, which is a statement about OUTPUT. An analyzer that opened
files and derived nothing would satisfy it.

## What changes

1. Discovery becomes a first-class, admission-free operation that enumerates
   repository identity and classifies each as admitted or discovered-not-
   admitted. Existence, naming, language, organization, presence of OpenAPI,
   having routes and filesystem adjacency are each explicitly insufficient for
   admission.
2. One canonical owner-approved admission authority, from which every consumer
   derives. A repository named in one place and absent from the other becomes a
   declared error.
3. Mutable Git state leaves the persisted normative record and is queried live
   where needed. Stable identity stays durable; historical snapshots stay
   labelled historical.
4. The sibling-source read boundary is instrumented so the guarantee is
   `analyzerSourceReads[unapprovedRepo] === 0` at the read call.
5. `alphauslabs/blueinternal` is admitted with root `openapiv2`, parsed by the
   EXISTING OpenAPI machinery. Measured: 46 paths, **51 operations**, 84
   definitions. The historical ~57 estimate is refuted, not matched.
6. `wave-api` — whose exact identity from workspace truth is
   **`mobingilabs/wave-api`** — is admitted with root `src`, parsed by the
   EXISTING YAML route parser. Measured: **55 route keys**, in the same
   `"get:/path":` form `ripple-api` already uses.

## What does not change

No third repository is admitted. No new parser is written where one already
applies. No classification, completeness or truncation claim is weakened to
raise a yield number. No sibling repository is written to. There is no
production, NEXT or DEV contact, and C-12 is not begun.

## Yield is an observation, not a target

The programme's historical `≥ 900 operations` goal is **already exceeded at
1,745 before this campaign admits anything**. It is therefore reported and
never used as a reason to admit a repository or relax a classification. The
enumeration is TRUNCATED with `remainingUnknown: true` today, and admitting
more source must not convert that into a clean number.
