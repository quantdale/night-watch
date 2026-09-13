// Strict parser and integrity checker for the OpenSpec archive index
// (`openspec/changes/archive/ARCHIVE-INDEX.md`, schema
// `nightwatch.openspec-archive-index.v1`), plus the published-spec Purpose
// stub check.
//
// The index is the human-readable classification record G1 wrote when it
// archived 54 terminal changes. Nothing parsed it before this module: a
// `| 54 | undefined | … |` row and 56 archive-CLI Purpose stubs sat on `main`
// while `openspec validate` exited zero.
//
// Read-only: this module only reads filesystem paths it is given.

import fs from 'node:fs';
import path from 'node:path';
import { parseMarkdownSections, sectionBodyText } from '../agent-continuity-protocol.mjs';

export const ARCHIVE_INDEX_SCHEMA = 'nightwatch.openspec-archive-index.v1';
export const ARCHIVE_INDEX_RELATIVE_PATH = 'openspec/changes/archive/ARCHIVE-INDEX.md';
export const ARCHIVE_INDEX_CLASSIFICATIONS = Object.freeze(['CAPABILITY_BEARING', 'BLOCKED_NOT_PUBLISHED']);
export const PURPOSE_MIN_CHARS = 40;
export const PURPOSE_MAX_CHARS = 800;

const TASK_STATUSES = new Set(['COMPLETE', 'BLOCKED', 'IN_PROGRESS']);
const CLASSIFICATIONS = new Set(ARCHIVE_INDEX_CLASSIFICATIONS);
const ROW_RE = /^\| ([^|]+?) \| ([^|]+?) \| ([^|]+?) \| ([^|]*?) \|$/;
const DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}-/;
const PURPOSE_STUB_RE = /^TBD\b|created by archiving change/i;

export function isArchiveIndexChangeId(value) {
  const text = String(value ?? '').trim();
  if (text === '' || /^undefined$/i.test(text) || /^\d+$/.test(text)) return false;
  return /^[A-Za-z][A-Za-z0-9._-]*$/.test(text);
}

/**
 * Published spec names from a `CAPABILITY_BEARING` reason: the substring
 * after `published:`, split on commas and whitespace. Empty when absent.
 */
export function publishedSpecNames(reason) {
  const match = /published:\s*(.*)$/.exec(String(reason ?? ''));
  if (match === null) return [];
  return match[1].split(/[,\s]+/).map((name) => name.trim()).filter(Boolean);
}

/**
 * Parse the index table. Structural failures are returned, never thrown:
 * schema declaration, row grammar, Change cell shape, task status and
 * classification vocabulary. Directory/spec cross-checks are in
 * `inspectArchiveIndex`, which also needs the repository root.
 */
export function parseArchiveIndex(text) {
  const errors = [];
  const rows = [];
  const lines = String(text ?? '').split(/\r?\n/);
  let schemaSeen = false;
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const trimmed = lines[index].trim();
    if (/^Schema:\s*\S+/.test(trimmed)) {
      schemaSeen = true;
      if (!trimmed.endsWith(ARCHIVE_INDEX_SCHEMA)) {
        errors.push(`ARCHIVE_INDEX_SCHEMA_MISMATCH: line ${lineNumber}: expected ${ARCHIVE_INDEX_SCHEMA}`);
      }
      continue;
    }
    if (!trimmed.startsWith('|')) continue;
    if (/^\|\s*:?-{2,}/.test(trimmed) || /^\|\s*Change\s*\|/.test(trimmed)) continue;
    const match = ROW_RE.exec(trimmed);
    if (match === null) {
      errors.push(`ARCHIVE_INDEX_MALFORMED_ROW: line ${lineNumber}: unparseable table row`);
      continue;
    }
    const change = match[1].trim();
    const status = match[2].trim();
    const classification = match[3].trim();
    const reason = match[4].trim();
    if (!isArchiveIndexChangeId(change)) {
      errors.push(
        `ARCHIVE_INDEX_MALFORMED_ROW: line ${lineNumber}: Change cell ${JSON.stringify(change)} is empty, undefined, or a bare integer`
      );
      continue;
    }
    if (!TASK_STATUSES.has(status)) {
      errors.push(`ARCHIVE_INDEX_MALFORMED_ROW: line ${lineNumber}: unknown task status ${JSON.stringify(status)}`);
    }
    if (!CLASSIFICATIONS.has(classification)) {
      errors.push(`ARCHIVE_INDEX_MALFORMED_ROW: line ${lineNumber}: unknown classification ${JSON.stringify(classification)}`);
    }
    rows.push({ line: lineNumber, change, status, classification, reason });
  }
  if (!schemaSeen) errors.push(`ARCHIVE_INDEX_SCHEMA_MISSING: no Schema: ${ARCHIVE_INDEX_SCHEMA} declaration`);
  return { rows, errors };
}

