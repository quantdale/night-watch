#!/usr/bin/env node
/**
 * Phase 8B controlled source adoption sandbox CLI.
 *
 * Three exact-ID subcommands only: `inspect`, `plan`, `run`. There is no
 * latest/list/enumeration mode, no candidate source/path/patch/command
 * input, and no canonical-apply/commit/push command. `run` requires the
 * exact plan ID and the fixed confirmation token `SANDBOX_ONLY`; the
 * mutation it performs is confined to a disposable private source mirror
 * and never touches this canonical checkout.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root });
}

function usage() {
  console.log('Usage:');
  console.log('  npm run selfdev:adopt-sandbox -- inspect --artifact-id <exact-session-id>');
  console.log('  npm run selfdev:adopt-sandbox -- plan --artifact-id <exact-session-id> --candidate-id <exact-candidate-id>');
  console.log('  npm run selfdev:adopt-sandbox -- run --plan-id <exact-plan-id> --confirm SANDBOX_ONLY');
  console.log('Plans and runs exactly one sandbox-confined declarative source adoption. Never writes canonical source or Git.');
}

const ARTIFACT_ID_RE = /^session:sha256:[0-9a-f]{64}$/;
const CANDIDATE_ID_RE = /^candidate:[0-9a-f]{64}$/;
const PLAN_ID_RE = /^adoption-plan:sha256:[0-9a-f]{64}$/;

function parseArgs(args) {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return { help: true };
  if (args.length === 0) throw new Error('SELFDEV_ADOPT_SANDBOX_USAGE_INVALID');
  const [command, ...rest] = args;
  if (command === 'inspect') {
    if (rest.length !== 2 || rest[0] !== '--artifact-id' || rest[1] === undefined || rest[1].startsWith('--')) {
      throw new Error('SELFDEV_ADOPT_SANDBOX_USAGE_INVALID');
    }
    if (!ARTIFACT_ID_RE.test(rest[1])) throw new Error('SELFDEV_ARTIFACT_ID_INVALID');
    return { help: false, command: 'inspect', artifactId: rest[1] };
  }
  if (command === 'plan') {
    if (rest.length !== 4 || rest[0] !== '--artifact-id' || rest[2] !== '--candidate-id' || rest[1] === undefined || rest[3] === undefined) {
      throw new Error('SELFDEV_ADOPT_SANDBOX_USAGE_INVALID');
    }
    if (!ARTIFACT_ID_RE.test(rest[1])) throw new Error('SELFDEV_ARTIFACT_ID_INVALID');
    if (!CANDIDATE_ID_RE.test(rest[3])) throw new Error('SELFDEV_CANDIDATE_ID_INVALID');
    return { help: false, command: 'plan', artifactId: rest[1], candidateId: rest[3] };
  }
  if (command === 'run') {
    if (rest.length !== 4 || rest[0] !== '--plan-id' || rest[2] !== '--confirm' || rest[1] === undefined || rest[3] === undefined) {
      throw new Error('SELFDEV_ADOPT_SANDBOX_USAGE_INVALID');
    }
    if (!PLAN_ID_RE.test(rest[1])) throw new Error('SELFDEV_PLAN_ID_INVALID');
    if (rest[3] !== 'SANDBOX_ONLY') throw new Error('SELFDEV_ADOPT_SANDBOX_CONFIRMATION_INVALID');
    return { help: false, command: 'run', planId: rest[1] };
  }
  throw new Error('SELFDEV_ADOPT_SANDBOX_USAGE_INVALID');
}

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
    if (parsed.help) {
      usage();
      return;
    }

    const provenanceService = loadTypeScriptModule(path.join(root, 'src', 'core', 'provenance', 'localGit.ts'));
    const sandbox = loadTypeScriptModule(path.join(root, 'src', 'core', 'selfDevSandbox', 'index.ts'));
    const current = provenanceService.currentCheckoutState({ repositoryRoot: root });

    if (parsed.command === 'inspect') {
      const inspection = sandbox.inspectSelfDevAdoption(parsed.artifactId, current);
      console.log(JSON.stringify(inspection));
      return;
    }

    if (parsed.command === 'plan') {
      const plan = sandbox.planAdoption({
        artifactId: parsed.artifactId,
        candidateId: parsed.candidateId,
        current,
        repositoryRoot: root,
      });
      const planStore = new sandbox.SelfDevAdoptionPlanStore();
      const disposition = planStore.writePlan(plan);
      console.log(JSON.stringify({
        planId: plan.planId,
        strategyClass: plan.strategyClass,
        sourceSessionArtifactId: plan.sourceSessionArtifactId,
        candidateId: plan.candidateId,
        targetPath: plan.targetPath,
        targetPreimageDigest: plan.targetPreimageDigest,
        targetPostimageDigest: plan.targetPostimageDigest,
        sourceBundleDigestBefore: plan.sourceBundleDigestBefore,
        contractDigestBefore: plan.contractDigestBefore,
        sandboxAuthority: plan.sandboxAuthority,
        canonicalApply: plan.canonicalApply,
        publication: plan.publication,
        disposition,
      }));
      return;
    }

    // run
    const planStore = new sandbox.SelfDevAdoptionPlanStore({ readOnly: true });
    const plan = planStore.readPlan(parsed.planId);
    const result = sandbox.runSandboxAdoption({
      plan,
      repositoryRoot: root,
      nodeModulesAnchorPath: path.join(root, 'package.json'),
      current,
    });
    const resultStore = new sandbox.SelfDevAdoptionResultStore();
    const disposition = resultStore.writeResult(result);
    console.log(JSON.stringify({ ...result, disposition }));
    if (result.sandboxVerificationStatus !== 'PASS') process.exitCode = 1;
  } catch (error) {
    const code = error instanceof Error ? error.message.split(':')[0] : 'SELFDEV_ADOPT_SANDBOX_FAILED';
    console.error(code);
    process.exitCode = 1;
  }
}

main();
