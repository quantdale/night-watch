#!/usr/bin/env node
// W13 receipt measurement-truth fix-up. LOCAL only.
//
// A campaign that ends NO_PROGRESS deletes its owner-local checkpoint, so the
// checkpoint-derived fields in its receipt (tool actions, inspected paths,
// hypotheses) are NOT an observed zero — they are unobserved. This script
// marks those fields NOT_CAPTURED with the reason and records whether the
// checkpoint was available, without touching provider/result-derived fields.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..', '..');
const RUNS = path.join(ROOT, '.agent/tasks/nightwatch-provider-resilient-current-yield-w13-v1', 'evidence', 'runs');
const CAMPAIGN_STATE = path.join(os.homedir(), '.nightwatch', 'campaigns');
const CHECKPOINT_FIELDS = ['actionLogEntries', 'toolActions', 'uniqueInspectedSourcePaths', 'hypothesesFormed', 'reproductionAttemptsTool'];

let changed = 0;
for (const name of fs.readdirSync(RUNS).filter((entry) => entry.endsWith('.json') && entry.startsWith('w13-'))) {
  const file = path.join(RUNS, name);
  const receipt = JSON.parse(fs.readFileSync(file, 'utf8'));
  const checkpointPath = path.join(CAMPAIGN_STATE, `${receipt.runId}.checkpoint.json`);
  const checkpointAvailable = fs.existsSync(checkpointPath);
  receipt.checkpointAvailable = checkpointAvailable;
  if (!checkpointAvailable) {
    const fields = {};
    for (const field of CHECKPOINT_FIELDS) {
      if (receipt[field] === 0 || receipt[field] === null) {
        fields[field] = {
          from: receipt[field],
          to: 'NOT_CAPTURED',
          reason: 'the campaign deleted its owner-local checkpoint on NO_PROGRESS; the action log was not observable after termination',
        };
        receipt[field] = 'NOT_CAPTURED';
      }
    }
    if (Object.keys(fields).length > 0) {
      receipt.measurementCorrections = [
        ...(Array.isArray(receipt.measurementCorrections) ? receipt.measurementCorrections : []),
        { checkpointDeletedOnNoProgress: true, fields },
      ];
      fs.writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`);
      changed += 1;
      process.stdout.write(`[w13] ${receipt.runId}: marked ${Object.keys(fields).join(', ')} NOT_CAPTURED\n`);
    }
  }
}
process.stdout.write(`[w13] receipts updated: ${changed}\n`);
