// ---------------------------------------------------------------------------
// Nightwatch owner-local review CLI — pure argument grammar and renderers.
//
// Separated from the entrypoint so a test can import it. `bin/lib/*.mjs` are
// the repository's importable modules for exactly this reason: a test file is
// transpiled to CommonJS, so a module using `import.meta` cannot be imported
// from one. The entrypoint keeps `import.meta`; nothing here does.
//
// Everything in this file is a pure function over data. It performs no I/O,
// so no rendering choice can reach the store, and every branch is directly
// testable without spawning a process.
// ---------------------------------------------------------------------------

/**
 * Exit codes. Stable, categorical, and deliberately NOT "0 unless something
 * looks untidy": stale history is the store working as designed, so a store
 * full of stale generations exits 0. Only an unusable store, real corruption,
 * or a failed request is non-zero. An exit code that called preserved
 * evidence a failure would train an operator to ignore the one that means
 * corruption.
 */
export const REVIEW_CLI_EXIT = Object.freeze({
  OK: 0,
  USAGE: 1,
  STORE_UNAVAILABLE: 2,
  CORRUPTION_PRESENT: 3,
  NOT_FOUND: 4,
  INTERNAL: 5,
});

/** The commands that exist. There is no destructive verb to be typed. */
export const REVIEW_CLI_COMMANDS = Object.freeze(['inventory', 'history', 'inspect', 'filing', 'help']);

export const REVIEW_CLI_USAGE = `nightwatch-review <command> [options]

Commands:
  inventory                    Read-only summary of the owner-local review store
  history <finding-id>         Review generations for one finding, newest first
  inspect <finding-id>         The current store state for one finding
  filing <finding-id>          The private human filing report for one finding

Options:
  --json                       Machine-readable output
  --shallow                    inventory only: classify by name, open nothing
  --limit=<n>                  Bounded row count, 1..200 (default 50)
  --offset=<n>                 Row offset for paged output
  --help

This command is READ-ONLY. It cannot delete, repair, archive or modify any
review artifact, and no retention policy exists to invoke.
`;

/** The status token printed for an inventory, derived from store health. */
export function inventoryStatusToken(classification) {
  switch (classification) {
    case 'STORE_UNAVAILABLE':
      return 'REVIEW_STORE_NOT_CONFIGURED';
    case 'CORRUPTION_PRESENT':
      return 'REVIEW_STORE_HAS_CORRUPTION';
    case 'UNKNOWN_FILES_PRESENT':
      return 'REVIEW_STORE_HAS_UNKNOWN_ENTRIES';
    case 'TEMPORARY_RESIDUE_PRESENT':
      return 'REVIEW_STORE_HAS_TEMPORARY_RESIDUE';
    case 'STALE_HISTORY_PRESENT':
      return 'REVIEW_STORE_HAS_STALE';
    case 'HEALTHY':
      return 'REVIEW_STORE_HEALTHY';
    default:
      // An unrecognized classification is not quietly reported healthy.
      return 'REVIEW_STORE_STATUS_UNKNOWN';
  }
}

/** Exit code for an inventory. Only unusable, corrupt or unrecognized fails. */
export function inventoryExitCode(classification) {
  if (classification === 'STORE_UNAVAILABLE') return REVIEW_CLI_EXIT.STORE_UNAVAILABLE;
  if (classification === 'CORRUPTION_PRESENT') return REVIEW_CLI_EXIT.CORRUPTION_PRESENT;
  if (inventoryStatusToken(classification) === 'REVIEW_STORE_STATUS_UNKNOWN') return REVIEW_CLI_EXIT.INTERNAL;
  return REVIEW_CLI_EXIT.OK;
}

