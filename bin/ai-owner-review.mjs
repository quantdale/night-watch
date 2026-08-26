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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root });
}

function usage() {
  console.log('Usage: npm run ai:owner-review -- <show|status|decide> --kind <bug|oracle> --id <exact-artifact-id>');
  console.log('Commands: show (full safe snapshot), status (safe metadata), decide (interactive owner review).');
  console.log('The decide command requires a TTY and a fixed two-step confirmation.');
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function parseArgs(args) {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) return { help: true };
  if (args.length === 0) throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
  const command = args[0];
  if (command !== 'show' && command !== 'status' && command !== 'decide') throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
  let kind;
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
      if (artifactId.length === 0) throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
    } else {
      throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
    }
  }
  if (kind === undefined || artifactId === undefined) throw fail('AI_OWNER_REVIEW_USAGE_INVALID');
  return { help: false, command, target: { kind, artifactId } };
}

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

  const ask = (question) => new Promise((resolve, reject) => {
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
    const service = loadTypeScriptModule(path.join(root, 'src', 'core', 'aiReview', 'ownerReview.ts'));
    const decision = loadTypeScriptModule(path.join(root, 'src', 'core', 'aiReview', 'ownerDecision.ts'));
    const storage = loadTypeScriptModule(path.join(root, 'src', 'core', 'aiReview', 'storage.ts'));
    await run(parsed, { ...service, ...decision, AiReviewArtifactStore: storage.AiReviewArtifactStore });
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : 'AI_REVIEW_STATE_INVALID';
    console.error(`[SYSTEM] error=${code}`);
    process.exitCode = code === 'AI_OWNER_REVIEW_CANCELLED' ? 4 : code === 'AI_OWNER_REVIEW_USAGE_INVALID' || code === 'AI_OWNER_REVIEW_INTERACTIVE_REQUIRED' ? 2 : code === 'AI_REVIEW_ALREADY_REVIEWED' ? 0 : 3;
  }
}

main();
