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
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';
import { loadTypeScriptModules } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * A-12 / 10.2: the shared operator-CLI contract. The three top-level commands
 * are declared with `help` as the default; `campaign` takes one subcommand and
 * the bounded run flags the campaign runner actually consumes. `--help`/
 * `--print-metadata` answer through the shared parser without loading the agent
 * runtime, and an unknown option/command is refused with exit 2.
 */
/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'nightwatch-agent',
  entry: 'bin/nightwatch-agent.mjs',
  purpose: 'Operator surface for the local investigation agent: measured status, the deterministic test command set, and bounded campaign runs. Local/owner-gated only.',
  group: 'manage-sessions',
  commands: [
    { name: 'status', summary: 'measured owner-local agent status' },
    { name: 'test', summary: 'deterministic agent test command' },
    { name: 'campaign', summary: 'bounded campaign control (see `campaign help`)' },
    { name: 'help', summary: 'print the usage line' },
  ],
  defaultCommand: 'help',
  positionals: { min: 0, max: 1, names: ['subcommand'], summary: 'the campaign subcommand (run|help)' },
  flags: [
    { name: '--reasoner', shape: 'string', summary: 'campaign run reasoner (must be cli)' },
    { name: '--duration', shape: 'enum', values: ['1h', '4h', '8h', 'overnight'], summary: 'campaign run budget window' },
    { name: '--wall-clock-minutes', shape: 'integer', summary: 'campaign run wall-clock bound' },
    { name: '--max-turns', shape: 'integer', summary: 'campaign run turn bound' },
    { name: '--model', shape: 'string', summary: 'reasoner model label' },
    { name: '--repository', shape: 'string', summary: 'approved org/repo target' },
    { name: '--env', shape: 'enum', values: ['dev', 'next', 'production'], summary: 'campaign target environment (owner-gated; next/production refused here)' },
    { name: '--id', shape: 'string', summary: 'campaign run id label' },
    { name: '--porcelain', shape: 'boolean', summary: 'machine-readable summary' },
    { name: '--project', shape: 'string', summary: 'project label' },
    { name: '--workers', shape: 'integer', summary: 'worker bound' },
    { name: '--expose-gc', shape: 'boolean', summary: 'enable NODE_OPTIONS --expose-gc for the child' },
  ],
  json: true,
  authorization: 'OWNER_GATED',
  artifacts: [],
};
const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
const args = (cli.ok === true && cli.stop !== true)
  ? [cli.command ?? 'help', ...cli.positionals, ...Object.entries(cli.flags).filter(([, value]) => value !== false && value !== undefined).map(([name, value]) => (value === true ? name : `${name}=${String(value)}`))]
  : [cli.command ?? 'help'];
const command = cli.ok === true && cli.stop !== true ? cli.command ?? 'help' : 'help';
const cliStopped = cli.ok !== true || cli.stop === true;

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
/**
 * @param {{
 *   root: string,
 *   receiptMod: { emitProductRunReceipt: (input: object) => Promise<{ runId: string, receiptFile: string, receipt: unknown }> },
 *   campaignId: string,
 *   result: unknown,
 *   repositoryIds: readonly string[],
 *   before: readonly unknown[],
 *   nightwatchIdentity: { sha: string, treeClean: boolean } | null,
 *   campaignKind: string,
 *   reasonerIdentity: { kind: string, identityDigest: string | null, printCliDigest: string | null } | null,
 * }} input
 */