/** Archived change ids keyed by date-prefix-stripped directory name. */
export function archivedChangeDirectories(root) {
  const archiveRoot = path.join(root, 'openspec', 'changes', 'archive');
  const byId = new Map();
  let entries = [];
  try {
    entries = fs.readdirSync(archiveRoot, { withFileTypes: true });
  } catch {
    return byId;
  }
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    byId.set(entry.name.replace(DATE_PREFIX_RE, ''), entry.name);
  }
  return byId;
}

/**
 * Full index integrity: the 1:1 directory pairing and the classification
 * vocabulary's published-name contract. Returns string diagnostics.
 */
export function inspectArchiveIndex(root) {
  const errors = [];
  const archiveRoot = path.join(root, 'openspec', 'changes', 'archive');
  if (!fs.existsSync(archiveRoot)) {
    // A repository with no archive has no index to be wrong about.
    return { errors: [], rows: [] };
  }
  const file = path.join(root, ARCHIVE_INDEX_RELATIVE_PATH);
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { errors: [`ARCHIVE_INDEX_FILE_MISSING: ${ARCHIVE_INDEX_RELATIVE_PATH} is unreadable`], rows: [] };
  }
  const parsed = parseArchiveIndex(text);
  errors.push(...parsed.errors);
  const directories = archivedChangeDirectories(root);
  const rowIds = new Set();
  for (const row of parsed.rows) {
    if (rowIds.has(row.change)) {
      errors.push(`ARCHIVE_INDEX_DUPLICATE_ROW: line ${row.line}: ${row.change} has more than one row`);
    }
    rowIds.add(row.change);
    if (!directories.has(row.change)) {
      errors.push(`ARCHIVE_INDEX_ROW_WITHOUT_DIRECTORY: line ${row.line}: ${row.change} has no archive directory`);
    }
    if (row.classification === 'CAPABILITY_BEARING') {
      const names = publishedSpecNames(row.reason);
      if (names.length === 0) {
        errors.push(`ARCHIVE_INDEX_PUBLISHED_SPEC_MISSING: line ${row.line}: CAPABILITY_BEARING row names no published spec`);
      }
      for (const name of names) {
        if (!fs.existsSync(path.join(root, 'openspec', 'specs', name, 'spec.md'))) {
          errors.push(`ARCHIVE_INDEX_PUBLISHED_SPEC_MISSING: line ${row.line}: published spec ${name} does not exist`);
        }
      }
    } else if (row.classification === 'BLOCKED_NOT_PUBLISHED' && /published:/.test(row.reason)) {
      errors.push(`ARCHIVE_INDEX_BLOCKED_ROW_PUBLISHES: line ${row.line}: BLOCKED_NOT_PUBLISHED row contains published:`);
    }
  }
  for (const id of directories.keys()) {
    if (!rowIds.has(id)) {
      errors.push(`ARCHIVE_INDEX_DIRECTORY_WITHOUT_ROW: archive directory ${id} has no index row`);
    }
  }
  return { errors, rows: parsed.rows };
}

/**
 * Published-spec Purpose integrity. The archive CLI fills Purpose with
 * `TBD - created by archiving change <id>. Update Purpose after archive.`,
 * which satisfies `openspec validate` but says nothing about the capability.
 */
export function inspectPublishedSpecPurposes(root) {
  const errors = [];
  const specsRoot = path.join(root, 'openspec', 'specs');
  let entries = [];
  try {
    entries = fs.readdirSync(specsRoot, { withFileTypes: true });
  } catch {
    return { errors, capabilities: 0 };
  }
  let capabilities = 0;
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const specFile = path.join(specsRoot, entry.name, 'spec.md');
    if (!fs.existsSync(specFile)) continue;
    capabilities += 1;
    const text = fs.readFileSync(specFile, 'utf8');
    const purpose = sectionBodyText(parseMarkdownSections(text).sections.get('Purpose')).trim();
    if (purpose === '') {
      errors.push(`PUBLISHED_SPEC_PURPOSE_STUB: ${entry.name} Purpose is empty`);
    } else if (PURPOSE_STUB_RE.test(purpose)) {
      errors.push(`PUBLISHED_SPEC_PURPOSE_STUB: ${entry.name} Purpose is the archive stub`);
    } else if (purpose.length < PURPOSE_MIN_CHARS) {
      errors.push(`PUBLISHED_SPEC_PURPOSE_STUB: ${entry.name} Purpose is shorter than ${PURPOSE_MIN_CHARS} characters`);
    } else if (purpose.length > PURPOSE_MAX_CHARS) {
      errors.push(`PUBLISHED_SPEC_PURPOSE_STUB: ${entry.name} Purpose exceeds ${PURPOSE_MAX_CHARS} characters`);
    }
  }
  return { errors, capabilities };
}
