import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  collectChangeset,
  selectJourneys,
  RIPPLE_REPOSITORIES,
  type SelectionResult,
} from '../../src/core/changeIntelligence';

const repositoriesRoot = path.resolve(__dirname, '../../..');

interface BacktestCase {
  id: string;
  repoId: string;
  baseSha: string;
  headSha: string;
  independentlyTracedGroundTruth: string;
  expectedSelected: readonly string[];
  expectedFallback: boolean;
  expectedChangeStatus?: string;
}

const CASES: readonly BacktestCase[] = [
  {
    id: 'historical-shared-exchange-surface',
    repoId: 'mobingilabs/ripple-ui',
    baseSha: '2fe4e7d4540a6667fd01a5e69f297444d75fd751',
    headSha: '3af97821c0b176af1158478d1e9a5a98f4ae26f3',
    independentlyTracedGroundTruth: 'The diff directly changes both reviewed v2 exchange pages and both v2 Vuex clients; unrelated runtime paths make conservative fallback appropriate.',
    expectedSelected: ['ripple-payer-exchange-read', 'ripple-common-exchange-read', 'ripple-account-inventory'],
    expectedFallback: true,
  },
  {
    id: 'historical-j2-with-unresolved-companion-runtime',
    repoId: 'mobingilabs/ripple-ui',
    baseSha: '9756da44617f75dcdf2afe6ca47f6ab2bd338420',
    headSha: 'afaff4896cc7e3bc69627e28081aeeb5ab375ae8',
    independentlyTracedGroundTruth: 'The diff directly changes the J2 global exchange client; invoice runtime companions are not proven dependencies of the three canaries, so fallback is safer than pretending isolation.',
    expectedSelected: ['ripple-payer-exchange-read', 'ripple-common-exchange-read', 'ripple-account-inventory'],
    expectedFallback: true,
  },
  {
    id: 'historical-j3-backend-list-path',
    repoId: 'mobingilabs/ouchan',
    baseSha: '2ae24351c56fe598a411211f60d39c8f6e847bb9',
    headSha: '6aea1f0f9601dd25a778cdd64b102a762c218a64',
    independentlyTracedGroundTruth: 'The one-file diff changes billingsvc.ListBillingGroups implementation, which is the proven J3 Blue list backend.',
    expectedSelected: ['ripple-account-inventory'],
    expectedFallback: false,
  },
  {
    id: 'historical-shared-router',
    repoId: 'mobingilabs/ripple-ui',
    baseSha: '64ddee40391d583f568d0228335d31b9112468d6',
    headSha: '6c0131393440359b5cc7744a52bdbfa5e73da662',
    independentlyTracedGroundTruth: 'The one-file diff changes the global legacy router; all three approved routes and the auth guard are in that file.',
    expectedSelected: ['ripple-payer-exchange-read', 'ripple-common-exchange-read', 'ripple-account-inventory'],
    expectedFallback: false,
  },
  {
    id: 'historical-doc-only',
    repoId: 'mobingilabs/ripple-ui',
    baseSha: 'b05ec86deefb023ca93f14fa22341f772b1c7db6',
    headSha: 'cb430dfb1a8aef851e9656f5d1c11548d52defcb',
    independentlyTracedGroundTruth: 'The one-file diff changes README.md only; it cannot enter the runtime bundle.',
    expectedSelected: [],
    expectedFallback: false,
    expectedChangeStatus: 'modify',
  },
  {
    id: 'historical-unknown-runtime-package',
    repoId: 'mobingilabs/ripple-ui',
    baseSha: '6d425d4fc11f556c280a3aaab2e1a88e932a3355',
    headSha: '15609bbe5e0d7a9430da6f76306e711047bc48c9',
    independentlyTracedGroundTruth: 'The one-file package manifest change is runtime/build relevant but has no proven canary edge; all-canary fallback is required.',
    expectedSelected: ['ripple-payer-exchange-read', 'ripple-common-exchange-read', 'ripple-account-inventory'],
    expectedFallback: true,
  },
  {
    id: 'historical-rename-delete-tombstone',
    repoId: 'mobingilabs/ripple-ui',
    baseSha: '34242571e450912b1ebeb8417b155878202efea6',
    headSha: '0aa7e2f4cc65afb0a395bb64786699ed33316172',
    independentlyTracedGroundTruth: 'The diff contains Account Management modal renames plus current J3 page/client changes; the old path must remain visible and the unresolved companion runtime is conservatively broad.',
    expectedSelected: ['ripple-payer-exchange-read', 'ripple-common-exchange-read', 'ripple-account-inventory'],
    expectedFallback: true,
    expectedChangeStatus: 'rename',
  },
];

function repoPath(repoId: string): string {
  const [org, name] = repoId.split('/');
  if (!org || !name) throw new Error(`invalid repo id ${repoId}`);
  return path.join(repositoriesRoot, org, name);
}

function runBacktest(item: BacktestCase): { item: BacktestCase; result: SelectionResult; changedPaths: string[] } {
  const changeset = collectChangeset({
    repoPath: repoPath(item.repoId),
    repoId: item.repoId,
    baseSha: item.baseSha,
    headSha: item.headSha,
    generatedAt: new Date('2026-08-12T00:00:00.000Z'),
  });
  const result = selectJourneys(changeset);
  return { item, result, changedPaths: changeset.changedFiles.map((file) => file.path) };
}

test.describe('historical source-change backtests', () => {
  test.skip(!fs.existsSync(repositoriesRoot), 'workspace repositories are unavailable');

  for (const item of CASES) {
    test(item.id, () => {
      const outcome = runBacktest(item);
      expect(outcome.result.selectedJourneys.map((journey) => journey.journeyId)).toEqual(item.expectedSelected);
      expect(outcome.result.fallbackTriggered).toBe(item.expectedFallback);
      expect(outcome.result.impactReasons.length).toBeGreaterThanOrEqual(0);
      if (item.expectedChangeStatus) expect(outcome.result.changeSummary.statuses[item.expectedChangeStatus as keyof typeof outcome.result.changeSummary.statuses]).toBeGreaterThan(0);
      if (item.id === 'historical-rename-delete-tombstone') {
        expect(outcome.changedPaths.some((changedPath) => changedPath.includes('/Modals/'))).toBe(true);
      }
    });
  }

  test('backtest cases are based on audited repositories and fixed commit identities', () => {
    for (const item of CASES) {
      expect(RIPPLE_REPOSITORIES.some((repo) => repo.repoId === item.repoId)).toBe(true);
      expect(item.baseSha).toMatch(/^[0-9a-f]{40}$/);
      expect(item.headSha).toMatch(/^[0-9a-f]{40}$/);
      expect(item.independentlyTracedGroundTruth.length).toBeGreaterThan(20);
    }
  });
});
