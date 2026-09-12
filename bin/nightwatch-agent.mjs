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

/**
 * F-19 startup validation: the declared environment surface is validated
 * before any child process is created. Unknown NIGHTWATCH_* names are
 * reported with their closest declared neighbour; a malformed declared value
 * refuses the command.
 */
function assertStartupEnvironment() {
  const [surfaceMod] = loadTypeScriptModules(['src/core/config/environmentSurface.ts'], { root });
  const surface = surfaceMod.loadEnvironmentSurface();
  const fileEnvironment = surfaceMod.loadDotEnvLayer(root);
  const merged = surfaceMod.mergeDotEnvLayer(process.env, fileEnvironment, surface);
  for (const line of surfaceMod.reportUnknownEnvironmentVariables(merged, surface)) {
    console.error(`NIGHTWATCH_AGENT: ${line}`);
  }
  surfaceMod.assertEnvironmentSurface(merged, surface, { mode: 'startup' });
}

/**
 * Resolve the reasoner executable to the exact canonical file that will be
 * spawned, record its identity, and never pass the configured value through a
 * shell. `process.execPath` is the safe default when no host value is set.
 */
function resolveReasonerIdentity(reasonerMod, configured) {
  const identity = reasonerMod.resolveReasonerExecutable(configured ?? process.execPath);
  return {
    executable: identity.path,
    reasonerIdentity: { path: identity.path, digest: identity.digest },
  };
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
  try {
    assertStartupEnvironment();
  } catch (error) {
    fail(3, error instanceof Error ? error.message : 'ENVIRONMENT_VALUE_MALFORMED');
  }
  if (process.exitCode === 3) {
    // Fail closed before the subprocess; the branch below must not run.
  } else {
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
  }
} else if (command === 'campaign') {
  const sub = args[1] ?? 'help';
  const flags = Object.fromEntries(args.slice(2).filter((item) => item.startsWith('--')).map((item) => {
    const eq = item.indexOf('=');
    return eq === -1 ? [item.slice(2), 'true'] : [item.slice(2, eq), item.slice(eq + 1)];
  }));
  const repositoryIds = flags.repository === undefined ? undefined : [flags.repository];
  if (sub === 'run') {
    if (flags.reasoner !== 'cli') {
      fail(2, 'campaign run requires --reasoner=cli');
    } else if (!DURATIONS.has(flags.duration)) {
      fail(2, 'campaign run requires --duration=1h|4h|8h|overnight');
    } else if (flags.env === 'dev' || flags.env === 'next' || flags.env === 'production') {
      fail(2, `environment ${flags.env} is NOT AUTHORIZED for this programme`);
    } else if (!process.env.NIGHTWATCH_REASONER_CLI && !process.env.NIGHTWATCH_PRINT_CLI) {
      fail(2, 'REASONER_CLI_NOT_CONFIGURED — set NIGHTWATCH_REASONER_CLI or NIGHTWATCH_PRINT_CLI; refusing to start');
    } else {
      let startupOk = true;
      try {
        assertStartupEnvironment();
      } catch (error) {
        fail(3, error instanceof Error ? error.message : 'ENVIRONMENT_VALUE_MALFORMED');
        startupOk = false;
      }
      const maxTurnsRaw = flags['max-turns'];
      const maxTurns = maxTurnsRaw === undefined ? undefined : Number(maxTurnsRaw);
      if (!startupOk) {
        // Refused before any child process is created.
      } else if (maxTurns !== undefined && (!Number.isInteger(maxTurns) || maxTurns < 1 || maxTurns > 50)) {
        fail(2, 'campaign run --max-turns must be an integer 1..50');
      } else {
        const [mod, contextMod, reasonerMod] = loadTypeScriptModules(
          ['src/core/agentRuntime/localCampaign.ts', 'src/core/localInvestigation/ownerLocal.ts', 'src/core/config/reasonerExecutable.ts'],
          { root },
        );
        const extraArgs = [];
        if (typeof process.env.NIGHTWATCH_REASONER_SCRIPT === 'string' && process.env.NIGHTWATCH_REASONER_SCRIPT.length > 0) {
          extraArgs.push(process.env.NIGHTWATCH_REASONER_SCRIPT);
        } else if (process.env.NIGHTWATCH_PRINT_CLI) {
          extraArgs.push(path.join(root, 'bin/nightwatch-reasoner-print.mjs'));
        }
        try {
          const { executable, reasonerIdentity } = resolveReasonerIdentity(reasonerMod, process.env.NIGHTWATCH_REASONER_CLI);
          const result = await mod.runLocalCliCampaign({
            campaignId: typeof flags.id === 'string' && flags.id.length > 0 ? flags.id : `local-${Date.now()}`,
            ceilingName: DURATIONS.get(flags.duration),
            executable,
            reasonerIdentity,
            args: extraArgs,
            provider: process.env.NIGHTWATCH_REASONER_PROVIDER ?? 'configured',
            model: process.env.NIGHTWATCH_REASONER_MODEL ?? 'configured',
            maxTurns,
            investigationScope: repositoryIds,
            investigationContext: contextMod.createOwnerLocalInvestigationContext(
              repositoryIds === undefined ? {} : { repositoryIds },
            ),
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
    if (!process.env.NIGHTWATCH_REASONER_CLI && !process.env.NIGHTWATCH_PRINT_CLI) {
      fail(2, 'REASONER_CLI_NOT_CONFIGURED — set NIGHTWATCH_REASONER_CLI or NIGHTWATCH_PRINT_CLI to resume');
    } else if (typeof flags.id !== 'string' || flags.id.length === 0) {
      fail(2, 'campaign resume requires --id=<campaignId>');
    } else {
      let resumeStartupOk = true;
      try {
        assertStartupEnvironment();
      } catch (error) {
        fail(3, error instanceof Error ? error.message : 'ENVIRONMENT_VALUE_MALFORMED');
        resumeStartupOk = false;
      }
      const [mod, contextMod, reasonerMod] = loadTypeScriptModules(
        ['src/core/agentRuntime/localCampaign.ts', 'src/core/localInvestigation/ownerLocal.ts', 'src/core/config/reasonerExecutable.ts'],
        { root },
      );
      const extraArgs = [];
      if (typeof process.env.NIGHTWATCH_REASONER_SCRIPT === 'string' && process.env.NIGHTWATCH_REASONER_SCRIPT.length > 0) {
        extraArgs.push(process.env.NIGHTWATCH_REASONER_SCRIPT);
      } else if (process.env.NIGHTWATCH_PRINT_CLI) {
        extraArgs.push(path.join(root, 'bin/nightwatch-reasoner-print.mjs'));
      }
      const maxTurnsRaw = flags['max-turns'];
      const maxTurns = maxTurnsRaw === undefined ? undefined : Number(maxTurnsRaw);
      try {
        if (!resumeStartupOk) throw new Error('ENVIRONMENT_VALUE_MALFORMED');
        const { executable, reasonerIdentity } = resolveReasonerIdentity(reasonerMod, process.env.NIGHTWATCH_REASONER_CLI);
        // ceilingName is required input but resume runs under the checkpoint's
        // own stored budget policy; the multi-investigation progress (next
        // investigation index, stagnation count, termination counts) resumes
        // from the checkpoint envelope without restarting finished work.
        const result = await mod.resumeLocalCliCampaign({
          campaignId: flags.id,
          ceilingName: 'HOUR_1',
          executable,
          reasonerIdentity,
          args: extraArgs,
          provider: process.env.NIGHTWATCH_REASONER_PROVIDER ?? 'configured',
          model: process.env.NIGHTWATCH_REASONER_MODEL ?? 'configured',
          maxTurns: Number.isInteger(maxTurns) ? maxTurns : 8,
          investigationScope: repositoryIds,
          investigationContext: contextMod.createOwnerLocalInvestigationContext(
            repositoryIds === undefined ? {} : { repositoryIds },
          ),
        });
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        fail(2, error instanceof Error ? error.message : 'LOCAL_CAMPAIGN_RESUME_FAILED');
      }
    }
  } else {
    fail(2, 'usage: nightwatch-agent campaign run --reasoner=cli --duration=1h|4h|8h|overnight [--repository=<approved-org/repo>]');
  }
} else {
  console.log('usage: node bin/nightwatch-agent.mjs status|test|campaign');
  process.exitCode = command === 'help' || command === undefined ? 0 : 2;
}
