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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root });
}

function usage() {
  console.log('Usage: npm run ai:local-canary -- --endpoint <loopback-v1-chat-completions-url> --model <model-id> [--timeout-ms <1-5000>]');
  console.log('The command performs one fixed synthetic L2 BUG_CANDIDATE review and never accepts prompt or input text.');
}

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
  let service;
  try {
    service = loadTypeScriptModule('src/core/aiReview/localCanary.ts');
  } catch {
    console.error('LOCAL_MODEL_CANARY_NOT_RUN');
    console.error('reason=NOT_RUN_RUNTIME_ABSENT');
    process.exitCode = 2;
    return;
  }

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
