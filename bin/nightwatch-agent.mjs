#!/usr/bin/env node
/**
 * Nightwatch autonomous-agent operator CLI.
 *
 *   node bin/nightwatch-agent.mjs status
 *   node bin/nightwatch-agent.mjs test
 *   node bin/nightwatch-agent.mjs campaign run --reasoner=cli --duration=1h
 *   node bin/nightwatch-agent.mjs campaign status|pause|resume|findings
 *
 * Local/synthetic only. DEV/NEXT/production contact is refused.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildChildEnvironment, emitChildStdio } from './child-environment.mjs';
import { loadTypeScriptModules } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const command = args[0] ?? 'help';

const DURATIONS = new Map([
  ['1h', 'HOUR_1'],
  ['4h', 'HOUR_4'],
  ['8h', 'HOUR_8'],
  ['overnight', 'OVERNIGHT'],
]);

function fail(code, message) {
  console.error(`NIGHTWATCH_AGENT: ${message}`);
  process.exitCode = code;
}

if (command === 'status') {
  console.log(JSON.stringify({
    schemaVersion: 'nightwatch.agent-protocol.v1',
    reasonerDriver: 'nightwatch.reasoner-driver.v1',
    toolProtocol: 'nightwatch.agent-tool-protocol.v1',
    ownerClass: 'AUTONOMOUS_AGENT_LOCAL',
    environments: { local: 'AUTHORIZED', dev: 'NOT_AUTHORIZED', next: 'NOT_AUTHORIZED', production: 'NOT_AUTHORIZED' },
    filing: { humanReviewRequired: true, externalPublication: 'PROHIBITED', autoLeslie: false, autoSlack: false },
  }, null, 2));
} else if (command === 'test') {
  const pwBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
  const suites = [
    'tests/unit/agentProtocol.test.ts',
    'tests/unit/agentAutonomyLoop.test.ts',
    'tests/unit/agentRuntime.test.ts',
    'tests/unit/reasonerCli.test.ts',
    'tests/unit/agentTools.test.ts',
    'tests/unit/bugAtlas.test.ts',
    'tests/unit/systemAtlas.test.ts',
    'tests/unit/benchmark.test.ts',
    'tests/unit/autonomousFinding.test.ts',
    'tests/unit/localCampaign.test.ts',
    'tests/unit/historicalRediscovery.test.ts',
    'tests/unit/preFixSource.test.ts',
    'tests/unit/minedCases.test.ts',
    'tests/unit/reasonerPrint.test.ts',
  ];
  const result = spawnSync(pwBin, ['test', ...suites, '--project=nightwatch', '--workers=1'], {
    cwd: root,
    env: buildChildEnvironment(process.env, { NODE_OPTIONS: '--expose-gc' }),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    timeout: 180_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  emitChildStdio(result);
  process.exitCode = result.status ?? 1;
} else if (command === 'campaign') {
  const sub = args[1] ?? 'help';
  const flags = Object.fromEntries(args.slice(2).filter((item) => item.startsWith('--')).map((item) => {
    const eq = item.indexOf('=');
    return eq === -1 ? [item.slice(2), 'true'] : [item.slice(2, eq), item.slice(eq + 1)];
  }));
  if (sub === 'run') {
    if (flags.reasoner !== 'cli') {
      fail(2, 'campaign run requires --reasoner=cli');
    } else if (!DURATIONS.has(flags.duration)) {
      fail(2, 'campaign run requires --duration=1h|4h|8h|overnight');
    } else if (flags.env === 'dev' || flags.env === 'next' || flags.env === 'production') {
      fail(2, `environment ${flags.env} is NOT AUTHORIZED for this programme`);
    } else if (!process.env.NIGHTWATCH_REASONER_CLI) {
      fail(2, 'REASONER_CLI_NOT_CONFIGURED — set NIGHTWATCH_REASONER_CLI to an allowlisted executable; refusing to start');
    } else {
      const maxTurnsRaw = flags['max-turns'];
      const maxTurns = maxTurnsRaw === undefined ? undefined : Number(maxTurnsRaw);
      if (maxTurns !== undefined && (!Number.isInteger(maxTurns) || maxTurns < 1 || maxTurns > 50)) {
        fail(2, 'campaign run --max-turns must be an integer 1..50');
      } else {
        const [mod] = loadTypeScriptModules(['src/core/agentRuntime/localCampaign.ts'], { root });
        const extraArgs = [];
        if (typeof process.env.NIGHTWATCH_REASONER_SCRIPT === 'string' && process.env.NIGHTWATCH_REASONER_SCRIPT.length > 0) {
          extraArgs.push(process.env.NIGHTWATCH_REASONER_SCRIPT);
        }
        try {
          const result = await mod.runLocalCliCampaign({
            campaignId: typeof flags.id === 'string' && flags.id.length > 0 ? flags.id : `local-${Date.now()}`,
            ceilingName: DURATIONS.get(flags.duration),
            executable: process.env.NIGHTWATCH_REASONER_CLI,
            args: extraArgs,
            provider: process.env.NIGHTWATCH_REASONER_PROVIDER ?? 'configured',
            model: process.env.NIGHTWATCH_REASONER_MODEL ?? 'configured',
            maxTurns,
          });
          console.log(JSON.stringify(result, null, 2));
        } catch (error) {
          fail(2, error instanceof Error ? error.message : 'LOCAL_CAMPAIGN_FAILED');
        }
      }
    }
  } else if (sub === 'status' || sub === 'pause' || sub === 'findings') {
    const [mod] = loadTypeScriptModules(['src/core/agentRuntime/localCampaign.ts'], { root });
    const campaigns = mod.listLocalCampaigns();
    const payload = sub === 'findings'
      ? {
          command: sub,
          candidateIds: campaigns.flatMap((item) => item.candidateIds),
          campaigns,
        }
      : {
          command: sub,
          liveProcess: false,
          campaigns,
          note: sub === 'pause'
            ? 'campaign run is blocking in this process; stored checkpoints are listed. Resume with campaign resume --id=...'
            : 'No in-process campaign. Owner-local checkpoints are listed.',
        };
    console.log(JSON.stringify(payload, null, 2));
  } else if (sub === 'resume') {
    if (!process.env.NIGHTWATCH_REASONER_CLI) {
      fail(2, 'REASONER_CLI_NOT_CONFIGURED — set NIGHTWATCH_REASONER_CLI to resume');
    } else if (typeof flags.id !== 'string' || flags.id.length === 0) {
      fail(2, 'campaign resume requires --id=<campaignId>');
    } else {
      const [mod] = loadTypeScriptModules(['src/core/agentRuntime/localCampaign.ts'], { root });
      const extraArgs = [];
      if (typeof process.env.NIGHTWATCH_REASONER_SCRIPT === 'string' && process.env.NIGHTWATCH_REASONER_SCRIPT.length > 0) {
        extraArgs.push(process.env.NIGHTWATCH_REASONER_SCRIPT);
      }
      const maxTurnsRaw = flags['max-turns'];
      const maxTurns = maxTurnsRaw === undefined ? undefined : Number(maxTurnsRaw);
      try {
        const result = await mod.resumeLocalCliCampaign({
          campaignId: flags.id,
          ceilingName: 'HOUR_1',
          executable: process.env.NIGHTWATCH_REASONER_CLI,
          args: extraArgs,
          provider: process.env.NIGHTWATCH_REASONER_PROVIDER ?? 'configured',
          model: process.env.NIGHTWATCH_REASONER_MODEL ?? 'configured',
          maxTurns: Number.isInteger(maxTurns) ? maxTurns : 8,
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        fail(2, error instanceof Error ? error.message : 'LOCAL_CAMPAIGN_RESUME_FAILED');
      }
    }
  } else {
    fail(2, 'usage: nightwatch-agent campaign run --reasoner=cli --duration=1h|4h|8h|overnight');
  }
} else {
  console.log('usage: node bin/nightwatch-agent.mjs status|test|campaign');
  process.exitCode = command === 'help' || command === undefined ? 0 : 2;
}