export function parseReviewCliArgs(argv) {
  const positional = [];
  let json = false;
  let shallow = false;
  let limit = 50;
  let offset = 0;
  for (const argument of argv) {
    if (argument === '--help' || argument === '-h') return { command: 'help', findingId: null, json: false, shallow: false, limit, offset };
    else if (argument === '--json') json = true;
    else if (argument === '--shallow') shallow = true;
    else if (argument.startsWith('--limit=')) {
      const value = Number.parseInt(argument.slice('--limit='.length), 10);
      if (!Number.isSafeInteger(value) || value <= 0 || value > 200) throw new Error('REVIEW_CLI_USAGE');
      limit = value;
    } else if (argument.startsWith('--offset=')) {
      const value = Number.parseInt(argument.slice('--offset='.length), 10);
      if (!Number.isSafeInteger(value) || value < 0) throw new Error('REVIEW_CLI_USAGE');
      offset = value;
    } else if (argument.startsWith('-')) throw new Error('REVIEW_CLI_USAGE');
    else positional.push(argument);
  }
  const command = positional[0] ?? 'help';
  if (!REVIEW_CLI_COMMANDS.includes(command)) throw new Error('REVIEW_CLI_USAGE');
  if (['history', 'inspect', 'filing'].includes(command) && positional.length !== 2) throw new Error('REVIEW_CLI_USAGE');
  if (command === 'inventory' && positional.length !== 1) throw new Error('REVIEW_CLI_USAGE');
  return { command, findingId: positional[1] ?? null, json, shallow, limit, offset };
}

function bytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

/** Human rendering of an inventory. Bounded rows; global counts. */
export function renderInventoryText(inventory) {
  const lines = [];
  const counts = inventory.counts;
  lines.push(`STATUS ${inventoryStatusToken(inventory.health.classification)}`);
  lines.push(`conditions        ${inventory.health.conditions.join(', ')}`);
  lines.push(`store present     ${inventory.exists ? 'yes' : 'no'}`);
  lines.push(`inspection depth  ${inventory.depth}`);
  lines.push('');
  lines.push(`entries           ${counts.entries}`);
  lines.push(
    `canonical reviews ${counts.canonicalArtifacts}  (valid ${counts.validArtifacts}, corrupt ${counts.corruptArtifacts}, unreadable ${counts.unreadableArtifacts})`
  );
  lines.push(`unique findings   ${counts.uniqueFindings}`);
  lines.push(`generations       ${counts.generations}  (findings with more than one: ${counts.findingsWithMultipleGenerations})`);
  lines.push(
    inventory.currentnessResolved
      ? `currentness       CURRENT ${counts.byCurrentness.CURRENT}, STALE ${counts.byCurrentness.STALE}, UNKNOWN ${counts.byCurrentness.UNKNOWN}`
      : 'currentness       NOT RESOLVED — no current artifacts were supplied, so no review is claimed current or stale'
  );
  lines.push(`temporaries       ${counts.temporaryArtifacts}`);
  lines.push(`unknown entries   ${counts.unknownEntries + counts.nonFileEntries} (never opened, never named, never removed)`);
  lines.push(`disk              ${bytes(inventory.bytes.total)} total, ${bytes(inventory.bytes.canonical)} canonical`);
  lines.push(`oldest review     ${inventory.oldestStoredAt ?? 'n/a'}`);
  lines.push(`newest review     ${inventory.newestStoredAt ?? 'n/a'}`);
  lines.push('');
  lines.push('decisions');
  for (const [decision, count] of Object.entries(counts.byDecision).sort()) lines.push(`  ${decision.padEnd(26)}${count}`);
  lines.push('resulting states');
  for (const [state, count] of Object.entries(counts.byResultingState).sort()) lines.push(`  ${state.padEnd(26)}${count}`);
  if (inventory.corruption.length > 0) {
    lines.push('');
    lines.push(`corruption (${inventory.corruptionPage.total} total, showing ${inventory.corruption.length})`);
    // Code and pinned-shape file name only. A validator detail quotes the
    // offending value, and the offending value came out of an untrusted file.
    for (const row of inventory.corruption) lines.push(`  ${row.code.padEnd(38)}${row.fileName}`);
  }
  if (inventory.temporaries.length > 0) {
    lines.push('');
    lines.push(`temporaries (${inventory.temporariesPage.total} total, showing ${inventory.temporaries.length})`);
    for (const row of inventory.temporaries) lines.push(`  ${bytes(row.bytes).padEnd(12)}${row.name}`);
  }
  if (inventory.unknownEntries.length > 0) {
    lines.push('');
    lines.push(`unknown entries (${inventory.unknownEntriesPage.total} total, showing ${inventory.unknownEntries.length})`);
    lines.push('  names are reported as digests: an unrecognized name is not a string Nightwatch chose');
    for (const row of inventory.unknownEntries) lines.push(`  ${row.kind.padEnd(10)}${row.nameDigest}  ${bytes(row.bytes)}`);
  }
  if (inventory.findings.length > 0) {
    lines.push('');
    lines.push(
      `findings (${inventory.findingsPage.total} total, showing ${inventory.findings.length} from offset ${inventory.findingsPage.offset})`
    );
    for (const row of inventory.findings) {
      lines.push(
        `  ${String(row.generations).padStart(4)} gen  cur ${row.currentGenerations}  stale ${row.staleGenerations}  unk ${row.unknownGenerations}  ${row.findingId}`
      );
    }
    if (inventory.findingsPage.truncated) {
      lines.push(`  ... truncated; use --offset=${inventory.findingsPage.offset + inventory.findings.length}`);
    }
  }
  lines.push('');
  lines.push('This store is never pruned automatically. Retention is an owner decision.');
  lines.push(`digest ${inventory.inventoryDigest}`);
  return lines.join('\n');
}

