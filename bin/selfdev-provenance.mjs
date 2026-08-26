#!/usr/bin/env node
/**
 * Phase 8A.1 local provenance boundary.
 *
 * This wrapper is the only runtime entry that may read fixed local Git/source
 * metadata. It accepts only help; the normal synthetic controller invokes the
 * same typed helper in-process with no user-selectable root or argv.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root });
}

export function readCurrentLocalProvenance() {
  const helper = loadTypeScriptModule(path.join(root, 'src', 'core', 'provenance', 'localGit.ts'));
  return helper.readLocalNightwatchProvenance({ repositoryRoot: root });
}

function usage() {
  console.log('Usage: node bin/selfdev-provenance.mjs [--help]');
  console.log('Reads fixed local Nightwatch Git/source metadata without mutation.');
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
      usage();
      return;
    }
    console.error('SELFDEV_PROVENANCE_USAGE_INVALID');
    process.exitCode = 2;
    return;
  }
  try {
    const provenance = readCurrentLocalProvenance();
    console.log(JSON.stringify({
      schemaVersion: provenance.schemaVersion,
      gitHeadSha: provenance.gitHeadSha,
      sourceBundleDigest: provenance.sourceBundleDigest,
      contractDigest: provenance.contractDigest,
      algorithmVersion: provenance.algorithmVersion,
      authoritativeSourceState: provenance.authoritativeSourceState,
      runtimeNodeVersion: provenance.runtimeNodeVersion,
      provenanceClass: provenance.provenanceClass,
    }));
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'PROVENANCE_UNAVAILABLE';
    console.error(`SELFDEV_PROVENANCE_FAILED:${code}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
