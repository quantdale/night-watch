// Validation execution classes (F-PERF-2 / F-PERF-3).
//
// Every executable test file carries exactly one declared execution class.
// The class is what makes parallel validation mechanically defensible instead
// of heuristic: a file that mutates guarded source, mutates Git state, or
// depends on shared mutable workspace state must never be co-scheduled with
// anything else, while a file that only uses its own scratch directory is safe
// to run beside another process.
//
// Detection is deliberately conservative and non-weakening:
//
//   MUTATION_CAMPAIGN_EXCLUSIVE > SERIAL_REQUIRED
//     > PROCESS_ISOLATED_ONLY > PARALLEL_SAFE
//
// A declaration may be STRICTER than detection (a conservative choice) but
// never weaker; weakening is a misclassification error. Unknown files fail
// closed to SERIAL_REQUIRED.
//
// Pure: text in, judgement out. No filesystem, no clock, no environment.

export const VALIDATION_EXECUTION_CLASSES_SCHEMA = 'nightwatch.validation-execution-classes.v1' as const;

export const EXECUTION_CLASS_ORDER = Object.freeze([
  'PARALLEL_SAFE',
  'PROCESS_ISOLATED_ONLY',
  'SERIAL_REQUIRED',
  'MUTATION_CAMPAIGN_EXCLUSIVE',
] as const);

export type ExecutionClass = (typeof EXECUTION_CLASS_ORDER)[number];

export interface ExecutionClassDetection {
  readonly proposed: ExecutionClass;
  readonly signals: readonly string[];
}

export interface ExecutionClassDeclaration {
  readonly schemaVersion: typeof VALIDATION_EXECUTION_CLASSES_SCHEMA;
  readonly note?: string;
  readonly files: Readonly<Record<string, { readonly class: ExecutionClass; readonly signals: readonly string[] }>>;
}

interface SignalRule {
  readonly signal: string;
  readonly proposed: ExecutionClass;
  readonly pattern: RegExp;
}

/**
 * Ordered rules. The LAST matching rule wins by severity, so order here is
 * irrelevant to strength; it exists only to keep the signal list stable.
 */
