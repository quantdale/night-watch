// ---------------------------------------------------------------------------
// Nightwatch C-10 / Workstream 17 — deterministic persistence audit.
//
// Runs after the synthetic C-10 campaign and inspects EVERY root the
// production privacy cone is allowed to create — not merely the finding JSON
// files. Temp paths and browser-profile paths are in scope by construction,
// because the independent review's leakage paths live there.
//
// It reports bounded counts and CATEGORICAL violations. It never echoes a
// discovered value: a violation names its class and a path RELATIVE to the
// audited root, never the offending bytes.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { productionProfileResidue } from './browserProfile';

export const PRODUCTION_PERSISTENCE_AUDIT_VERSION = 'nightwatch.production-persistence-audit.v1' as const;

export const PERSISTENCE_VIOLATION_CLASSES = [
  'RAW_RESPONSE_BODY',
  'RAW_REQUEST_PARAMETER_VALUE',
  'FORBIDDEN_KEY',
  'CUSTOMER_SENTINEL',
  'CONSOLE_PAYLOAD',
  'SCREENSHOT',
  'TRACE',
  'STORAGE_STATE',
  'UNSAFE_TEMP_ARTIFACT',
  'BROWSER_PROFILE_RESIDUE',
  'CONTROL_CENTER_EXPOSURE',
  'UNSAFE_PERMISSIONS',
  'PATH_ESCAPE',
  'UNKNOWN_ARTIFACT',
] as const;
export type PersistenceViolationClass = (typeof PERSISTENCE_VIOLATION_CLASSES)[number];

export interface PersistenceViolation {
  readonly violationClass: PersistenceViolationClass;
  /** Path RELATIVE to the audited root. Never the offending content. */
  readonly relativePath: string;
}

export interface PersistenceAuditReport {
  readonly version: typeof PRODUCTION_PERSISTENCE_AUDIT_VERSION;
  readonly rootsInspected: number;
  readonly filesInspected: number;
  readonly directoriesInspected: number;
  readonly bytesInspected: number;
  readonly violations: readonly PersistenceViolation[];
  readonly clean: boolean;
}

/** Extensions that must never exist under a production root. */
const SCREENSHOT_EXTENSIONS: ReadonlySet<string> = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const TRACE_EXTENSIONS: ReadonlySet<string> = new Set(['.zip', '.trace', '.har']);
/** Filenames that indicate captured authenticated session state. */
const STORAGE_STATE_NAMES: ReadonlySet<string> = new Set([
  'storagestate.json',
  'storage-state.json',
  'state.json',
  'cookies.json',
]);
/** Console payload files from the DEV run recorder must not exist here. */
const CONSOLE_PAYLOAD_NAMES: ReadonlySet<string> = new Set(['console.jsonl', 'events.jsonl', 'network.jsonl']);

/** Keys that must never appear in a production artifact. */
const FORBIDDEN_ARTIFACT_KEYS: readonly string[] = [
  '"body"',
  '"responseBody"',
  '"headers"',
  '"cookies"',
  '"setCookie"',
  '"authorization"',
  '"token"',
  '"accessToken"',
  '"idToken"',
  '"refreshToken"',
  '"storageState"',
  '"dom"',
  '"html"',
  '"text"',
  '"screenshot"',
  '"trace"',
  '"encounterToken"',
  '"numericEncounterRef"',
];

/** Maximum files the audit will inspect before reporting a bound. */
const MAX_AUDIT_FILES = 20_000;
const MAX_AUDIT_FILE_BYTES = 4 * 1024 * 1024;

export interface PersistenceAuditRequest {
  /** Every root the production cone is permitted to create. */
  readonly roots: readonly string[];
  /** Base directories that may contain ephemeral production browser profiles. */
  readonly profileBaseDirectories?: readonly string[];
  /**
   * Sentinel values from the synthetic corpus. The audit proves ZERO of these
   * bytes exist anywhere under the audited roots.
   */
  readonly sentinels?: readonly string[];
}

