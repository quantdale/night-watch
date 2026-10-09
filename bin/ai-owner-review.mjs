#!/usr/bin/env node
/**
 * Private human review interface for one exact immutable AI artifact.
 *
 * This wrapper performs argument parsing, the interactive TTY gate, fixed
 * prompts, and safe output only. The loaded TypeScript module is the
 * provider-free owner-review service; it never loads the AI execution path.
 */
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';
import { OPERATOR_CLI_SCHEMA, defineOperatorCli } from './lib/operator-cli.mjs';

/** @type {import('./lib/operator-cli.mjs').OperatorCliMetadata} */
const CLI_METADATA = {
  schemaVersion: OPERATOR_CLI_SCHEMA,
  name: 'ai-owner-review',
  entry: 'bin/ai-owner-review.mjs',
  purpose: 'Review one local AI candidate by id and kind; local and read-only.',
  group: 'inspect-intelligence',
  flags: [
    { name: '--id', shape: 'string', summary: 'candidate identity' },
    { name: '--kind', shape: 'string', summary: 'candidate kind' },
  ],
  commands: [
    { name: 'show', summary: 'render one reviewed candidate (read-only)' },
    { name: 'status', summary: 'report the review store status (read-only)' },
    { name: 'decide', summary: 'interactive human decision (TTY and fixed two-step confirmation required)' },
  ],
  json: false,
  authorization: 'OWNER_GATED',
  artifacts: [],
};

const cli = defineOperatorCli(CLI_METADATA, { entryUrl: import.meta.url });
if (cli.stop) {
  // --help / --print-metadata / usage already emitted; the shared parser has
  // ALREADY set the exit code (success for help/metadata, refusal for an
  // unknown argument), so the bin must not overwrite it with 0.
  process.exit(process.exitCode ?? 0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Load one runtime TypeScript module. The literal module path is kept as a type
 * parameter constrained to the loader's module map, so that map remains the
 * type authority for what each path exports, exactly as at a direct call site.
 *
 * @template {keyof import('./lib/typescript-runtime-loader.mjs').TypeScriptRuntimeLoaderModuleMap} File
 * @param {File} file
 * @returns {import('./lib/typescript-runtime-loader.mjs').TypeScriptRuntimeLoaderModuleMap[File]}
 */
function loadTypeScriptModule(file) {
  return /** @type {import('./lib/typescript-runtime-loader.mjs').TypeScriptRuntimeLoaderModuleMap[File]} */ (loadRuntimeTypeScriptModule(file, { root }));
}

function usage() {
  console.log('Usage: npm run ai:owner-review -- <show|status|decide> --kind <bug|oracle> --id <exact-artifact-id>');
  console.log('Commands: show (full safe snapshot), status (safe metadata), decide (interactive owner review).');
  console.log('The decide command requires a TTY and a fixed two-step confirmation.');
}

/**
 * @param {string} code
 * @returns {NodeJS.ErrnoException}
 */
function fail(code) {
  const error = /** @type {NodeJS.ErrnoException} */ (new Error(code));
  error.code = code;
  return error;
}

/**
 * The `code` a thrown value carries. A thrown value is not necessarily an
 * `Error`, so it is read defensively rather than asserted.
 *
 * @param {unknown} error
 * @returns {string | undefined}
 */
function thrownCode(error) {
  if (error === null || typeof error !== 'object') return undefined;
  const code = /** @type {Record<string, unknown>} */ (error).code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * @param {readonly string[]} args
 * @returns {{ help: true } | { help: false, command: 'show' | 'status' | 'decide', target: { kind: 'bug' | 'oracle', artifactId: string } }}
 */
function parseArgs(args) {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return { help: true };
  if (args.length === 0) throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
  const command = args[0];
  if (command !== 'show' && command !== 'status' && command !== 'decide') throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
  let kind;
  /** @type {string | undefined} */
  let artifactId;
  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--kind') {
      if (kind !== undefined || index + 1 >= args.length || args[index + 1]?.startsWith('--')) throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
      kind = args[++index];
      if (kind !== 'bug' && kind !== 'oracle') throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
    } else if (argument === '--id') {
      if (artifactId !== undefined || index + 1 >= args.length || args[index + 1]?.startsWith('--')) throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
      artifactId = args[++index];
      if (artifactId === undefined || artifactId.length === 0) throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
    } else {
      throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
    }
  }
  if (kind === undefined || artifactId === undefined) throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
  return { help: false, command, target: { kind, artifactId } };
}

/**
 * @param {typeof import('../src/core/aiReview/ownerReview')} service
 */
function createPrompt(service) {
  const input = process.stdin;
  const output = process.stdout;
  const rl = readline.createInterface({ input, output, terminal: true });
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    rl.close();
    input.pause();
  };

  const ask = /** @param {string} question */ (question) => new Promise((resolve, reject) => {
    if (closed) {
      reject(new service.OwnerReviewError('AI_OWNER_REVIEW_CANCELLED'));
      return;
    }
    const onInterrupt = () => {
      process.removeListener('SIGINT', onInterrupt);
      close();
      reject(new service.OwnerReviewError('AI_OWNER_REVIEW_CANCELLED'));
    };
    process.once('SIGINT', onInterrupt);
    rl.question(question, (answer) => {
      process.removeListener('SIGINT', onInterrupt);
      resolve(answer);
    });
  });

  return { ask, close };
}

