// ---------------------------------------------------------------------------
// W8 opt-in LIVE-PROVIDER efficacy proof.
//
// Skipped unless NIGHTWATCH_LIVE_PROVIDER_PROOF=1 and a print-mode provider is
// configured, because it spends real provider quota. It is committed rather
// than run as a one-off transcript so the load-bearing live claim stays
// reproducible:
//
//   NIGHTWATCH_LIVE_PROVIDER_PROOF=1 \
//   NIGHTWATCH_PRINT_CLI=/abs/path/to/provider-cli \
//   NIGHTWATCH_PRINT_ARGS='["run","--pure","-m","<provider/model>","__PROMPT__"]' \
//   npx playwright test tests/unit/liveProviderEfficacyProof.test.ts --project=nightwatch --workers=1
//
// The live model drives the ordinary product path: the shared local
// investigation tool session over leak-isolated historical pre-fix source, the
// shared deterministic reproduction provider, and the same protocol
// validation. Nothing about scoring, admission or leakage detection is relaxed
// for the live run.
//
// The assertions deliberately do NOT require a candidate. A live model may
// legitimately find nothing; the invariants that MUST hold are: zero hidden
// ground-truth leakage, no minted reproduction credit, and no false positive
// on the negative control. Efficacy itself is reported, not asserted, so this
// proof can never be turned into a way of manufacturing success.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { AGENT_TOOL_IDS } from '../../src/core/agentProtocol/tools';
import { benchmarkFixtureById } from '../../src/core/benchmark/fixtures';
import { defaultBenchmarkBudgetPolicy, runBenchmarkHunt } from '../../src/core/benchmark/hunt';
import { classifyVerifiedBenchmarkTier, isNegativeControl } from '../../src/core/benchmark/score';
import { createCliReasonerDriver } from '../../src/core/reasoner/cliReasoner';
import { deriveEfficacyCaseMetrics } from '../../src/core/efficacy/metrics';
import { multiTargetEfficacyCases } from '../../src/core/efficacy/multiTargetCases';

const ENABLED = process.env.NIGHTWATCH_LIVE_PROVIDER_PROOF === '1';
const PRINT_CLI = process.env.NIGHTWATCH_PRINT_CLI ?? '';
const PRINT_ARGS = process.env.NIGHTWATCH_PRINT_ARGS ?? '';
const REPO_ROOT = path.resolve(__dirname, '..', '..');

test.describe('W8 live-provider efficacy proof (opt-in)', () => {
  test.skip(!ENABLED || PRINT_CLI.length === 0 || PRINT_ARGS.length === 0,
    'set NIGHTWATCH_LIVE_PROVIDER_PROOF=1 with NIGHTWATCH_PRINT_CLI/NIGHTWATCH_PRINT_ARGS');

  test('live reasoner investigates leak-isolated historical cases through the product path', async () => {
    test.setTimeout(30 * 60_000);
    const cases = [
      benchmarkFixtureById('bench-billing-rounding-001'),
      benchmarkFixtureById('bench-negative-quiet-000'),
      ...multiTargetEfficacyCases().filter((item) => item.caseId === 'efficacy-billing-multifile-001'),
    ];
    const summary: Record<string, unknown>[] = [];
    for (const definedCase of cases) {
      const driver = createCliReasonerDriver({
        executable: process.execPath,
        allowedExecutables: [process.execPath],
        args: [path.join(REPO_ROOT, 'bin', 'nightwatch-reasoner-print.mjs')],
        provider: process.env.NIGHTWATCH_REASONER_PROVIDER ?? 'configured',
        model: process.env.NIGHTWATCH_REASONER_MODEL ?? 'configured',
        extraEnv: { NIGHTWATCH_PRINT_CLI: PRINT_CLI, NIGHTWATCH_PRINT_ARGS: PRINT_ARGS },
        allowedEnvKeys: ['NIGHTWATCH_PRINT_CLI', 'NIGHTWATCH_PRINT_ARGS'],
        validationContext: { authorizedEnvironments: ['LOCAL'], allowedToolIds: [...AGENT_TOOL_IDS] },
      });
      const hunt = await runBenchmarkHunt(definedCase, {
        reasoner: driver,
        budgetPolicy: defaultBenchmarkBudgetPolicy(),
        maxTurns: 16,
      });
      const negativeControl = isNegativeControl(definedCase.hidden);
      const metrics = deriveEfficacyCaseMetrics({
        caseId: definedCase.caseId,
        mode: 'W8_MEMORY',
        state: hunt.runtimeState,
        terminationReason: hunt.terminationReason,
        history: hunt.investigationHistory,
        negativeControl,
        outcome: hunt.outcome,
        verifiedTier: classifyVerifiedBenchmarkTier({
          admitted: hunt.admitted,
          score: hunt.score,
          mechanicalReproductionCount: hunt.reproductionCount,
          leakage: hunt.leaked,
        }),
        exactRediscovery: hunt.outcome === 'EXACT_REDISCOVERY',
        leaked: hunt.leaked,
      });
      summary.push(metrics as unknown as Record<string, unknown>);

      // Invariants that hold no matter how well or badly the live model does.
      expect(hunt.leaked, `${definedCase.caseId} leaked hidden ground truth`).toEqual([]);
      if (hunt.reproductionCount > 0) {
        // Credit is only ever mechanical: a receipt must exist for it.
        const receipts = (hunt.investigationHistory?.reproductions ?? []).filter(
          (receipt) => receipt.verdict === 'REPRODUCED',
        );
        expect(receipts.length).toBe(hunt.reproductionCount);
      }
      if (negativeControl) {
        expect(hunt.outcome).not.toBe('FALSE_POSITIVE');
        expect(hunt.candidateIds).toEqual([]);
      }
    }
    // Reported, never asserted: the live outcome distribution is evidence, not
    // a pass condition.
    console.log(`W8_LIVE_PROVIDER_PROOF ${JSON.stringify(summary)}`);
  });
});
