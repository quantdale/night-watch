// ---------------------------------------------------------------------------
// Phase 17 synthetic change-impact corpus.
//
// These are source-shape fixtures only. They contain no sibling-repository
// contents, customer values, credentials, deployment claims, or runtime
// authority. The catalog intentionally mixes proven, unresolved, and
// non-runtime changes so the selector/portfolio bridge cannot be measured
// only on happy paths.
// ---------------------------------------------------------------------------

import type { ChangedFile, JourneyId } from '../../src/core/changeIntelligence/types';

export const PHASE17_CHANGE_IMPACT_FIXTURE_VERSION =
  'nightwatch.phase17.change-impact-fixtures.v1' as const;

export interface Phase17ChangeImpactFixture {
  readonly fixtureId: string;
  readonly repoId: string;
  readonly files: readonly Omit<ChangedFile, 'repoId'>[];
  readonly expectedSelectedJourneys: readonly JourneyId[];
  readonly expectedFallback: boolean;
  readonly staleEdgeId?: string;
}

export const PHASE17_CHANGE_IMPACT_FIXTURES: readonly Phase17ChangeImpactFixture[] = Object.freeze([
  {
    fixtureId: 'direct-j1-modify',
    repoId: 'mobingilabs/ripple-ui',
    files: [{ path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }],
    expectedSelectedJourneys: ['ripple-payer-exchange-read'],
    expectedFallback: false,
  },
  {
    fixtureId: 'shared-router-modify',
    repoId: 'mobingilabs/ripple-ui',
    files: [{ path: 'src/router.js', status: 'modify' }],
    expectedSelectedJourneys: ['ripple-payer-exchange-read', 'ripple-common-exchange-read', 'ripple-account-inventory'],
    expectedFallback: false,
  },
  {
    fixtureId: 'transitive-table-modify',
    repoId: 'mobingilabs/ripple-ui',
    files: [{ path: 'src/components/CustomDataTable/CustomDataTable.vue', status: 'modify' }],
    expectedSelectedJourneys: ['ripple-payer-exchange-read', 'ripple-common-exchange-read', 'ripple-account-inventory'],
    expectedFallback: false,
  },
  {
    fixtureId: 'irrelevant-doc-modify',
    repoId: 'mobingilabs/ripple-ui',
    files: [{ path: 'docs/change-intelligence.md', status: 'modify' }],
    expectedSelectedJourneys: [],
    expectedFallback: false,
  },
  {
    fixtureId: 'ambiguous-known-plus-unknown-runtime',
    repoId: 'mobingilabs/ripple-ui',
    files: [
      { path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' },
      { path: 'src/runtime/new-indirection.js', status: 'modify' },
    ],
    expectedSelectedJourneys: ['ripple-payer-exchange-read', 'ripple-common-exchange-read', 'ripple-account-inventory'],
    expectedFallback: true,
  },
  {
    fixtureId: 'deleted-j3-client',
    repoId: 'mobingilabs/ripple-ui',
    files: [{ path: 'src/vuex/api/accounts.js', status: 'delete' }],
    expectedSelectedJourneys: ['ripple-account-inventory'],
    expectedFallback: false,
  },
  {
    fixtureId: 'renamed-j1-page',
    repoId: 'mobingilabs/ripple-ui',
    files: [{ path: 'src/pages/ExchangeRate_v2/PayerExchangeRate/Renamed.vue', previousPath: 'src/pages/ExchangeRate_v2/PayerExchangeRate/index.vue', status: 'rename' }],
    expectedSelectedJourneys: ['ripple-payer-exchange-read'],
    expectedFallback: false,
  },
  {
    fixtureId: 'stale-j1-edge',
    repoId: 'mobingilabs/ripple-ui',
    files: [{ path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' }],
    expectedSelectedJourneys: ['ripple-payer-exchange-read', 'ripple-common-exchange-read', 'ripple-account-inventory'],
    expectedFallback: true,
    staleEdgeId: 'j1-client',
  },
  {
    fixtureId: 'simultaneous-j1-j2',
    repoId: 'mobingilabs/ripple-ui',
    files: [
      { path: 'src/vuex/api/exchangeRatePayer_v2.js', status: 'modify' },
      { path: 'src/vuex/api/exchangeRateGlobal.js', status: 'modify' },
    ],
    expectedSelectedJourneys: ['ripple-payer-exchange-read', 'ripple-common-exchange-read'],
    expectedFallback: false,
  },
]);
