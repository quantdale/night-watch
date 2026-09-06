// ---------------------------------------------------------------------------
// Local CLI campaign launcher. LOCAL environment only.
//
// Composes the frozen AgentRuntime + CliReasonerDriver + executeAgentTool.
// Never contacts DEV/NEXT/production. Checkpoints are owner-private JSON
// (0700/0600) and are refused if they contain secret-shaped material.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  defaultAgentBudgetPolicy,
  type AgentBudgetCeilingName,
  type AgentCheckpoint,
  type AgentTerminationReason,
} from '../agentProtocol';
import { executeAgentTool } from '../agentTools';
import { createCliReasonerDriver } from '../reasoner/cliReasoner';
import { assertCheckpointHasNoSecrets } from './checkpoint';
import { AgentRuntime } from './runtime';
import type { AgentToolExecutor } from './types';

export const LOCAL_CAMPAIGN_VERSION = 'nightwatch.local-cli-campaign.v1' as const;
export const AGENT_BUDGET_CEILING_NAMES = ['HOUR_1', 'HOUR_4', 'HOUR_8', 'OVERNIGHT'] as const;

const CAMPAIGN_ID_RE = /^[A-Za-z0-9._-]{1,80}$/;

export class LocalCampaignError extends Error {
  readonly code: string;
  constructor(code: string, detail: string) {
    super(`${code}: ${detail}`);
    this.name = 'LocalCampaignError';
    this.code = code;
  }
}

export interface LocalCampaignInput {
  readonly campaignId: string;
  readonly ceilingName: AgentBudgetCeilingName;
  readonly executable: string;
  readonly args?: readonly string[];
  readonly provider?: string;
  readonly model?: string;
  readonly maxTurns?: number;
  readonly stateDirectory?: string;
}

export interface LocalCampaignResult {
  readonly schemaVersion: typeof LOCAL_CAMPAIGN_VERSION;
  readonly campaignId: string;
  readonly terminationReason: AgentTerminationReason;
  readonly candidateIds: readonly string[];
  readonly actionCount: number;
  readonly checkpointFile: string | null;
  readonly environment: 'LOCAL';
}

function localTools(): AgentToolExecutor {
  return {
    async execute(call) {
      const result = executeAgentTool(
        { kind: 'CALL_TOOL', toolId: call.toolId, arguments: call.arguments },
        { authorizedEnvironments: ['LOCAL'] },
      );
      if (!result.ok) {
        return { ok: false, resultClass: result.class, evidenceRefs: [], outputBytes: 0, untrusted: [] };
      }
      return {
        ok: true,
        resultClass: 'OBSERVED',
        evidenceRefs: result.evidenceRefs,
        outputBytes: Buffer.byteLength(JSON.stringify(result.data), 'utf8'),
        untrusted: result.envelopes,
      };
    },
  };
}

function defaultStateDirectory(override: string | undefined): string {
  if (typeof override === 'string' && override.trim().length > 0) {
    return path.resolve(override.trim());
  }
  return path.join(os.homedir(), '.nightwatch', 'campaigns');
}

function ensurePrivateDirectory(directory: string): void {
  try {
    if (fs.lstatSync(directory).isSymbolicLink()) {
      throw new LocalCampaignError('STATE_SYMLINK_REFUSED', 'campaign state directory must not be a symlink');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
}

function persistCheckpoint(directory: string, campaignId: string, checkpoint: AgentCheckpoint): string {
  assertCheckpointHasNoSecrets(checkpoint);
  ensurePrivateDirectory(directory);
  const file = path.join(directory, `${campaignId}.checkpoint.json`);
  if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) {
    throw new LocalCampaignError('STATE_SYMLINK_REFUSED', 'checkpoint path must not be a symlink');
  }
  fs.writeFileSync(file, `${JSON.stringify(checkpoint)}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return file;
}

export async function runLocalCliCampaign(input: LocalCampaignInput): Promise<LocalCampaignResult> {
  if (!CAMPAIGN_ID_RE.test(input.campaignId)) {
    throw new LocalCampaignError('MALFORMED_CAMPAIGN_ID', 'campaignId must match [A-Za-z0-9._-]{1,80}');
  }
  if (!(AGENT_BUDGET_CEILING_NAMES as readonly string[]).includes(input.ceilingName)) {
    throw new LocalCampaignError('UNKNOWN_BUDGET_CEILING', `unsupported ceiling ${input.ceilingName}`);
  }
  if (typeof input.executable !== 'string' || input.executable.length === 0) {
    throw new LocalCampaignError('REASONER_CLI_NOT_CONFIGURED', 'executable is required');
  }
  if (input.maxTurns !== undefined && (!Number.isInteger(input.maxTurns) || input.maxTurns < 1 || input.maxTurns > 50)) {
    throw new LocalCampaignError('MALFORMED_MAX_TURNS', 'maxTurns must be an integer 1..50');
  }

  const reasoner = createCliReasonerDriver({
    executable: input.executable,
    args: input.args ?? [],
    provider: input.provider ?? 'configured',
    model: input.model ?? 'configured',
    validationContext: { authorizedEnvironments: ['LOCAL'] },
  });

  const runtime = new AgentRuntime({
    campaignId: input.campaignId,
    budgetPolicy: defaultAgentBudgetPolicy(input.ceilingName),
    reasoner,
    tools: localTools(),
    authorizedEnvironments: ['LOCAL'],
    maxTurns: input.maxTurns,
  });
  const ran = await runtime.run({ maxTurns: input.maxTurns });
  let checkpointFile: string | null = null;
  if (ran.checkpoint !== null) {
    checkpointFile = persistCheckpoint(defaultStateDirectory(input.stateDirectory), input.campaignId, ran.checkpoint);
  }
  return {
    schemaVersion: LOCAL_CAMPAIGN_VERSION,
    campaignId: input.campaignId,
    terminationReason: ran.terminationReason,
    candidateIds: [...ran.state.candidateIds],
    actionCount: ran.state.actionLog.length,
    checkpointFile,
    environment: 'LOCAL',
  };
}