/** Human rendering of one finding's history. Current and historical are never collapsed. */
export function renderHistoryText(history) {
  const lines = [];
  lines.push(`FINDING ${history.findingId}`);
  lines.push(`store state       ${history.state}`);
  lines.push(`generations       ${history.page.total} (showing ${history.generations.length} from offset ${history.page.offset})`);
  lines.push(`current binding   ${history.currentGeneration ?? 'NONE — no stored review binds to the current artifact'}`);
  lines.push(`stale generations ${history.staleGenerationCount}`);
  lines.push(`decision changed  ${history.decisionChangedAcrossGenerations ? 'yes (a local historical fact only)' : 'no'}`);
  lines.push(
    `current artifact  expectation ${history.currentArtifactIdentity.expectationId ?? 'UNKNOWN'}, contract ${history.currentArtifactIdentity.semanticContractId ?? 'UNKNOWN'}`
  );
  lines.push('');
  for (const generation of history.generations) {
    // The label is TEXT, not a colour or an ordering convention: a reviewer
    // reading this in a pipe must see which decision is in force.
    lines.push(`${generation.currentness === 'CURRENT' ? '* CURRENT   ' : '  HISTORICAL'}  ${generation.reviewIdentity}`);
    lines.push(`    stored     ${generation.storedAt}   reviewed ${generation.reviewedAt}`);
    lines.push(`    decision   ${generation.decision} -> ${generation.resultingState}`);
    lines.push(`    source     ${generation.sourceSha}`);
    lines.push(`    campaign   ${generation.campaignId}`);
    lines.push(`    dossier    ${generation.dossierDigest}`);
    if (generation.staleReason !== null) lines.push(`    stale why  ${generation.staleReason}`);
    lines.push(`    identity   none stored (${generation.identityAbsenceReason})`);
    lines.push('');
  }
  if (history.page.truncated) lines.push(`... truncated; use --offset=${history.page.offset + history.generations.length}`);
  if (history.corruption.length > 0) {
    lines.push(`corruption: ${history.corruption.length} generation(s) did not validate and are excluded from the list above`);
    for (const row of history.corruption) lines.push(`  ${row.code}  ${row.fileName}`);
  }
  lines.push('A local review is not a Leslie verdict, a Pondr approval, or organizational sign-off.');
  return lines.join('\n');
}

/** Human rendering of one finding's current store state. */
export function renderInspectText(projection) {
  return [
    `FINDING ${projection.findingId}`,
    `state        ${projection.state}`,
    `stale reason ${projection.staleReason ?? 'n/a'}`,
    `generations  ${projection.generations}`,
    `corruption   ${projection.corruption.length}`,
    'A local review is not a Leslie verdict, a Pondr approval, or organizational sign-off.',
  ].join('\n');
}
