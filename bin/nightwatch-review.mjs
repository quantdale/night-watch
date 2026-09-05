#!/usr/bin/env node

// ---------------------------------------------------------------------------
// Nightwatch owner-local review-store operations CLI.
//
// Three read-only questions and nothing else: what is in the store, what
// happened to this finding across artifact generations, and what would I file
// for it.
//
// This command CANNOT modify the store. It reaches the store only through
// ControlCenterReviewStoreAuthority, whose ReviewStore is constructed with
// `createIfMissing: false`, so every write method on the underlying private
// artifact store throws. There is no --prune, no --repair, no --clean and no
// hidden equivalent; retention remains an owner decision that this campaign
// was not authorized to make.
//
// The argument grammar and every renderer live in bin/lib/review-cli.mjs so
// they are directly testable. This file is the shell: it resolves the
// authorities, dispatches, and chooses an exit code.
//
// Local and offline. No network, no product environment, no external
// submission of any kind.
// ---------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTypeScriptModule as loadRuntimeTypeScriptModule } from './lib/typescript-runtime-loader.mjs';
import {
  REVIEW_CLI_EXIT,
  REVIEW_CLI_USAGE,
  inventoryExitCode,
  inventoryStatusToken,
  parseReviewCliArgs,
  renderHistoryText,
  renderInspectText,
  renderInventoryText,
} from './lib/review-cli.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadTypeScriptModule(file) {
  return loadRuntimeTypeScriptModule(file, { root: ROOT });
}

export async function runReviewCli(argv, out, err) {
  let parsed;
  try {
    parsed = parseReviewCliArgs(argv);
  } catch {
    err(REVIEW_CLI_USAGE);
    return REVIEW_CLI_EXIT.USAGE;
  }
  if (parsed.command === 'help') {
    out(REVIEW_CLI_USAGE);
    return REVIEW_CLI_EXIT.OK;
  }

  const authorityModule = loadTypeScriptModule('src/controlCenter/authorities/reviewStoreAuthority.ts');
  const findingsModule = loadTypeScriptModule('src/controlCenter/authorities/findingsAuthority.ts');
  const authority = new authorityModule.ControlCenterReviewStoreAuthority();
  const snapshot = findingsModule.createFindingsAuthority().snapshot();
  const context = { dossiers: snapshot.dossiers, campaignId: snapshot.generation };

  if (parsed.command === 'inventory') {
    const inventory = authority.inventory({
      depth: parsed.shallow ? 'SHALLOW' : 'DEEP',
      rowLimit: parsed.limit,
      findingsOffset: parsed.offset,
      // Currentness is claimed only when the findings snapshot can support
      // it. An unavailable snapshot leaves every review UNKNOWN, which is
      // what it is — not "nothing is current".
      ...(snapshot.state === 'AVAILABLE' ? { context } : {}),
    });
    out(
      parsed.json
        ? JSON.stringify({ status: inventoryStatusToken(inventory.health.classification), inventory }, null, 2)
        : renderInventoryText(inventory)
    );
    return inventoryExitCode(inventory.health.classification);
  }

  if (parsed.command === 'inspect') {
    const state = authority.readState(parsed.findingId, context);
    if (state === null) {
      err(`REVIEW_FINDING_NOT_IN_CURRENT_SNAPSHOT ${parsed.findingId}\n`);
      return REVIEW_CLI_EXIT.NOT_FOUND;
    }
    const projection = {
      findingId: parsed.findingId,
      state: state.state,
      staleReason: state.staleReason,
      generations: state.generations.length,
      corruption: state.corruption.map((row) => ({ fileName: row.fileName, code: row.code })),
      organizationalAuthority: state.organizationalAuthority,
    };
    out(parsed.json ? JSON.stringify(projection, null, 2) : renderInspectText(projection));
    return state.state === 'CORRUPT' ? REVIEW_CLI_EXIT.CORRUPTION_PRESENT : REVIEW_CLI_EXIT.OK;
  }

  if (parsed.command === 'history') {
    const history = authority.history(parsed.findingId, context, { offset: parsed.offset, limit: parsed.limit });
    if ('absent' in history) {
      err(`REVIEW_FINDING_NOT_IN_CURRENT_SNAPSHOT ${parsed.findingId}\n`);
      return REVIEW_CLI_EXIT.NOT_FOUND;
    }
    out(parsed.json ? JSON.stringify(history, null, 2) : renderHistoryText(history));
    return history.corruption.length > 0 ? REVIEW_CLI_EXIT.CORRUPTION_PRESENT : REVIEW_CLI_EXIT.OK;
  }

  const artifact = authority.filingReport(parsed.findingId, context);
  if ('absent' in artifact) {
    err(`REVIEW_FINDING_NOT_IN_CURRENT_SNAPSHOT ${parsed.findingId}\n`);
    return REVIEW_CLI_EXIT.NOT_FOUND;
  }
  out(parsed.json ? JSON.stringify(artifact, null, 2) : artifact.markdown);
  return REVIEW_CLI_EXIT.OK;
}

// Entrypoint. Guarded so importing this file runs nothing.
if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await runReviewCli(
      process.argv.slice(2),
      (text) => process.stdout.write(`${text}\n`),
      (text) => process.stderr.write(text)
    );
  } catch {
    // No message body: an internal failure must not become a leak surface.
    process.stderr.write('REVIEW_CLI_INTERNAL_FAILURE\n');
    process.exitCode = REVIEW_CLI_EXIT.INTERNAL;
  }
}