function printBoundary() {
  console.log('============================================================');
  console.log('NIGHTWATCH OWNER DECISION BOUNDARY');
  console.log('AI CONTENT ENDS ABOVE THIS LINE');
  console.log('============================================================');
}

/**
 * @param {{ help: true } | { help: false, command: 'show' | 'status' | 'decide', target: { kind: 'bug' | 'oracle', artifactId: string } }} parsed
 * @param {typeof import('../src/core/aiReview/ownerReview') & typeof import('../src/core/aiReview/ownerDecision') & { AiReviewArtifactStore: typeof import('../src/core/aiReview/storage').AiReviewArtifactStore }} service
 */
async function run(parsed, service) {
  if (parsed.help) {
    usage();
    return;
  }
  if (parsed.command === 'decide' && (!process.stdin.isTTY || !process.stdout.isTTY)) throw fail('AI_OWNER_REVIEW_INTERACTIVE_REQUIRED');

  const store = new service.AiReviewArtifactStore();
  const snapshot = service.loadOwnerReviewSnapshot(store, parsed.target);
  if (parsed.command === 'show') {
    console.log(service.renderOwnerReviewSnapshot(snapshot));
    return;
  }
  if (parsed.command === 'status') {
    console.log(service.renderOwnerReviewStatus(snapshot));
    return;
  }

  if (snapshot.reviewRecord !== null) {
    console.log('[SYSTEM] OWNER REVIEW ALREADY RECORDED');
    console.log(service.renderOwnerReviewStatus(snapshot));
    return;
  }
  service.assertOwnerDecisionWritable(snapshot);
  console.log(service.renderOwnerReviewSnapshot(snapshot));
  printBoundary();
  console.log('[SYSTEM] Choose one: A = approve draft, R = reject, S = supersede, Q = cancel.');

  const prompt = createPrompt(service);
  try {
    const choice = await prompt.ask('Decision: ');
    const decision = service.decisionFromMenuChoice(choice);
    if (decision === null || decision === 'CANCEL') throw new service.OwnerReviewError('AI_OWNER_REVIEW_CANCELLED');
    console.log(`[SYSTEM] selected-decision=${decision}`);
    console.log(`[SYSTEM] meaning=${service.decisionMeaning(parsed.target.kind, decision)}`);
    const token = service.confirmationTokenForDecision(decision);
    const confirmation = await prompt.ask(`Type ${token} to confirm exactly, or press Enter to cancel: `);
    const result = service.recordConfirmedOwnerDecision({ store, target: parsed.target, decision, confirmation, expectedArtifactDigest: snapshot.artifactDigest, reviewedAt: new Date().toISOString() });
    console.log('[SYSTEM] OWNER REVIEW RECORDED');
    console.log(service.renderOwnerReviewStatus(result));
  } finally {
    prompt.close();
  }
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
    if (parsed.help) {
      usage();
      return;
    }
    if (parsed.command === 'decide' && (!process.stdin.isTTY || !process.stdout.isTTY)) throw fail('AI_OWNER_REVIEW_INTERACTIVE_REQUIRED');
    const service = loadTypeScriptModule('src/core/aiReview/ownerReview.ts');
    const decision = loadTypeScriptModule('src/core/aiReview/ownerDecision.ts');
    const storage = loadTypeScriptModule('src/core/aiReview/storage.ts');
    await run(parsed, { ...service, ...decision, AiReviewArtifactStore: storage.AiReviewArtifactStore });
  } catch (error) {
    const code = thrownCode(error) ?? 'AI_REVIEW_STATE_INVALID';
    console.error(`[SYSTEM] error=${code}`);
    process.exitCode = code === 'AI_OWNER_REVIEW_CANCELLED' ? 4 : code === 'AI_OWNER_REVIEW_USAGE_INVALID' || code === 'AI_OWNER_REVIEW_INTERACTIVE_REQUIRED' ? 2 : code === 'AI_REVIEW_ALREADY_REVIEWED' ? 0 : 3;
  }
}

main();
