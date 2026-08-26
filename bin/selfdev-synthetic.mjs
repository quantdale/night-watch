#!/usr/bin/env node
/**
 * Phase 8A synthetic self-development wrapper.
 *
 * This CLI accepts only --help. The TypeScript controller owns the fixed
 * deterministic proposer/evaluator and private artifact namespace. The
 * narrow local provenance helper supplies the current clean Git/source DTO.
 * There is no prompt, source, patch, model, product, network, or adoption
 * option.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root });
}

function usage() {
  console.log('Usage: npm run selfdev:synthetic [-- --help]');
  console.log('Runs one bounded synthetic declarative candidate/evaluation matrix and records only a private sanitized result.');
}

function parseArgs(args) {
  if (args.length === 0) return { help: false };
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return { help: true };
  throw new Error('SELFDEV_CLI_USAGE_INVALID');
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
    const provenance = provenanceService.readLocalNightwatchProvenance({ repositoryRoot: root });
    const service = loadTypeScriptModule(path.join(root, 'src', 'core', 'selfDev', 'controller.ts'));
    const report = service.runSyntheticSelfDevSession({ provenance });
    const trustService = loadTypeScriptModule(path.join(root, 'src', 'core', 'selfDev', 'trust.ts'));
    const { privateArtifact: _privateArtifact, ...artifact } = report;
    const assessment = trustService.assessSelfDevArtifactIntegrity(artifact, provenanceService.currentCheckoutState({ repositoryRoot: root }));
    if (assessment.trustStatus !== 'VERIFIED_EXACT_BASE' || assessment.replayStatus !== 'PASS') throw new Error('SELFDEV_TRUST_ASSESSMENT_FAILED');
    const passCount = report.evaluations.filter((evaluation) => evaluation.resultClass === 'EVALUATED_PASS_NOT_ADOPTED').length;
    const duplicateCount = report.evaluations.filter((evaluation) => evaluation.resultClass === 'REJECTED_DUPLICATE').length;
    const rejectedCount = report.evaluations.length - passCount - duplicateCount;
    // Phase 8B.1.0 diagnostics: re-derive the live portfolio selection with the
    // same live adopted state the controller just used. Purely read-only.
    const portfolioService = loadTypeScriptModule(path.join(root, 'src', 'core', 'selfDev', 'portfolio.ts'));
    const adoptedService = loadTypeScriptModule(path.join(root, 'src', 'core', 'selfDev', 'adoptedCases.ts'));
    const selection = portfolioService.selectNextSyntheticProposalVariant({
      adoptedEquivalentFingerprints: adoptedService.selfDevAdoptedEquivalentFingerprints(),
      adoptedCoverageClasses: adoptedService.selfDevAdoptedCoverageClasses(),
    });
    console.log(JSON.stringify({
      SESSION: 'PASS',
      artifactId: report.artifactId,
      schemaVersion: report.schemaVersion,
      baseNightwatchSha: report.baseNightwatchSha,
      sourceBundleDigest: report.provenance.sourceBundleDigest,
      contractDigest: report.provenance.contractDigest,
      candidateCount: report.candidateCount,
      passCount,
      duplicateCount,
      rejectedCount,
      trustStatus: assessment.trustStatus,
      privateArtifactDisposition: report.privateArtifact.disposition,
      adoptionStatus: report.adoptionStatus,
      publication: report.publication,
      sourceWrites: report.sourceWrites,
      gitWrites: report.gitWrites,
      externalCalls: report.externalCalls,
      replayDescriptorFixture: report.replayDescriptor.fixture,
      portfolioStatus: selection === null ? 'EXHAUSTED' : 'SELECTED',
      selectedVariant: selection === null ? null : selection.variantId,
    }));
  } catch {
    console.error('SELFDEV_SYNTHETIC_FAILED');
    process.exitCode = 1;
  }
}

main();
