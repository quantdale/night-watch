#!/usr/bin/env node
// Synthetic child for concurrent owner-decision persistence tests. This is a
// direct internal-service test, not an interactive CLI and not a human-review
// bypass in production runtime code.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule } from '../../bin/lib/typescript-runtime-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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
  const [privateRoot, barrierRoot, label, kind, artifactId, decision, reviewedAt] = process.argv.slice(2);
  if (!privateRoot || !barrierRoot || !label || !kind || !artifactId || !decision || !reviewedAt) throw new Error('SYNTHETIC_OWNER_RACE_USAGE_INVALID');
  await barrier(barrierRoot, label);
  const policy = loadTypeScriptModule(path.join(root, 'src', 'core', 'policy', 'privateArtifacts.ts'));
  const storage = loadTypeScriptModule(path.join(root, 'src', 'core', 'aiReview', 'storage.ts'));
  const ownerReview = loadTypeScriptModule(path.join(root, 'src', 'core', 'aiReview', 'ownerReview.ts'));
  const decisionService = loadTypeScriptModule(path.join(root, 'src', 'core', 'aiReview', 'ownerDecision.ts'));
  const store = new storage.AiReviewArtifactStore(new policy.PrivateArtifactStore({ root: privateRoot, remotePrivacy: 'NO_REMOTE' }));
  const target = { kind, artifactId };
  const expectedArtifactDigest = ownerReview.loadOwnerReviewSnapshot(store, target).artifactDigest;
  const confirmation = decision === 'APPROVE_DRAFT' ? 'APPROVE' : decision === 'REJECT' ? 'REJECT' : 'SUPERSEDE';
  const result = decisionService.recordConfirmedOwnerDecision({
    store,
    target,
    decision,
    confirmation,
    expectedArtifactDigest,
    reviewedAt,
  });
  process.stdout.write(JSON.stringify({ ok: true, decision: result.reviewRecord?.decision }) + '\n');
}

try {
  await main();
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, code: error?.code ?? (error instanceof Error ? error.message : String(error)) }) + '\n');
}
