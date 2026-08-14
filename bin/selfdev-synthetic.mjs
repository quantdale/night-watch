#!/usr/bin/env node
/**
 * Phase 8A synthetic self-development wrapper.
 *
 * This CLI accepts only --help. The TypeScript controller owns the fixed
 * deterministic proposer/evaluator and private artifact namespace. There is
 * no prompt, source, patch, model, product, network, or adoption option.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadTypeScriptModule(file) {
  const require = createRequire(import.meta.url);
  const typescript = require('typescript');
  const previous = require.extensions['.ts'];
  require.extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const output = typescript.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        target: typescript.ScriptTarget.ES2022,
        module: typescript.ModuleKind.CommonJS,
        moduleResolution: typescript.ModuleResolutionKind.Node10,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    }).outputText;
    module._compile(output, filename);
  };
  try {
    return require(file);
  } finally {
    if (previous === undefined) delete require.extensions['.ts'];
    else require.extensions['.ts'] = previous;
  }
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
    const service = loadTypeScriptModule(path.join(root, 'src', 'core', 'selfDev', 'controller.ts'));
    const report = service.runSyntheticSelfDevSession();
    console.log(JSON.stringify(report));
  } catch {
    console.error('SELFDEV_SYNTHETIC_FAILED');
    process.exitCode = 1;
  }
}

main();
