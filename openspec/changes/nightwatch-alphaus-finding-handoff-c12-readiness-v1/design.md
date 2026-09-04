# Design — AH-1 Alphaus finding handoff + C-12 operator readiness

## Handoff projection (BugDossier in, human-review artifact out)

The projector `projectAlphausFindingHandoff` is pure (no I/O, clock,
network). Input: a `BugDossier`, an optional `AiBugModelOutput` draft, an
observation-provenance record, asserted severity-evidence classes with a
provenance string, and optional class-removal evidence.

- **Facts** are copied from the dossier through closed vocabularies and
  bounded shapes; dossier identity is `candidateId` (no `dossierId` exists
  anywhere in triage — verified, not assumed).
- **Severity** maps asserted consequence classes to
  blocker/critical/major/minor by rank, gated on dossier READY + L2/L3 +
  non-empty provenance. Anything less yields UNKNOWN. Internal
  `technicalSeverity` never drives the organizational recommendation.
- **Catch stage** is provenance-driven: PRODUCTION without outage evidence
  yields `production` (never `production_outage`); LOCAL/DEV/SOURCE_ANALYSIS
  yield UNKNOWN (DEV has no Leslie value; local is not NEXT; source analysis
  without a reviewed PR is not `pr_review`).
- **Source** branches directly on the provenance boolean:
  `customerReported` requires a report reference and yields
  `customer_escaped`; otherwise `self_found`. No transform between them
  exists, so scoring/inference/convenience can never remap the value.
- **Team** is type-level UNKNOWN at v1 (no team-evidence source exists);
  **code owner** has no field at all (absence-tested).
- **Report type** is BUG_REPORT only on REPRODUCED/BOUNDED reproduction,
  BUG_CLASS_REMOVAL only on asserted systematic-prevention evidence,
  else UNKNOWN.
- **Drafts** are fully sentinel-scanned (including dropped fields) before
  projection; the four investigation texts are length-bounded.
- **Authority** is literal-typed (`humanReviewRequired: true`,
  `executable: false`, `externalPublication: 'PROHIBITED'`, no auto-file/
  approve), so weakening breaks compilation as well as tests.

## Preflight evaluator (descriptors in, readiness report out)

`evaluateC12Readiness` is pure over explicitly presented facts with an
injected clock. Ten BLOCKED_* codes cover implementation binding, PQ
binding, operator subject (present + OPERATOR_CREATED), scope config shape
(exact hostname, no wildcard/URL; sane/bounded/unexpired window), private
destination shape + approval, C-08b PROVEN-only deployment fact (INFERRED
explains itself as never-sufficient), attributing-proxy capability,
fresh unconsumed P1_OBSERVE authorization (inspected, never consumed), and
kill-switch armed + not engaged. All blockers report in one pass.

The cone duplicates two P1 literals (window cap, provenance classes) with
justification; a unit test pins them to the P1 source of truth (tests may
import P1; the cone may not).

## Isolation

`checkAlphausHandoffBoundary` asserts both cones import no
network/process/filesystem, browser, campaign, auth, P1, or C-11 machinery;
contain no submission-connector or bounty-scoring capability patterns; that
the handoff references the canonical BugDossier; and that no non-test file
outside the cones imports them. The preflight never consumes grants nor
loads live scope configs (asserted by identifier absence).
