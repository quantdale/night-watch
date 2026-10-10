Implementation is outside the planning-only audit campaign. These tasks are declared not in scope; none has been performed.

## 1. Freeze actions and proof vocabulary

- [ ] ~~1.1 Discover every action kind, catalog delta, runtime state mutation, engine comparison, replay path, and test fixture.~~
- [ ] ~~1.2 Add real-runtime regressions for no-op/wrong/stale/ambiguous interactions and expected-value injection.~~
- [ ] ~~1.3 Define bounded observer, predicate, generation, settlement, delta, and safe error schemas for each action kind.~~

## 2. Implement observed postconditions

- [ ] ~~2.1 Add source-backed before/after observers for selector option, vendor tab, column sort, and route actions.~~
- [ ] ~~2.2 Use one bounded stable-settlement coordinator for UI and expected reads.~~
- [ ] ~~2.3 Derive safe state/delta/next state only from admitted observations; remove expected-value mutation.~~

## 3. Bind engine and replay

- [ ] ~~3.1 Require postcondition proof in engine transition validation and prevent advancement on uncertainty.~~
- [ ] ~~3.2 Bind transition/replay identity to observer contract and current document/context generation.~~
- [ ] ~~3.3 Keep unprovable actions unavailable and preserve the privacy boundary.~~

## 4. Adversarial proof and acceptance

- [ ] ~~4.1 Test no-op, wrong, stale, duplicate, timeout, document-replacement, UI/network disagreement, and sort-direction cases.~~
- [ ] ~~4.2 Register mutations for expected-value injection, missing generation, skipped stability, and state advancement after failure.~~
- [ ] ~~4.3 Run focused exploration suites, typecheck, hardening/mutations, local/clean/topology gates, and full regression with local fixtures only.~~
- [ ] ~~4.4 Update architecture/source-contract truth and integrate only through a separately authorized owned session.~~
