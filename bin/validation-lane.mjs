#!/usr/bin/env node

// F-PERF-5: development and milestone validation lanes.
//
//   node bin/validation-lane.mjs dev [--base=<ref>] [--workers=N] [--dry-run] [--json]
//   node bin/validation-lane.mjs milestone [...] 
//
// These lanes are explicitly NOT certification. They compose cheap mandatory
// checks, deterministic affected-test selection, and coverage-proven shards.
// Certification remains gate:local / npm test / gate:clean, and a green lane
// here must never be presented as a release authority.

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildChildEnvironment } from './child-environment.mjs';
import { loadTypeScriptModules } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli, invokedDirectly } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANE_LABEL = 'NON-CERTIFICATION LANE — release authority remains gate:local / npm test / gate:clean';

/**
 * One recorded lane step. Every step carries the identity and outcome fields;
 * the measurement fields are present only for the step kinds that produce them,
 * so each recorded step is a `Partial` of the full field set.
 *
 * `totals` is `null` — never absent — when the shard step's output could not be
 * parsed.
 *
 * @typedef {{ readonly id: string, readonly kind: string, readonly exitStatus: number | null, readonly wallMs: number, readonly errorCode: string | null, readonly code: string, readonly changed: number | null, readonly universe: number | null, readonly selected: number | null, readonly broadened: boolean | null, readonly result: string, readonly shards: number | null, readonly totals: { readonly passed: number, readonly failed: number } | null, readonly coverage: boolean | null }} ValidationLaneReceiptStepFields
 */

/** @typedef {Partial<ValidationLaneReceiptStepFields>} ValidationLaneReceiptStep */

/**
 * The human render's view of a recorded step. It dereferences `totals` after an
 * `=== undefined` check only, and an unreadable shard output records `null`
 * there — so the render would throw on that path. That is pre-existing
 * behaviour (the receipt's own `result` already reports the failure); this view
 * records the shape the render is written against.
 *
 * @typedef {{ readonly id: string, readonly exitStatus: number | null, readonly wallMs: number, readonly selected: number | null, readonly totals: { readonly passed: number, readonly failed: number } | undefined }} ValidationLaneReceiptStepRender
 */

/**
 * The receipt is assembled incrementally: the failing step, the total wall
 * clock and the target comparison are attached after the steps have run. The
 * `undefined` initialisers are dropped by `JSON.stringify`, so a dry run emits
 * exactly the same document as before they were added.
 *
 * @typedef {{ readonly schemaVersion: string, readonly lane: import('../src/core/validation/validationLane.ts').LaneId, readonly title: string, readonly authority: string, readonly label: string, readonly targetSeconds: number, readonly base: string, readonly workerCount: number, readonly steps: ValidationLaneReceiptStep[], result: string, failedStep: string | undefined, totalWallMs: number | undefined, withinTarget: boolean | undefined }} ValidationLaneReceipt
 */

/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'validation-lane',
  entry: 'bin/validation-lane.mjs',
  purpose: 'Run the fast development, milestone or pre-push validation lane (not certification).',
  group: 'validate',
  commands: [
    { name: 'dev', summary: 'fast development validation over the affected scope' },
    { name: 'milestone', summary: 'broader milestone integration validation' },
    { name: 'prepush', summary: 'the lane every integrate step runs first (hardening, agent, project, typecheck, typecheck:bin, affected suites)' },
  ],
  commandRequired: true,
  flags: [
    { name: '--base', shape: 'string', summary: 'base revision for affected selection (default origin/main)' },
    { name: '--workers', shape: 'integer', summary: 'parallel shard count (bounded 1..8)' },
    { name: '--dry-run', shape: 'boolean', summary: 'print the composed lane plan without executing' },
    { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON receipt document' },
  ],
  json: true,
  authorization: 'LOCAL_ONLY',
  artifacts: ['test-results/<shard>/ per shard, test-results/timings/ telemetry'],
};

