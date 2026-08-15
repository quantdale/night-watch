// GENERATED FILE — see src/core/selfDev/adoptedCases.ts
// (renderAdoptedCatalogSource). Do not hand-edit.
//
// nightwatch.selfdev-adopted-case-catalog.generated.v1
//
// This file must remain pure declarative data: no imports, no functions, no
// expressions beyond array/object/string literals. It is the one file the
// Phase 8B sandbox adoption executor is permitted to rewrite, and only ever
// inside a disposable private source mirror — never in this canonical
// checkout at runtime.

export const SELFDEV_ADOPTED_CASES = [
  {
    "schemaVersion": "nightwatch.selfdev-adopted-case.v1",
    "adoptedCaseId": "adopted-case:sha256:90248aaeaf06187038973b0a03f2baa27bdf6f270b4fc43338e1bded74b0e234",
    "fixtureId": "selfdev.fixture.local-regression.v1",
    "actionIds": [
      "selfdev.synthetic.expand-summary"
    ],
    "assertionIds": [
      "selfdev.assert.state.expanded",
      "selfdev.assert.transition.expansion",
      "selfdev.assert.oracle.structural-stable"
    ],
    "equivalentFingerprint": "sha256:6a322450978992f44698256b3371fbe8b13ca70ac4b489e77b6d2ef5bab27663",
    "coverageClasses": [
      "oracle:structural-stable",
      "state-action:ready:selfdev.synthetic.expand-summary",
      "transition:ready-read-only-expansion"
    ],
    "strategyClass": "DECLARATIVE_REGRESSION_CATALOG_PROMOTION"
  }
];