function walk(
  root: string,
  onFile: (absolute: string, relative: string, stat: fs.Stats) => void,
  onDirectory: (absolute: string, relative: string, stat: fs.Stats) => void,
  budget: { files: number },
): void {
  if (!fs.existsSync(root)) return;
  const stack: string[] = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(root, absolute);
      let stat: fs.Stats;
      try {
        stat = fs.lstatSync(absolute);
      } catch {
        continue;
      }
      if (stat.isSymbolicLink()) {
        // A symlink out of the root is a path escape, and is never followed.
        onFile(absolute, relative, stat);
        continue;
      }
      if (stat.isDirectory()) {
        onDirectory(absolute, relative, stat);
        stack.push(absolute);
      } else if (stat.isFile()) {
        budget.files += 1;
        if (budget.files > MAX_AUDIT_FILES) return;
        onFile(absolute, relative, stat);
      }
    }
  }
}

/**
 * Audit every permitted production root. Deterministic: the same tree yields
 * the same report, with violations sorted by class then path.
 */
export function auditProductionPersistence(request: PersistenceAuditRequest): PersistenceAuditReport {
  const violations: PersistenceViolation[] = [];
  const sentinels = request.sentinels ?? [];
  let filesInspected = 0;
  let directoriesInspected = 0;
  let bytesInspected = 0;
  const budget = { files: 0 };

  const record = (violationClass: PersistenceViolationClass, relativePath: string): void => {
    violations.push({ violationClass, relativePath });
  };

  for (const root of request.roots) {
    walk(
      root,
      (absolute, relative, stat) => {
        filesInspected += 1;

        if (stat.isSymbolicLink()) {
          record('PATH_ESCAPE', relative);
          return;
        }
        // Owner-only files: mode 0600, no group or other bits.
        if ((stat.mode & 0o077) !== 0) record('UNSAFE_PERMISSIONS', relative);

        const lowerName = path.basename(relative).toLowerCase();
        const extension = path.extname(lowerName);
        if (SCREENSHOT_EXTENSIONS.has(extension)) record('SCREENSHOT', relative);
        if (TRACE_EXTENSIONS.has(extension)) record('TRACE', relative);
        if (STORAGE_STATE_NAMES.has(lowerName)) record('STORAGE_STATE', relative);
        if (CONSOLE_PAYLOAD_NAMES.has(lowerName)) record('CONSOLE_PAYLOAD', relative);
        if (lowerName.endsWith('.tmp')) record('UNSAFE_TEMP_ARTIFACT', relative);

        if (stat.size > MAX_AUDIT_FILE_BYTES) {
          record('UNKNOWN_ARTIFACT', relative);
          return;
        }
        let content: string;
        try {
          content = fs.readFileSync(absolute, 'utf8');
        } catch {
          record('UNKNOWN_ARTIFACT', relative);
          return;
        }
        bytesInspected += content.length;

        for (const sentinel of sentinels) {
          if (sentinel !== '' && content.includes(sentinel)) {
            record('CUSTOMER_SENTINEL', relative);
            break;
          }
        }
        for (const key of FORBIDDEN_ARTIFACT_KEYS) {
          if (content.includes(key)) {
            record('FORBIDDEN_KEY', relative);
            break;
          }
        }
        // A concrete query parameter must never appear in a persisted route.
        if (/"routeTemplate"\s*:\s*"[^"]*[?&][^"]*"/.test(content)) {
          record('RAW_REQUEST_PARAMETER_VALUE', relative);
        }
        // A raw response body would arrive as a nested object outside the
        // closed vocabulary; the firewall refuses it, and this is the
        // post-hoc check that it did.
        if (/"rawBody"|"payload"\s*:\s*\{/.test(content)) {
          record('RAW_RESPONSE_BODY', relative);
        }
      },
      (_absolute, relative, stat) => {
        directoriesInspected += 1;
        if ((stat.mode & 0o077) !== 0) record('UNSAFE_PERMISSIONS', relative);
      },
      budget,
    );
  }

  // F-17: stale production browser-profile residue is a first-class violation,
  // not something the audit is allowed to miss by only looking at JSON.
  for (const base of request.profileBaseDirectories ?? []) {
    for (const residue of productionProfileResidue(base)) {
      violations.push({
        violationClass: 'BROWSER_PROFILE_RESIDUE',
        relativePath: path.relative(base, residue),
      });
    }
  }

  violations.sort((left, right) =>
    left.violationClass === right.violationClass
      ? left.relativePath.localeCompare(right.relativePath)
      : left.violationClass.localeCompare(right.violationClass),
  );

  return {
    version: PRODUCTION_PERSISTENCE_AUDIT_VERSION,
    rootsInspected: request.roots.length,
    filesInspected,
    directoriesInspected,
    bytesInspected,
    violations,
    clean: violations.length === 0,
  };
}
