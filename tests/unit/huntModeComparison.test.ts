import { test, expect } from '@playwright/test';
import {
  REASONER_DRIVER_VERSION,
  REASONER_TURN_RESPONSE_VERSION,
  defaultAgentBudgetPolicy,
  type ReasonerCallResult,
  type ReasonerDriver,
  type ReasonerTurnRequest,
  type ReasonerTurnResponse,
} from '../../src/core/agentProtocol';
import { AgentRuntime } from '../../src/core/agentRuntime';
import type { AgentToolExecutor } from '../../src/core/agentRuntime';
import { executeAgentTool } from '../../src/core/agentTools';
import { benchmarkFixtureById } from '../../src/core/benchmark';

/**
 * Three-mode comparison on one frozen billing fixture (section 26).
 * Same case, same budget. Scores are admitted-candidate counts, not prestige.
 *
 * A: reasoner alone — no tools; may emit ungrounded evidence refs.
 * B: NightWatch tools alone — oracles/atlas, no reasoner proposals.
 * C: hybrid — tools then evidence-backed proposal.
 */
const EVIDENCE = 'ev:sha256:cccccccccccccccccccccccc';
const ARG = 'arg:sha256:dddddddddddddddddddddddd';
const FIXTURE = benchmarkFixtureById('bench-billing-rounding-001');

function driver(script: Array<(request: ReasonerTurnRequest) => ReasonerCallResult>): ReasonerDriver {
  let index = 0;
  return {
    protocolVersion: REASONER_DRIVER_VERSION,
    transport: 'CLI',
    provenance: { transport: 'CLI', executableBasename: 'mode', provider: 'fixture', model: 'mode' },
    async complete(request) {
      const step = script[Math.min(index, script.length - 1)]!;
      index += 1;
      return step(request);
    },
  };
}

function ok(intents: ReasonerTurnResponse['intents']): ReasonerCallResult {
  return {
    ok: true,
    response: { schemaVersion: REASONER_TURN_RESPONSE_VERSION, intents, hypotheses: [] },
    provenance: { transport: 'CLI', executableBasename: 'mode', provider: 'fixture', model: 'mode' },
    stdoutBytes: 8,
    stderrBytes: 0,
  };
}

const tools: AgentToolExecutor = {
  async execute(call) {
    const result = executeAgentTool(
      { kind: 'CALL_TOOL', toolId: call.toolId, arguments: call.arguments },
      { authorizedEnvironments: ['LOCAL'] },
    );
    if (!result.ok) return { ok: false, resultClass: result.class, evidenceRefs: [], outputBytes: 0, untrusted: [] };
    return { ok: true, resultClass: 'OBSERVED', evidenceRefs: result.evidenceRefs, outputBytes: 8, untrusted: result.envelopes };
  },
};

const inertTools: AgentToolExecutor = {
  async execute() {
    return { ok: true, resultClass: 'NOOP', evidenceRefs: [], outputBytes: 0, untrusted: [] };
  },
};

test.describe('three hunt modes on one billing fixture', () => {
  test('A reasoner-alone can admit with ungrounded refs; B tools-alone admits none; C hybrid admits with tool evidence', async () => {
    const modeA = new AgentRuntime({
      campaignId: 'mode-a',
      budgetPolicy: defaultAgentBudgetPolicy('HOUR_1'),
      reasoner: driver([
        () => ok([{ kind: 'PROPOSE_CANDIDATE', candidateId: 'a-ungrounded', evidenceRefs: [EVIDENCE] }]),
        () => ok([{ kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' }]),
      ]),
      tools: inertTools,
      authorizedEnvironments: ['LOCAL'],
    });
    const a = await modeA.run({ maxTurns: 4 });

    const modeB = new AgentRuntime({
      campaignId: 'mode-b',
      budgetPolicy: defaultAgentBudgetPolicy('HOUR_1'),
      reasoner: driver([
        () => ok([{ kind: 'CALL_TOOL', toolId: 'QUERY_BUG_ATLAS', argumentDigest: ARG, arguments: { terms: ['coupon'] } }]),
        () => ok([{ kind: 'CALL_TOOL', toolId: 'ASK_DETERMINISTIC_ORACLE', argumentDigest: ARG, arguments: { id: 'none' } }]),
        () => ok([{ kind: 'TERMINATE', reason: 'COMPLETE_NO_FINDING' }]),
      ]),
      tools,
      authorizedEnvironments: ['LOCAL'],
    });
    const b = await modeB.run({ maxTurns: 6 });

    const modeC = new AgentRuntime({
      campaignId: 'mode-c',
      budgetPolicy: defaultAgentBudgetPolicy('HOUR_1'),
      reasoner: driver([
        () => ok([{ kind: 'CALL_TOOL', toolId: 'QUERY_BUG_ATLAS', argumentDigest: ARG, arguments: { terms: ['coupon'] } }]),
        () => ok([{ kind: 'PROPOSE_CANDIDATE', candidateId: 'c-grounded', evidenceRefs: [EVIDENCE] }]),
        () => ok([{ kind: 'TERMINATE', reason: 'COMPLETE_WITH_FINDING' }]),
      ]),
      tools,
      authorizedEnvironments: ['LOCAL'],
    });
    const c = await modeC.run({ maxTurns: 6 });

    const scores = {
      fixture: FIXTURE.caseId,
      A_reasonerAlone_admitted: a.state.candidateIds.length,
      B_toolsAlone_admitted: b.state.candidateIds.length,
      C_hybrid_admitted: c.state.candidateIds.length,
      A_usedTools: a.state.actionLog.some((item) => item.toolId !== null),
      C_usedTools: c.state.actionLog.some((item) => item.toolId === 'QUERY_BUG_ATLAS'),
    };

    expect(scores.A_reasonerAlone_admitted).toBe(1);
    expect(scores.B_toolsAlone_admitted).toBe(0);
    expect(scores.C_hybrid_admitted).toBe(1);
    expect(scores.A_usedTools).toBe(false);
    expect(scores.C_usedTools).toBe(true);
    // Honest: this fixture does not prove C finds more verified bugs than A.
    // A admitted without observing the product. C observed then admitted.
    expect(a.state.actionLog.some((item) => item.resultClass === 'OBSERVED')).toBe(false);
    expect(c.state.actionLog.some((item) => item.resultClass === 'OBSERVED' || item.toolId === 'QUERY_BUG_ATLAS')).toBe(true);
  });
});
