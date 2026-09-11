#!/usr/bin/env node
/**
 * Read-only verifier for one exact private self-development session ID.
 *
 * The CLI deliberately accepts no root, path, "latest", enumeration,
 * adoption, patch, model, or output option. The TypeScript store is opened in
 * read-only mode and the local Git helper is the only source-attestation
 * boundary. Verification derives a trust assessment; it never writes one.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'selfdev-verify',
  entry: 'bin/selfdev-verify.mjs',
  purpose: 'Replay-verify one exact private self-development artifact ID without writing state.',
  group: 'owner-gated',
  usage: 'npm run selfdev:verify -- --artifact-id <exact-session-id>',
  flags: [
    { name: '--artifact-id', shape: 'string', summary: 'exact private session artifact id' },
  ],
  trailing: { summary: 'the bin validates the exact invocation shape itself and refuses non-exact forms' },
  json: true,
  authorization: 'OWNER_LOCAL',
  artifacts: [],
};

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root });
}

function usage() {
  console.log('Usage: npm run selfdev:verify -- --artifact-id <exact-session-id>');
  console.log('Reads and replay-verifies one private self-development artifact without writing state.');
}

function parseArgs(args) {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return { help: true };
  if (args.length !== 2 || args[0] !== '--artifact-id' || args[1] === undefined || args[1].startsWith('--')) {
    throw new Error('SELFDEV_VERIFY_USAGE_INVALID');
  }
  if (!/^session:sha256:[0-9a-f]{64}$/.test(args[1])) throw new Error('SELFDEV_ARTIFACT_ID_INVALID');
  return { help: false, artifactId: args[1] };
}

function safeFailure(code) {
  const rawCode = typeof code === 'string' ? code : 'SELFDEV_VERIFY_FAILED';
  const trustStatus = rawCode.replace(/^SELFDEV_/, '').split(':')[0] || 'VERIFY_FAILED';
  return {
    SESSION: 'FAIL',
    trustStatus,
    errorCode: rawCode,
    sourceWrites: 0,
    gitWrites: 0,
    externalCalls: 0,
  };
}

function main() {
  const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
  if (cli.stop) return;
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
    if (parsed.help) {
      usage();
      return;
    }

    const storage = loadTypeScriptModule('src/core/selfDev/storage.ts');
    const trust = loadTypeScriptModule('src/core/selfDev/trust.ts');
    const stored = new storage.SelfDevPrivateArtifactStore({ readOnly: true }).readSessionArtifact(parsed.artifactId);
    if (stored.kind === 'LEGACY_V1') {
      console.log(JSON.stringify({
        SESSION: 'LEGACY_UNVERIFIED',
        artifactId: stored.artifact.artifactId,
        schemaVersion: stored.artifact.schemaVersion,
        trustStatus: 'LEGACY_UNVERIFIED_NOT_ELIGIBLE',
        adoptionStatus: stored.artifact.adoptionStatus,
        publication: stored.artifact.publication,
        sourceWrites: 0,
        gitWrites: 0,
        externalCalls: 0,
      }));
      return;
    }

    const provenanceService = loadTypeScriptModule('src/core/provenance/index.ts');
    let current;
    try {
      current = provenanceService.currentCheckoutState({ repositoryRoot: root });
    } catch (error) {
      const code = typeof error?.code === 'string' ? error.code : (typeof error?.message === 'string' ? error.message : 'PROVENANCE_UNAVAILABLE');
      console.log(JSON.stringify({
        ...safeFailure(code),
        artifactId: stored.artifact.artifactId,
        schemaVersion: stored.artifact.schemaVersion,
        baseNightwatchSha: stored.artifact.baseNightwatchSha,
        adoptionStatus: stored.artifact.adoptionStatus,
        publication: stored.artifact.publication,
      }));
      return;
    }
    const assessment = trust.assessSelfDevArtifactIntegrity(stored.artifact, current);
    console.log(JSON.stringify({
      SESSION: assessment.replayStatus === 'PASS' ? 'PASS' : 'FAIL',
      artifactId: assessment.artifactId,
      schemaVersion: assessment.schemaVersionInspected,
      baseNightwatchSha: assessment.baseNightwatchSha,
      currentHeadSha: assessment.currentHeadSha,
      sourceBundleMatch: assessment.sourceBundleMatch,
      contractDigestMatch: assessment.contractDigestMatch,
      baselineRelation: assessment.baselineRelation,
      replayStatus: assessment.replayStatus,
      passCandidateCount: assessment.passCandidateCount,
      trustStatus: assessment.trustStatus,
      adoptionStatus: assessment.adoptionStatus,
      publication: assessment.publication,
      sourceWrites: assessment.sourceWrites,
      gitWrites: assessment.gitWrites,
      externalCalls: assessment.externalCalls,
    }));
  } catch (error) {
    const code = typeof error?.message === 'string' ? error.message.split(':')[0] : 'SELFDEV_VERIFY_FAILED';
    console.log(JSON.stringify(safeFailure(code)));
    process.exitCode = 1;
  }
}

main();
