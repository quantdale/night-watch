# Spec — Deployment fact acquisition

Closes F-04. Measured from `src/core/source/censusFigureLedger.ts` at
`36bd493`: `SOURCE_OPERATIONS: 1851`, `DEPLOYMENT_BINDINGS: 1851`,
`POSITIVE_DEPLOYMENT_FACTS: 0`. The master plan states the consequence: without
C-08b read-only access to `mochi`'s
`services/{env}/{appproxy,serviceproxy}/ingress.yaml`, "P2 grants authority
from an `INFERENCE`, violating `I-3`".

## ADDED Requirements

### Requirement: Zero positive deployment facts SHALL mechanically refuse every production read, not merely leave it unauthorized

Today C-13 and C-14 are described as `NOT_AUTHORIZED`, which reads as "awaiting
a decision". The measured truth is stronger: with `POSITIVE_DEPLOYMENT_FACTS`
at 0, no production read can be traced to a `DEPLOYMENT_FACT` route → endpoint
binding, so an authorization granted today would produce an I-3 violation
rather than a campaign.

The system SHALL enforce this structurally. A production read request SHALL be
refused at construction unless the route it targets carries a positive
deployment fact, with the existing fail-closed error discipline and a distinct
code (`PRODUCTION_READ_NO_DEPLOYMENT_FACT`). The refusal SHALL be independent of
authorization state: an authorized campaign against a route with no positive
fact SHALL still be refused.

The guard SHALL be proven by a negative probe that removes it and observes the
suite fail, per the repository's existing mutation discipline. A guard whose
condition is never true in the suite is a guard that has never measured
anything.

#### Scenario: an authorized read against an inferred route is still refused
- **WHEN** a production read targets a route whose binding class is
  `INFERENCE`, with a valid authorization present
- **THEN** construction fails with `PRODUCTION_READ_NO_DEPLOYMENT_FACT`
- **AND** no request is issued

#### Scenario: the guard is proven live
- **WHEN** the guard is removed and the suite is run
- **THEN** at least one case fails
- **AND** the mutation is recorded in the campaign's proof ledger

#### Scenario: the count gates the capability, not a flag
- **WHEN** `POSITIVE_DEPLOYMENT_FACTS` is 0
- **THEN** the production-read capability reports itself unavailable with the
  count as its reason

### Requirement: C-08b read-only manifest access SHALL be pursued as the critical-path prerequisite it is

C-08b sits in the master plan as one unchecked row among eleven. It is the only
row whose absence makes two later campaigns structurally impossible. It SHALL
be recorded as the critical-path prerequisite for C-13 and C-14 in
`docs/ROADMAP.md`, `docs/CURRENT_STATE.md` and the master plan, and its
organizational lead time SHALL be stated.

What is required is narrow and SHALL be specified narrowly, because a broad ask
is a slower ask: read-only access to `mochi` at
`services/{env}/{appproxy,serviceproxy}/ingress.yaml`, for the environments
Nightwatch is permitted to reason about. No write access, no other path, no
credential beyond read.

Obtaining the access is an owner and organizational action. Nightwatch SHALL
NOT attempt to acquire it, infer it, or work around it, and SHALL NOT treat a
copy of a manifest obtained by any other route as equivalent.

#### Scenario: the ask is bounded to the manifest paths
- **WHEN** the access request is recorded
- **THEN** it names exactly the ingress manifest paths and read-only access
- **AND** it requests no write capability and no other path

#### Scenario: a workaround is refused
- **WHEN** a manifest is supplied from any source other than the approved
  read-only checkout
- **THEN** the binding derivation refuses it
- **AND** no deployment fact is produced

### Requirement: A deployment fact SHALL be derived mechanically from current manifest source, never asserted

When access exists, route → endpoint binding SHALL follow the same discipline
every other source-derived fact in this repository follows: a bounded reader
over exact current source, a deterministic evidence digest over the normalized
structure used to derive, provenance bound to `repo @ SHA : path`, and
fail-closed behaviour on ambiguity.

`src/core/source/deploymentBinding.ts` already carries the binding-class
vocabulary. The derivation SHALL produce `DEPLOYMENT_FACT` only where the
manifest proves the route-to-endpoint mapping unambiguously; an ambiguous,
multi-match, templated or environment-conditional mapping SHALL yield an
explicit unknown, never a best guess. U-1 and U-2 SHALL be settled by evidence
or remain explicit unknowns.

A changed manifest SHALL require fresh derivation. A fact SHALL NOT be silently
re-bound to a new SHA, consistent with the Phase 9A.1 rule for expectations.

#### Scenario: an ambiguous mapping yields unknown, not a fact
- **WHEN** a route matches more than one ingress entry
- **THEN** the binding class is an explicit unknown with the ambiguity recorded
- **AND** `POSITIVE_DEPLOYMENT_FACTS` does not increment

#### Scenario: a stale manifest invalidates the fact
- **WHEN** the manifest SHA changes
- **THEN** facts derived from the prior SHA are reported stale
- **AND** they are not re-bound without fresh derivation

#### Scenario: the census ledger is the only writer of the figure
- **WHEN** the positive-fact count changes
- **THEN** `CENSUS_FIGURES` is updated and every document stating the figure is
  re-checked against it
- **AND** a document carrying the old figure fails the ledger check
