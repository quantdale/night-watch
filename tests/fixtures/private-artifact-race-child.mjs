#!/usr/bin/env node
// Synthetic local child used only by the private-artifact concurrency tests.
// It intentionally receives no inherited environment, credentials, or target
// configuration and never opens a network or product connection.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule } from '../../bin/lib/typescript-runtime-loader.mjs';

const fixturePath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(fixturePath), '../..');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function barrier(barrierRoot, label) {
  const ready = path.join(barrierRoot, `${label}.ready`);
  const descriptor = fs.openSync(ready, 'wx', 0o600);
  fs.closeSync(descriptor);
  const go = path.join(barrierRoot, 'go');
  const deadline = Date.now() + 10_000;
  while (!fs.existsSync(go)) {
    if (Date.now() >= deadline) throw new Error('SYNTHETIC_BARRIER_TIMEOUT');
    await wait(5);
  }
}

async function main() {
  const [privateRoot, barrierRoot, label, mode, destination, payloadJson] = process.argv.slice(2);
  if (!privateRoot || !barrierRoot || !label || !mode || !destination || !payloadJson) throw new Error('SYNTHETIC_RACE_USAGE_INVALID');
  await barrier(barrierRoot, label);
  const policy = loadTypeScriptModule(path.join(root, 'src', 'core', 'policy', 'privateArtifacts.ts'));
  const storage = loadTypeScriptModule(path.join(root, 'src', 'core', 'aiReview', 'storage.ts'));
  const privateStore = new policy.PrivateArtifactStore({ root: privateRoot, remotePrivacy: 'NO_REMOTE' });
  const payload = JSON.parse(payloadJson);
  if (mode === 'private') {
    privateStore.writeImmutableJson(destination, payload);
  } else if (mode === 'bug') {
    new storage.AiReviewArtifactStore(privateStore).writeBugDraft(payload);
  } else if (mode === 'oracle') {
    new storage.AiReviewArtifactStore(privateStore).writeOracleSuggestion(payload);
  } else {
    throw new Error('SYNTHETIC_RACE_MODE_INVALID');
  }
  process.stdout.write(JSON.stringify({ ok: true, label }) + '\n');
}

try {
  await main();
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, code: error instanceof Error ? error.message : String(error) }) + '\n');
}
