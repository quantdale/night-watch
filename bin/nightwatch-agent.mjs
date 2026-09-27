#!/usr/bin/env node
/**
 * Nightwatch autonomous-agent operator CLI.
 *
 *   node bin/nightwatch-agent.mjs status
 *   node bin/nightwatch-agent.mjs test
 *   node bin/nightwatch-agent.mjs campaign run --reasoner=cli --duration=1h
 *   node bin/nightwatch-agent.mjs campaign status|resume|findings
 *   (pausing a running campaign is SIGNAL-driven: send SIGINT/SIGTERM to it)
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

/**
 * M5 (6.9/C-07): the operator's SIGINT/SIGTERM pause channel for a running
 * campaign. The FIRST signal asks the campaign to halt at its next turn
 * boundary — writing a PAUSED checkpoint and killing any in-flight reasoner
 * process group. Repeated signals are ABSORBED (reported, never escalated), so
 * a duplicated terminal/group delivery can never kill work.
 */
/**
 * M5 (6.13/C-28): emit the product run receipt for a finished campaign. The
 * D-7 manifest/summary carry the run identity; the receipt carries provider
 * health, sibling identity before/after, the leak scan and the persisted
 * admission ids. An emission failure is reported and never silently swallowed.
 */
async function emitCampaignReceipt({ root, receiptMod, campaignId, result, repositoryIds, before }) {
  try {
    const emitted = await receiptMod.emitProductRunReceipt({
      root,
      campaignId,
      result,
      repositoryIds,
      before,
    });
    console.log(
      JSON.stringify(
        {
          productRunReceipt: {
            runId: emitted.runId,
            receiptFile: emitted.receiptFile,
            receipt: emitted.receipt,
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(`NIGHTWATCH_AGENT: PRODUCT_RUN_RECEIPT_FAILED: ${error instanceof Error ? error.message : String(error)}`);
    if (process.exitCode === undefined || process.exitCode === 0) process.exitCode = 3;
  }
}

function installCampaignPauseChannel() {
  const controller = new AbortController();
  let received = 0;
  const handler = (signal) => {
    received += 1;
    if (received > 1) {
      console.error(`NIGHTWATCH_AGENT: PAUSE_ALREADY_REQUESTED (${signal}) — the campaign is already halting`);
      return;
    }
    console.error(`NIGHTWATCH_AGENT: PAUSE_REQUESTED (${signal}) — halting at the next turn boundary`);
    controller.abort();
  };
  const onInt = () => handler('SIGINT');
  const onTerm = () => handler('SIGTERM');
  process.on('SIGINT', onInt);
  process.on('SIGTERM', onTerm);
  return {
    signal: controller.signal,
    dispose: () => {
      process.removeListener('SIGINT', onInt);
      process.removeListener('SIGTERM', onTerm);
    },
  };
}

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
/**
 * M5 (6.4): the model label is an identity component, so an explicit `--model`
 * and the declared `NIGHTWATCH_REASONER_MODEL` must agree. A disagreement is
 * refused BEFORE any process exists rather than silently labelling the run.
 * Returns null when the two disagree (the refusal is already recorded).
 */
function resolveModelLabel(flags) {
  const declared = typeof flags.model === 'string' && flags.model.length > 0 ? flags.model : null;
  const configured =
    typeof process.env.NIGHTWATCH_REASONER_MODEL === 'string' && process.env.NIGHTWATCH_REASONER_MODEL.length > 0
      ? process.env.NIGHTWATCH_REASONER_MODEL
      : null;
  if (declared !== null && configured !== null && declared !== configured) {
    fail(3, 'REASONER_MODEL_MISMATCH: --model disagrees with NIGHTWATCH_REASONER_MODEL');
    return null;
  }
  return declared ?? configured ?? 'configured';
}

/**
 * M5 (6.4): resolve the FULL attributable reasoner identity (executable,
 * adapter, print CLI, PRINT_ARGS, provider, model) and hand the campaign the
 * exact bytes-digest identity its checkpoint records.
 */
function resolveReasonerIdentity(reasonerMod, configured, options = {}) {
  // F-19: the executable is validated through the shared resolver first, then
  // widened into the full M5 identity.
  const executableIdentity = reasonerMod.resolveReasonerExecutable(configured ?? process.execPath);
  const identity = reasonerMod.resolveReasonerRuntimeIdentity({
    executable: executableIdentity.path,
    executable: configured ?? process.execPath,
    adapterPath: options.adapterPath ?? null,
    printCli: process.env.NIGHTWATCH_PRINT_CLI ?? null,
    printArgs: process.env.NIGHTWATCH_PRINT_ARGS ?? null,
    provider: options.provider ?? null,
    model: options.model ?? null,
  });
  return {
    executable: identity.executablePath,
    reasonerIdentity: {
      path: identity.executablePath,
      digest: identity.executableDigest,
      adapterDigest: identity.adapterDigest,
      printCliDigest: identity.printCliDigest,
      printArgsDigest: identity.printArgsDigest,
      provider: identity.provider,
      model: identity.model,
      identityDigest: identity.identityDigest,
    },
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
  const modelLabel = resolveModelLabel(flags);
  if (sub === 'run') {
    if (flags.reasoner !== 'cli') {
      fail(2, 'campaign run requires --reasoner=cli');
    } else if (!DURATIONS.has(flags.duration)) {
      fail(2, 'campaign run requires --duration=1h|4h|8h|overnight');
    } else if (modelLabel === null) {
      // Refused above: --model and NIGHTWATCH_REASONER_MODEL disagree.
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
        const pause = installCampaignPauseChannel();
        const [receiptMod] = loadTypeScriptModules(['src/core/agentRuntime/productRunReceipt.ts'], { root });
        const approvedRepositories = repositoryIds ?? [];
        const siblingsBefore = await receiptMod.observeSiblings(approvedRepositories);
        try {
          const providerLabel = process.env.NIGHTWATCH_REASONER_PROVIDER ?? 'configured';
          const { executable, reasonerIdentity } = resolveReasonerIdentity(reasonerMod, process.env.NIGHTWATCH_REASONER_CLI, {
            adapterPath: extraArgs[0] ?? null,
            provider: providerLabel,
            model: modelLabel,
          });
          const result = await mod.runLocalCliCampaign({
            pauseSignal: pause.signal,
            campaignId: typeof flags.id === 'string' && flags.id.length > 0 ? flags.id : `local-${Date.now()}`,
            ceilingName: DURATIONS.get(flags.duration),
            executable,
            reasonerIdentity,
            args: extraArgs,
            provider: providerLabel,
            model: modelLabel,
            maxTurns,
            investigationScope: repositoryIds,
            investigationContext: contextMod.createOwnerLocalInvestigationContext(
              repositoryIds === undefined ? {} : { repositoryIds },
            ),
          });
          console.log(JSON.stringify(result, null, 2));
          // M5 (C-01): an admission that could not be persisted is reported and
          // the run is NOT clean — the checkpoint was left in place, and the
          // operator must repair the store before the finding can be trusted.
          if (result.admissionPersistence === 'NOT_PERSISTED') {
            fail(
              3,
              `ADMISSION_NOT_PERSISTED: ${result.admissionPersistenceFailures
                .map((failure) => `${failure.candidateId}(${failure.code})`)
                .join(', ')}`,
            );
          }
          await emitCampaignReceipt({
            root,
            receiptMod,
            campaignId: result.campaignId,
            result,
            repositoryIds: approvedRepositories,
            before: siblingsBefore,
          });
        } catch (error) {
          fail(2, error instanceof Error ? error.message : 'LOCAL_CAMPAIGN_FAILED');
        } finally {
          pause.dispose();
        }
      }
    }
  } else if (sub === 'pause') {
    // M5 (6.9/C-07): pausing is a SIGNAL, not a stored flag. The old
    // subcommand only listed checkpoints while claiming to pause, which was
    // an operator-facing lie.
    fail(
      2,
      'CAMPAIGN_PAUSE_IS_SIGNAL_DRIVEN — send SIGINT (or SIGTERM) to the running campaign process; it writes a PAUSED checkpoint and stops its reasoner',
    );
  } else if (sub === 'status' || sub === 'findings') {
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
          note: 'No in-process campaign. Owner-local checkpoints are listed.',
        };
    console.log(JSON.stringify(payload, null, 2));
  } else if (sub === 'resume') {
    if (modelLabel === null) {
      // Refused above: --model and NIGHTWATCH_REASONER_MODEL disagree.
    } else if (!process.env.NIGHTWATCH_REASONER_CLI && !process.env.NIGHTWATCH_PRINT_CLI) {
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
      const pause = installCampaignPauseChannel();
      const [receiptMod] = loadTypeScriptModules(['src/core/agentRuntime/productRunReceipt.ts'], { root });
      const approvedRepositories = repositoryIds ?? [];
      const siblingsBefore = await receiptMod.observeSiblings(approvedRepositories);
      try {
        if (!resumeStartupOk) throw new Error('ENVIRONMENT_VALUE_MALFORMED');
        const providerLabel = process.env.NIGHTWATCH_REASONER_PROVIDER ?? 'configured';
        const { executable, reasonerIdentity } = resolveReasonerIdentity(reasonerMod, process.env.NIGHTWATCH_REASONER_CLI, {
          adapterPath: extraArgs[0] ?? null,
          provider: providerLabel,
          model: modelLabel,
        });
        // ceilingName is required input but resume runs under the checkpoint's
        // own stored budget policy; the multi-investigation progress (next
        // investigation index, stagnation count, termination counts) resumes
        // from the checkpoint envelope without restarting finished work.
        const result = await mod.resumeLocalCliCampaign({
          campaignId: flags.id,
          pauseSignal: pause.signal,
          ceilingName: 'HOUR_1',
          executable,
          reasonerIdentity,
          args: extraArgs,
          provider: providerLabel,
          model: modelLabel,
          maxTurns: Number.isInteger(maxTurns) ? maxTurns : 8,
          investigationScope: repositoryIds,
          investigationContext: contextMod.createOwnerLocalInvestigationContext(
            repositoryIds === undefined ? {} : { repositoryIds },
          ),
        });
        console.log(JSON.stringify(result, null, 2));
        if (result.admissionPersistence === 'NOT_PERSISTED') {
          fail(
            3,
            `ADMISSION_NOT_PERSISTED: ${result.admissionPersistenceFailures
              .map((failure) => `${failure.candidateId}(${failure.code})`)
              .join(', ')}`,
          );
        }
        await emitCampaignReceipt({
          root,
          receiptMod,
          campaignId: result.campaignId,
          result,
          repositoryIds: approvedRepositories,
          before: siblingsBefore,
        });
      } catch (error) {
        fail(2, error instanceof Error ? error.message : 'LOCAL_CAMPAIGN_RESUME_FAILED');
      } finally {
        pause.dispose();
      }
    }
  } else {
    fail(2, 'usage: nightwatch-agent campaign run --reasoner=cli --duration=1h|4h|8h|overnight [--repository=<approved-org/repo>]');
  }
} else {
  console.log('usage: node bin/nightwatch-agent.mjs status|test|campaign');
  process.exitCode = command === 'help' || command === undefined ? 0 : 2;
}