function childEnvironment() {
  const environment = buildChildEnvironment(process.env, { NIGHTWATCH_ENV: 'local', NIGHTWATCH_GATE_ENVIRONMENT: 'DEV_LANE' });
  environment.TZ = 'UTC';
  environment.LC_ALL = 'C';
  environment.LANG = 'C';
  environment.NO_COLOR = '1';
  environment.NIGHTWATCH_HEADED = '0';
  return environment;
}

/**
 * @param {readonly string[]} argv
 * @returns {{ exitStatus: number | null, wallMs: number, stdout: string, stderr: string, errorCode: string | null }}
 */
function runStep(argv) {
  const command = argv[0];
  if (command === undefined) throw new Error('LANE_STEP_COMMAND_MISSING');
  const startedAt = Date.now();
  const result = spawnSync(command, argv.slice(1), { cwd: root, env: childEnvironment(), encoding: 'utf8', timeout: 3_600_000, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const spawnError = /** @type {NodeJS.ErrnoException | undefined} */ (result.error);
  return {
    exitStatus: result.status,
    wallMs: Date.now() - startedAt,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    errorCode: spawnError?.code ?? null,
  };
}

const cli = invokedDirectly(import.meta.url) ? defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url }) : { stop: true };
if (!cli.stop && 'flags' in cli) {
  try {
    const laneId = typeof cli.command === 'string' ? cli.command : '';
    const [lane, affected, shardPlan] = loadTypeScriptModules([
      'src/core/validation/validationLane.ts',
      'src/core/validation/affectedTests.ts',
      'src/core/validation/shardPlan.ts',
    ], { root });
    const composition = lane.validateLaneDefinitions();
    if (!composition.ok) throw new Error(`LANE_DEFINITION_INVALID:${composition.violations[0]?.code ?? 'UNKNOWN'}`);
    const definition = lane.VALIDATION_LANE_DEFINITIONS[/** @type {import('../src/core/validation/validationLane.ts').LaneId} */ (laneId)];
    if (definition === undefined) {
      console.error(JSON.stringify({ schemaVersion: 'nightwatch.validation-lane-receipt.v1', result: 'CONFIG_INVALID', code: 'LANE_UNKNOWN', detail: String(laneId) }));
      process.exitCode = 2;
    } else {
      const base = typeof cli.flags['--base'] === 'string' && cli.flags['--base'] !== '' ? cli.flags['--base'] : 'origin/main';
      const requestedWorkers = shardPlan.resolveParallelShardCount(cli.flags['--workers']);
      if (requestedWorkers === null) {
        console.error(JSON.stringify({ schemaVersion: 'nightwatch.validation-lane-receipt.v1', result: 'CONFIG_INVALID', code: 'LANE_WORKERS_OUT_OF_RANGE' }));
        process.exitCode = 2;
      } else {
        /** @type {ValidationLaneReceipt} */
        const receipt = {
          schemaVersion: 'nightwatch.validation-lane-receipt.v1',
          lane: definition.id,
          title: definition.title,
          authority: definition.authority,
          label: LANE_LABEL,
          targetSeconds: definition.targetSeconds,
          base,
          workerCount: requestedWorkers,
          steps: [],
          result: 'IN_PROGRESS',
          failedStep: undefined,
          totalWallMs: undefined,
          withinTarget: undefined,
        };
        // The affected step runs first: the shard step needs its output, and a
        // refusal must stop the lane before any other work is spent.
        const affectedStep = definition.steps.find((step) => step.kind === 'affected-tests');
        const shardStep = definition.steps.find((step) => step.kind === 'shards');
        const prefixSteps = definition.steps.filter((step) => step.kind === 'command');
        if (affectedStep === undefined || shardStep === undefined) throw new Error('LANE_COMPOSITION_INCOMPLETE');

        if (cli.flags['--dry-run'] === true) {
          const dry = lane.buildLaneExecution({ lane: definition.id, base, selectedTests: [], parallelShardCount: requestedWorkers });
          const output = { ...receipt, result: 'DRY_RUN', steps: dry.steps };
          console.log(cli.json ? JSON.stringify(output, null, 2) : JSON.stringify(output));
        } else {
          const commandSteps = lane.buildLaneExecution({ lane: definition.id, base, selectedTests: [], parallelShardCount: requestedWorkers }).steps.filter((step) => step.kind === 'command');
          let failed = false;
          for (const step of commandSteps) {
            const execution = runStep(step.argv);
            receipt.steps.push({ id: step.id, kind: 'command', exitStatus: execution.exitStatus, wallMs: execution.wallMs, errorCode: execution.errorCode });
            if (execution.exitStatus !== 0) {
              receipt.result = 'STEP_FAILED';
              receipt.failedStep = step.id;
              failed = true;
              break;
            }
          }
          if (!failed) {
            const selectionRun = runStep(['node', 'bin/affected-tests.mjs', `--base=${base}`, '--json']);
            let selection = null;
            try {
              selection = JSON.parse(selectionRun.stdout.trim());
            } catch {
              selection = null;
            }
            receipt.steps.push({
              id: affectedStep.id,
              kind: 'affected-tests',
              exitStatus: selectionRun.exitStatus,
              wallMs: selectionRun.wallMs,
              code: selection?.code ?? 'UNREADABLE',
              changed: selection?.counts?.changed ?? null,
              universe: selection?.counts?.universe ?? null,
              selected: selection?.counts?.selected ?? null,
              broadened: selection?.broadened ?? null,
            });
            if (selectionRun.exitStatus !== 0 || selection === null || !affected.affectedSelectionIsRunnable(selection)) {
              receipt.result = 'AFFECTED_REFUSED';
              failed = true;
            } else {
              const shardExecution = lane.buildLaneExecution({
                lane: definition.id,
                base,
                selectedTests: selection.selectedTests,
                parallelShardCount: requestedWorkers,
              }).steps.find((step) => step.kind === 'shards');
              if (shardExecution === undefined) throw new Error('LANE_COMPOSITION_INCOMPLETE');
              const shardRun = runStep(shardExecution.argv);
              let shardReceipt = null;
              try {
                shardReceipt = JSON.parse(shardRun.stdout.trim());
              } catch {
                shardReceipt = null;
              }
              receipt.steps.push({
                id: shardStep.id,
                kind: 'shards',
                exitStatus: shardRun.exitStatus,
                wallMs: shardRun.wallMs,
                result: shardReceipt?.result ?? 'UNREADABLE',
                shards: shardReceipt?.shards?.length ?? null,
                totals: shardReceipt?.totals ?? null,
                coverage: shardReceipt?.coverage?.ok ?? null,
              });
              if (shardRun.exitStatus !== 0 || shardReceipt === null || shardReceipt.result !== 'PASS') {
                receipt.result = 'TEST_FAILURE';
                failed = true;
              }
            }
          }
          const totalWallMs = receipt.steps.reduce((sum, step) => sum + (step.wallMs ?? 0), 0);
          receipt.totalWallMs = totalWallMs;
          if (!failed) receipt.result = 'PASS';
          receipt.withinTarget = totalWallMs <= definition.targetSeconds * 1000;
          if (cli.json) console.log(JSON.stringify(receipt, null, 2));
          else {
            console.log(`[validation-lane] ${definition.id}: ${receipt.result} wall=${(totalWallMs / 1000).toFixed(1)}s target=${definition.targetSeconds}s ${receipt.withinTarget ? 'WITHIN_TARGET' : 'OVER_TARGET'}`);
            console.log(`[validation-lane] ${LANE_LABEL}`);
            for (const step of /** @type {ValidationLaneReceiptStepRender[]} */ (receipt.steps)) console.log(`  ${step.id}: exit=${step.exitStatus} wall=${((step.wallMs ?? 0) / 1000).toFixed(1)}s${step.selected === undefined ? '' : ` selected=${step.selected}`}${step.totals === undefined ? '' : ` passed=${step.totals.passed} failed=${step.totals.failed}`}`);
          }
          process.exitCode = failed ? 1 : 0;
        }
      }
    }
  } catch (error) {
    console.error(JSON.stringify({ schemaVersion: 'nightwatch.validation-lane-receipt.v1', result: 'CONFIG_INVALID', code: error instanceof Error ? error.message : 'LANE_INVALID' }));
    process.exitCode = 2;
  }
}