const SIGNAL_RULES: readonly SignalRule[] = Object.freeze([
  // The probe campaign mutates the REAL checkout and restores it; it is the
  // only work that must never share a checkout with anything else.
  { signal: 'probe-campaign', proposed: 'MUTATION_CAMPAIGN_EXCLUSIVE', pattern: /--probe-campaign|runRuleProbeCampaign/ },
  // Writing into a temp copy of src/ needs isolation but not exclusivity: the
  // scratch directory is process-private.
  { signal: 'guard-source-mutation', proposed: 'SERIAL_REQUIRED', pattern: /(?:writeFileSync|rmSync)\([^\n]*src\/(?:core|oracles)\// },
  // Only WRITING Git state must serialize. Read-only invocations (status,
  // rev-parse, ls-files, log, cat-file, diff, ...) are observations and are
  // safe beside another process.
  { signal: 'git-mutation', proposed: 'SERIAL_REQUIRED', pattern: /git['"]\s*,\s*\[['"](?:add|am|apply|checkout|clean|commit|merge|rebase|reset|restore|revert|rm|stash|switch|tag|worktree)/ },
  // A per-process cwd change is isolated by the worker process itself.
  { signal: 'process-chdir', proposed: 'PROCESS_ISOLATED_ONLY', pattern: /process\.chdir\(/ },
  { signal: 'fixed-port-bind', proposed: 'PROCESS_ISOLATED_ONLY', pattern: /\.listen\(\s*(?!0\b)\d{2,5}\b/ },
  // Owner-local state needs its own temp roots/home, which the process
  // isolation provides; it does not need serialization.
  { signal: 'owner-local-state', proposed: 'PROCESS_ISOLATED_ONLY', pattern: /os\.homedir\(\)|\.nightwatch\// },
  { signal: 'artifacts-write', proposed: 'PROCESS_ISOLATED_ONLY', pattern: /path\.join\([^)\n]*['"]artifacts['"]/ },
  { signal: 'isolated-scratch', proposed: 'PARALLEL_SAFE', pattern: /mkdtempSync|resolveScratchPath|ephemeralLayout/ },
]);

function severity(value: ExecutionClass): number {
  return EXECUTION_CLASS_ORDER.indexOf(value);
}

/** Detect the minimum defensible class and the signals that justify it. */
export function detectExecutionClass(text: string): ExecutionClassDetection {
  const signals: string[] = [];
  let proposed: ExecutionClass = 'PARALLEL_SAFE';
  for (const rule of SIGNAL_RULES) {
    if (!rule.pattern.test(text)) continue;
    signals.push(rule.signal);
    if (severity(rule.proposed) > severity(proposed)) proposed = rule.proposed;
  }
  return { proposed, signals };
}

export interface ExecutionClassViolation {
  readonly code: string;
  readonly detail: string;
}

/**
 * Validate a declaration against the discovered universe and the mechanical
 * detection. `sources` maps repository-relative test path to its text.
 */
export function validateExecutionClasses(input: {
  readonly discovered: readonly string[];
  readonly sources: ReadonlyMap<string, string>;
  readonly declaration: unknown;
}): { readonly ok: boolean; readonly violations: readonly ExecutionClassViolation[] } {
  const violations: ExecutionClassViolation[] = [];
  const declaration = input.declaration as Partial<ExecutionClassDeclaration> | null;
  if (declaration === null || typeof declaration !== 'object' || declaration.schemaVersion !== VALIDATION_EXECUTION_CLASSES_SCHEMA) {
    return { ok: false, violations: [{ code: 'EXECUTION_CLASSES_SCHEMA_UNSUPPORTED', detail: String((declaration as { schemaVersion?: unknown } | null)?.schemaVersion ?? 'ABSENT') }] };
  }
  const files = declaration.files ?? {};
  const discovered = [...new Set(input.discovered)].sort();
  const seen = new Set<string>();
  for (const file of discovered) {
    const entry = files[file];
    if (entry === undefined) {
      violations.push({ code: 'EXECUTION_CLASS_MISSING', detail: file });
      continue;
    }
    seen.add(file);
    if (!EXECUTION_CLASS_ORDER.includes(entry.class)) {
      violations.push({ code: 'EXECUTION_CLASS_UNKNOWN', detail: `${file}: ${String(entry.class)}` });
      continue;
    }
    const text = input.sources.get(file);
    if (text === undefined) {
      violations.push({ code: 'EXECUTION_CLASS_SOURCE_UNAVAILABLE', detail: file });
      continue;
    }
    const detection = detectExecutionClass(text);
    if (severity(entry.class) < severity(detection.proposed)) {
      violations.push({
        code: 'EXECUTION_CLASS_WEAKER_THAN_DETECTED',
        detail: `${file}: declared ${entry.class} but ${detection.proposed} is required by ${detection.signals.join(', ')}`,
      });
    }
  }
  for (const file of Object.keys(files).sort()) {
    if (!discovered.includes(file)) violations.push({ code: 'EXECUTION_CLASS_DECLARED_MISSING', detail: file });
  }
  return { ok: violations.length === 0, violations };
}

/** Build a declaration from discovered sources, using the detected class. */
export function buildExecutionClassesDeclaration(input: {
  readonly discovered: readonly string[];
  readonly sources: ReadonlyMap<string, string>;
}): ExecutionClassDeclaration {
  const files: Record<string, { class: ExecutionClass; signals: string[] }> = {};
  for (const file of [...new Set(input.discovered)].sort()) {
    const text = input.sources.get(file);
    const detection = text === undefined ? { proposed: 'SERIAL_REQUIRED' as ExecutionClass, signals: ['source-unavailable-fail-closed'] } : detectExecutionClass(text);
    files[file] = { class: detection.proposed, signals: [...detection.signals] };
  }
  return {
    schemaVersion: VALIDATION_EXECUTION_CLASSES_SCHEMA,
    note: 'Generated by bin/validation-execution-classes.mjs --write from mechanical signals; classes are never weaker than the detected class, and unknown files fail closed to SERIAL_REQUIRED.',
    files,
  };
}