async function emitCampaignReceipt({ root, receiptMod, campaignId, result, repositoryIds, before, nightwatchIdentity, campaignKind, reasonerIdentity = null }) {
  try {
    const emitted = await receiptMod.emitProductRunReceipt({
      root,
      campaignId,
      result,
      repositoryIds,
      before,
      ...(nightwatchIdentity === null ? {} : { nightwatchIdentity }),
      campaignKind,
      ...(reasonerIdentity === null ? {} : { reasonerIdentity }),
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

/**
 * CF-03 / design D3: the Nightwatch repository identity a campaign executes at
 * (HEAD plus whether the tree was clean), so the product run receipt can be
 * bound to a commit. Null when git cannot answer — an unbound receipt.
 */
function readNightwatchIdentity() {
  // A fixed, minimal environment: the identity read never inherits the parent
  // environment (no GIT_* redirection, no credentials).
  const environment = { PATH: '/usr/bin:/bin', HOME: root, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0', LANG: 'C', LC_ALL: 'C' };
  /** @param {string[]} gitArgs */
  const run = (gitArgs) => {
    const result = spawnSync('git', gitArgs, { cwd: root, env: environment, encoding: 'utf8', timeout: 15_000, shell: false });
    return result.status === 0 && typeof result.stdout === 'string' ? result.stdout : null;
  };
  const head = run(['rev-parse', 'HEAD']);
  const porcelain = run(['status', '--porcelain']);
  if (head === null || porcelain === null || !/^[0-9a-f]{40}$/.test(head.trim())) return null;
  return { sha: head.trim(), treeClean: porcelain.trim() === '' };
}

/**
 * @param {{ sha: string, treeClean: boolean } | null} before
 * @param {{ sha: string, treeClean: boolean } | null} after
 * @returns {{ sha: string, treeClean: boolean } | null}
 */
function bindRunIdentity(before, after) {
  if (before === null) return null;
  if (after === null || after.sha !== before.sha) return { sha: before.sha, treeClean: false };
  return { sha: before.sha, treeClean: before.treeClean && after.treeClean };
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
/**
 * M7 (8.1/NW-AUD-012): validate the process+.env MERGE and RETURN it, so every
 * value this CLI forwards is a value it validated. Reading `process.env` for
 * the forwarded values let a `.env`-only configuration be validated and then
 * silently dropped.
 */
function assertStartupEnvironment() {
  const [surfaceMod] = loadTypeScriptModules(['src/core/config/environmentSurface.ts'], { root });
  const surface = surfaceMod.loadEnvironmentSurface();
  const fileEnvironment = surfaceMod.loadDotEnvLayer(root, surface.variables.map((entry) => entry.name));
  const merged = surfaceMod.mergeDotEnvLayer(process.env, fileEnvironment, surface);
  for (const line of surfaceMod.reportUnknownEnvironmentVariables(merged, surface)) {
    console.error(`NIGHTWATCH_AGENT: ${line}`);
  }
  surfaceMod.assertEnvironmentSurface(merged, surface, { mode: 'startup' });
  return merged;
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
      adapterPath: identity.adapterPath,
      adapterDigest: identity.adapterDigest,
      printCliDigest: identity.printCliDigest,
      printArgsDigest: identity.printArgsDigest,
      provider: identity.provider,
      model: identity.model,
      identityDigest: identity.identityDigest,
    },
  };
}

if (!cliStopped && command === 'status') {
  // M5 (6.14/C-13/B-12): status reports MEASURED state — the durable records
  // the owner-local store actually holds and the campaigns actually stored —
  // not a constant schema list. The static protocol identity stays, because it
  // is a fact about the build rather than a measurement.
  // M7 (8.1): status reports the configuration the owner actually supplied.
  const mergedEnv = assertStartupEnvironment();
  const [campaignMod, storeMod] = loadTypeScriptModules(
    ['src/core/agentRuntime/localCampaign.ts', 'src/core/localInvestigation/agentFindingStore.ts'],
    { root },
  );
  let campaigns = [];
  let campaignsUnavailable = null;
  try {
    campaigns = campaignMod.listLocalCampaigns();
  } catch (error) {
    campaignsUnavailable = error instanceof Error ? error.message : String(error);
  }
  let findings = [];
  let storeRoot = null;
  let storeUnavailable = null;
  try {
    const store = new storeMod.AgentFindingStore();
    storeRoot = store.root;
    findings = store.list();
  } catch (error) {
    storeUnavailable = error instanceof Error ? error.message : String(error);
  }
  const perCampaign = new Map();
  for (const record of findings) {
    const entry = perCampaign.get(record.campaignId) ?? { campaignId: record.campaignId, admissions: 0, candidateIds: [] };
    entry.admissions += 1;
    if (!entry.candidateIds.includes(record.candidateId)) entry.candidateIds.push(record.candidateId);
    perCampaign.set(record.campaignId, entry);
  }
  console.log(JSON.stringify({
    schemaVersion: 'nightwatch.agent-protocol.v1',
    reasonerDriver: 'nightwatch.reasoner-driver.v1',
    toolProtocol: 'nightwatch.agent-tool-protocol.v1',
    ownerClass: 'AUTONOMOUS_AGENT_LOCAL',
    environments: { local: 'AUTHORIZED', dev: 'NOT_AUTHORIZED', next: 'NOT_AUTHORIZED', production: 'NOT_AUTHORIZED' },
    filing: { humanReviewRequired: true, externalPublication: 'PROHIBITED', autoLeslie: false, autoSlack: false },
    measured: {
      storedCampaigns: campaigns.length,
      storedCampaignIds: campaigns.map((item) => item.campaignId).sort(),
      persistedFindings: findings.length,
      perCampaign: [...perCampaign.values()].sort((left, right) => left.campaignId.localeCompare(right.campaignId)),
      findingStoreRoot: storeRoot,
      reasonerConfigured: Boolean(mergedEnv.NIGHTWATCH_REASONER_CLI ?? mergedEnv.NIGHTWATCH_PRINT_CLI),
      campaignsUnavailable,
      storeUnavailable,
    },
  }, null, 2));
} else if (!cliStopped && command === 'test') {
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
} else if (!cliStopped && command === 'campaign') {
  const sub = args[1] ?? 'help';
  const flags = Object.fromEntries(args.slice(2).filter((item) => item.startsWith('--')).map((item) => {
    const eq = item.indexOf('=');
    return eq === -1 ? [item.slice(2), 'true'] : [item.slice(2, eq), item.slice(eq + 1)];
  }));
  const repositoryIds = flags.repository === undefined ? undefined : [flags.repository];
  const modelLabel = resolveModelLabel(flags);
  /**
   * M7 (8.1/NW-AUD-012): the validated process+.env merge, resolved once and
   * read by every forwarded value. `process.env` is never the source of a
   * value this CLI forwards.
   */
  let campaignEnvCache = null;
  const campaignEnvironment = () => {
    if (campaignEnvCache === null) campaignEnvCache = assertStartupEnvironment();
    return campaignEnvCache;
  };
  if (sub === 'run') {
    if (flags.reasoner !== 'cli') {
      fail(2, 'campaign run requires --reasoner=cli');
    } else if (!DURATIONS.has(flags.duration)) {
      fail(2, 'campaign run requires --duration=1h|4h|8h|overnight');
    } else if (modelLabel === null) {
      // Refused above: --model and NIGHTWATCH_REASONER_MODEL disagree.
    } else if (flags.env === 'dev' || flags.env === 'next' || flags.env === 'production') {
      fail(2, `environment ${flags.env} is NOT AUTHORIZED for this programme`);
    } else if (!assertStartupEnvironment().NIGHTWATCH_REASONER_CLI && !assertStartupEnvironment().NIGHTWATCH_PRINT_CLI) {
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
      // M5 (6.16/C-23): a bounded proof run. The value NARROWS the selected
      // ceiling only — the campaign refuses a widening override — so an
      // operator can run a five-minute proof under the 1h ceiling without a
      // second ceiling tier.
      const wallClockRaw = flags['wall-clock-minutes'];
      const wallClockMinutes = wallClockRaw === undefined ? undefined : Number(wallClockRaw);
      if (!startupOk) {
        // Refused before any child process is created.
      } else if (maxTurns !== undefined && (!Number.isInteger(maxTurns) || maxTurns < 1 || maxTurns > 50)) {
        fail(2, 'campaign run --max-turns must be an integer 1..50');
      } else if (
        wallClockMinutes !== undefined &&
        (!Number.isInteger(wallClockMinutes) || wallClockMinutes < 1 || wallClockMinutes > 24 * 60)
      ) {
        fail(2, 'campaign run --wall-clock-minutes must be an integer 1..1440 (it narrows the selected ceiling)');
      } else {
        const [mod, contextMod, reasonerMod] = loadTypeScriptModules(
          ['src/core/agentRuntime/localCampaign.ts', 'src/core/localInvestigation/ownerLocal.ts', 'src/core/config/reasonerExecutable.ts'],
          { root },
        );
        const extraArgs = [];
        if (typeof campaignEnvironment().NIGHTWATCH_REASONER_SCRIPT === 'string' && campaignEnvironment().NIGHTWATCH_REASONER_SCRIPT.length > 0) {
          extraArgs.push(campaignEnvironment().NIGHTWATCH_REASONER_SCRIPT);
        } else if (campaignEnvironment().NIGHTWATCH_PRINT_CLI) {
          extraArgs.push(path.join(root, 'bin/nightwatch-reasoner-print.mjs'));
        }
        const pause = installCampaignPauseChannel();
        const [receiptMod] = loadTypeScriptModules(['src/core/agentRuntime/productRunReceipt.ts'], { root });
        // CF-03: bind the run to the commit it executes at, and record whether
        // it went through the provider print adapter (a yield campaign) or a
        // custom reasoner script (the smoke/test path).
        const nightwatchIdentityBefore = readNightwatchIdentity();
        const approvedRepositories = repositoryIds ?? [];
        const siblingsBefore = await receiptMod.observeSiblings(approvedRepositories);
        try {
          const providerLabel = campaignEnvironment().NIGHTWATCH_REASONER_PROVIDER ?? 'configured';
          const { executable, reasonerIdentity } = resolveReasonerIdentity(reasonerMod, campaignEnvironment().NIGHTWATCH_REASONER_CLI, {
            adapterPath: extraArgs[0] ?? null,
            provider: providerLabel,
            model: modelLabel,
          });
          // R3-06 / corrections task 8.5: the campaign kind is derived from the
          // RESOLVED adapter identity, never from an environment flag — a
          // custom script cannot present itself as the provider print adapter.
          const campaignKind = reasonerIdentity.adapterPath !== null && reasonerIdentity.adapterPath === path.join(root, 'bin/nightwatch-reasoner-print.mjs')
            ? 'PRINT_CLI_PROVIDER'
            : 'CUSTOM_REASONER_SCRIPT';
          const recordedReasonerIdentity = {
            kind: campaignKind,
            identityDigest: reasonerIdentity.identityDigest,
            printCliDigest: reasonerIdentity.printCliDigest,
          };
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
            wallClockCeilingOverrideMs:
              wallClockMinutes === undefined ? undefined : wallClockMinutes * 60_000,
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
            // A run is bound only when HEAD did not move and the tree was clean
            // at BOTH ends; a moved HEAD keeps the start SHA but is not clean.
            nightwatchIdentity: bindRunIdentity(nightwatchIdentityBefore, readNightwatchIdentity()),
            campaignKind,
            reasonerIdentity: recordedReasonerIdentity,
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
    const [mod, storeMod] = loadTypeScriptModules(
      ['src/core/agentRuntime/localCampaign.ts', 'src/core/localInvestigation/agentFindingStore.ts'],
      { root },
    );
    const campaigns = mod.listLocalCampaigns();
    let findings = [];
    let storeRoot = null;
    let storeUnavailable = null;
    try {
      const store = new storeMod.AgentFindingStore();
      storeRoot = store.root;
      findings = store.list();
    } catch (error) {
      storeUnavailable = error instanceof Error ? error.message : String(error);
    }
    if (sub === 'findings') {
      // M5 (6.14/C-12): one row per campaign, read from the PERSISTED records.
      // A proposal is never presented as a finding, and the count is measured.
      const rows = campaigns.map((item) => {
        const persisted = findings.filter((record) => record.campaignId === item.campaignId);
        return {
          campaignId: item.campaignId,
          status: item.status,
          candidateIds: item.candidateIds,
          persistedAdmissions: persisted.length,
          admissionState:
            persisted.length > 0 ? 'ADMITTED_PERSISTED' : item.candidateIds.length > 0 ? 'PROPOSED_NOT_PERSISTED' : 'NONE',
          dossierIds: persisted.map((record) => record.dossierId).sort(),
        };
      });
      const persistedCampaignIds = new Set(findings.map((record) => record.campaignId));
      for (const campaignId of [...persistedCampaignIds].sort()) {
        if (rows.some((row) => row.campaignId === campaignId)) continue;
        const persisted = findings.filter((record) => record.campaignId === campaignId);
        rows.push({
          campaignId,
          status: 'RECORDS_ONLY',
          candidateIds: persisted.map((record) => record.candidateId),
          persistedAdmissions: persisted.length,
          admissionState: 'ADMITTED_PERSISTED',
          dossierIds: persisted.map((record) => record.dossierId).sort(),
        });
      }
      console.log(
        JSON.stringify(
          {
            command: sub,
            actionableFindings: findings.length,
            storeRoot,
            storeUnavailable,
            rows: rows.sort((left, right) => left.campaignId.localeCompare(right.campaignId)),
          },
          null,
          2,
        ),
      );
    } else {
      console.log(
        JSON.stringify(
          {
            command: sub,
            liveProcess: false,
            campaigns,
            persistedFindings: findings.length,
            storeRoot,
            storeUnavailable,
            note: 'No in-process campaign. Owner-local checkpoints and persisted finding records are listed.',
          },
          null,
          2,
        ),
      );
    }
  } else if (sub === 'resume') {
    if (modelLabel === null) {
      // Refused above: --model and NIGHTWATCH_REASONER_MODEL disagree.
    } else if (!assertStartupEnvironment().NIGHTWATCH_REASONER_CLI && !assertStartupEnvironment().NIGHTWATCH_PRINT_CLI) {
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
      if (typeof campaignEnvironment().NIGHTWATCH_REASONER_SCRIPT === 'string' && campaignEnvironment().NIGHTWATCH_REASONER_SCRIPT.length > 0) {
        extraArgs.push(campaignEnvironment().NIGHTWATCH_REASONER_SCRIPT);
      } else if (campaignEnvironment().NIGHTWATCH_PRINT_CLI) {
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
        const providerLabel = campaignEnvironment().NIGHTWATCH_REASONER_PROVIDER ?? 'configured';
        const { executable, reasonerIdentity } = resolveReasonerIdentity(reasonerMod, campaignEnvironment().NIGHTWATCH_REASONER_CLI, {
          adapterPath: extraArgs[0] ?? null,
          provider: providerLabel,
          model: modelLabel,
        });
        // R3-06: the resume records the same identity-derived kind.
        const campaignKind = reasonerIdentity.adapterPath !== null && reasonerIdentity.adapterPath === path.join(root, 'bin/nightwatch-reasoner-print.mjs')
          ? 'PRINT_CLI_PROVIDER'
          : 'CUSTOM_REASONER_SCRIPT';
        const recordedReasonerIdentity = {
          kind: campaignKind,
          identityDigest: reasonerIdentity.identityDigest,
          printCliDigest: reasonerIdentity.printCliDigest,
        };
        // M7 (8.1): the resume reads the same validated merge.
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
          campaignKind,
          reasonerIdentity: recordedReasonerIdentity,
        });
      } catch (error) {
        fail(2, error instanceof Error ? error.message : 'LOCAL_CAMPAIGN_RESUME_FAILED');
      } finally {
        pause.dispose();
      }
    }
  } else {
    fail(
      2,
      'usage: nightwatch-agent campaign run --reasoner=cli --duration=1h|4h|8h|overnight [--wall-clock-minutes=<n>] [--max-turns=<n>] [--model=<label>] [--repository=<approved-org/repo>]',
    );
  }
} else if (cliStopped) {
  // The shared parser answered --help/--print-metadata or refused an argument.
} else {
  console.log('usage: node bin/nightwatch-agent.mjs status|test|campaign');
  process.exitCode = command === 'help' || command === undefined ? 0 : 2;
}
