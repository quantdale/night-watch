#!/usr/bin/env node
/**
 * One-shot synthetic-input local-model canary wrapper.
 *
 * The TypeScript controller owns the fixed fixture, strict loopback provider,
 * one-call boundary, validation, and sanitized metadata. This wrapper only
 * parses bounded arguments, invokes it once, and maps safe result classes to
 * exit codes. It never reads findings or model output.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * A-12 / 10.2: the shared operator-CLI contract. `--help` and
 * `--print-metadata` answer through the shared parser without executing the
 * canary; the semantic argument validation stays with the TS service, which is
 * the single authority on the canary's exact option set.
 */
/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'ai-local-canary',
  entry: 'bin/ai-local-canary.mjs',
  purpose: 'Run one fixed synthetic local-model canary against a strict loopback provider and report only sanitized metadata.',
  group: 'validate',
  flags: [
    { name: '--endpoint', shape: 'string', required: true, summary: 'loopback v1 chat-completions endpoint' },
    { name: '--model', shape: 'string', required: true, summary: 'model identifier' },
    { name: '--timeout-ms', shape: 'integer', summary: 'bounded timeout 1-5000 ms' },
  ],
  json: false,
  authorization: 'LOCAL_ONLY',
  artifacts: [],
};

const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
if (cli.stop) {
  // The shared parser answered --help/--print-metadata or refused an unknown
  // option; the canary must not execute.
} else {

/** @param {typeof import('../src/core/aiReview/localCanary')} service @param {string | undefined} modelIdentifier */
function printUnexpectedFailure(service, modelIdentifier) {
  console.error('CANARY=FAIL');
  console.error('failureClass=FAIL_SCHEMA');
  console.error('errorCode=LOCAL_CANARY_CONTROL_ERROR');
  console.error('providerClass=LOOPBACK_LOCAL');
  console.error(`modelIdentifier=${modelIdentifier ?? 'NONE'}`);
  console.error('endpointClass=LOOPBACK_ONLY');
  console.error('operation=BUG_CANDIDATE');
  console.error(`inputFixtureVersion=${service.LOCAL_CANARY_INPUT_VERSION}`);
  console.error(`inputFixtureDigest=${service.fixedSyntheticCanaryInputDigest()}`);
  console.error('providerCalls=0');
  console.error('loopbackModelRequests=0');
  console.error('externalAiRequests=0');
  console.error('responseDigest=NONE');
  console.error('outputBytes=NONE');
  console.error('artifactPath=NONE');
  console.error('rawModelOutputPersisted=0');
  console.error('ownerReviewWrites=0');
  console.error('productContacts=0');
}

async function main() {
  /** @type {typeof import('../src/core/aiReview/localCanary')} */
  let service;
  try {
    service = loadRuntimeTypeScriptModule('src/core/aiReview/localCanary.ts', { root });
  } catch {
    console.error('LOCAL_MODEL_CANARY_NOT_RUN');
    console.error('reason=NOT_RUN_RUNTIME_ABSENT');
    process.exitCode = 2;
    return;
  }

  // R4-18 / review-4 task 4.5: `--help`/`-h` and `--print-metadata` are
  // answered by the shared parser above, so no help branch can be reached
  // here; `parseLocalCanaryArgs` keeps its own `--help` result for direct
  // callers, and this wrapper never consults it.
  let parsed;
  try {
    parsed = service.parseLocalCanaryArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof service.LocalCanaryNotRunError) {
      console.error(service.formatLocalCanaryNotRun(error));
    } else {
      console.error(service.formatLocalCanaryNotRun(new service.LocalCanaryNotRunError('NOT_RUN_AMBIGUOUS_CONFIGURATION')));
    }
    process.exitCode = 2;
    return;
  }
  if (parsed.help) {
    usage();
    return;
  }

  try {
    const result = await service.runSingleLocalCanary(parsed);
    console.log(service.formatLocalCanaryPass(result));
    process.exitCode = 0;
  } catch (error) {
    if (error instanceof service.LocalCanaryNotRunError) {
      console.error(service.formatLocalCanaryNotRun(error));
      process.exitCode = 2;
      return;
    }
    if (error instanceof service.LocalCanaryFailureError) {
      console.error(service.formatLocalCanaryFailure(error, parsed.modelIdentifier));
      process.exitCode = 1;
      return;
    }
    printUnexpectedFailure(service, parsed.modelIdentifier);
    process.exitCode = 1;
  }
}

  main();
}
