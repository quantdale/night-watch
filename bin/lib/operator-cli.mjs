#!/usr/bin/env node

// Operator CLI contract (programme group 4; closes F-05).
//
// One implementation, not 62. A bin routes through `defineOperatorCli` before
// any effect and receives:
//
//   - `--help` / `-h` / `help`: rendered usage on stdout, exit 0, no effect;
//   - `--print-metadata`: the declared metadata as exactly one JSON document,
//     exit 0, no effect (this is what the command listing and the sweep read);
//   - strict refusal of an unknown flag, a missing or malformed value, a
//     conflicting repeat, an unexpected positional and an unknown subcommand,
//     each with a distinct code and exit 2;
//   - the convention exit codes: 0 success, 1 failure, 2 usage, 3 fail-closed
//     refusal, 4 external block.
//
// The parser is deliberately strict DATA-in and DATA-out: no filesystem, no
// clock, no subprocess. `defineOperatorCli` is the process-facing wrapper and
// is the only place that writes or exits.

export const OPERATOR_CLI_SCHEMA = 'nightwatch.operator-cli.v1';

export const OPERATOR_CLI_EXIT = Object.freeze({
  SUCCESS: 0,
  FAILURE: 1,
  USAGE: 2,
  REFUSAL: 3,
  EXTERNAL_BLOCK: 4,
});

export const OPERATOR_CLI_GROUPS = Object.freeze([
  'run-scenario',
  'inspect-intelligence',
  'validate',
  'manage-sessions',
  'manage-evidence',
  'control-center',
  'owner-gated',
  'internal-tooling',
]);

const GROUP_SET = new Set(OPERATOR_CLI_GROUPS);
const FLAG_SHAPES = new Set(['boolean', 'string', 'integer', 'path', 'enum', 'string-list']);
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,47}$/;
const FLAG_PATTERN = /^--[a-z0-9][a-z0-9-]{0,47}$/;
const ABSOLUTE_PATH_PATTERN = /(?:^|[\s"'(=:])(\/(?:home|Users|root|tmp|var|private|etc|opt|mnt|media)\/[^\s"')]+)/;

/** A usage error: the operator asked for something the command cannot mean. */
export class OperatorCliUsageError extends Error {
  /**
   * @param {string} code
   * @param {string} detail
   */
  constructor(code, detail) {
    super(detail);
    this.name = 'OperatorCliUsageError';
    this.code = code;
  }
}

/** A metadata declaration error: the bin author declared an invalid contract. */
export class OperatorCliMetadataError extends Error {
  /**
   * @param {string} detail
   */
  constructor(detail) {
    super(detail);
    this.name = 'OperatorCliMetadataError';
    this.code = 'CLI_METADATA_INVALID';
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Structural validation of one declaration. Returns every problem rather than
 * the first so a metadata error is diagnosable in one pass.
 * @param {unknown} metadata
 * @returns {string[]}
 */
export function validateOperatorMetadata(metadata) {
  const errors = [];
  if (!isPlainObject(metadata)) {
    errors.push('metadata must be an object');
    return errors;
  }
  if (metadata.schemaVersion !== OPERATOR_CLI_SCHEMA) {
    errors.push(`schemaVersion must be ${OPERATOR_CLI_SCHEMA}`);
  }
  if (typeof metadata.name !== 'string' || !NAME_PATTERN.test(metadata.name)) {
    errors.push('name must be a lowercase kebab-case identifier');
  }
  if (typeof metadata.entry !== 'string' || !metadata.entry.startsWith('bin/') || !metadata.entry.endsWith('.mjs')) {
    errors.push('entry must be a bin/*.mjs path');
  }
  if (typeof metadata.purpose !== 'string' || metadata.purpose.trim().length < 12 || metadata.purpose.includes('\n')) {
    errors.push('purpose must be one non-empty line of at least 12 characters');
  }
  if (typeof metadata.group !== 'string' || !GROUP_SET.has(metadata.group)) {
    errors.push(`group must be one of ${OPERATOR_CLI_GROUPS.join(', ')}`);
  }
  if (typeof metadata.usage !== 'undefined' && (typeof metadata.usage !== 'string' || metadata.usage.length === 0)) {
    errors.push('usage must be a non-empty string when present');
  }
  const commandNames = new Set();
  for (const command of metadata.commands ?? []) {
    if (!isPlainObject(command) || typeof command.name !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(command.name)) {
      errors.push('each command needs a lowercase name');
      continue;
    }
    if (commandNames.has(command.name)) errors.push(`duplicate command ${command.name}`);
    commandNames.add(command.name);
    if (typeof command.summary !== 'string' || command.summary.trim().length === 0) {
      errors.push(`command ${command.name} needs a summary`);
    }
  }
  if (metadata.commands !== undefined && !Array.isArray(metadata.commands)) errors.push('commands must be an array');
  if (typeof metadata.commandRequired !== 'undefined' && typeof metadata.commandRequired !== 'boolean') {
    errors.push('commandRequired must be a boolean');
  }
  if (metadata.defaultCommand !== undefined) {
    if (typeof metadata.defaultCommand !== 'string' || !commandNames.has(metadata.defaultCommand)) {
      errors.push('defaultCommand must name a declared command');
    }
  }
  const flagNames = new Set();
  for (const flag of metadata.flags ?? []) {
    if (!isPlainObject(flag) || typeof flag.name !== 'string' || !FLAG_PATTERN.test(flag.name)) {
      errors.push('each flag needs a --lower-case-kebab name');
      continue;
    }
    if (flagNames.has(flag.name)) errors.push(`duplicate flag ${flag.name}`);
    flagNames.add(flag.name);
    if (!FLAG_SHAPES.has(flag.shape)) errors.push(`flag ${flag.name} needs a shape in ${[...FLAG_SHAPES].join(', ')}`);
    if (typeof flag.summary !== 'string' || flag.summary.trim().length === 0) errors.push(`flag ${flag.name} needs a summary`);
    if (flag.shape === 'enum' && (!Array.isArray(flag.values) || flag.values.length === 0 || flag.values.some((value) => typeof value !== 'string'))) {
      errors.push(`flag ${flag.name} with shape enum needs string values`);
    }
  }
  if (metadata.flags !== undefined && !Array.isArray(metadata.flags)) errors.push('flags must be an array');
  const positionals = metadata.positionals;
  if (positionals !== undefined) {
    if (!isPlainObject(positionals)) {
      errors.push('positionals must be an object');
    } else {
      const min = positionals.min ?? 0;
      const max = positionals.max ?? 0;
      if (!Number.isInteger(min) || min < 0) errors.push('positionals.min must be a non-negative integer');
      if (!Number.isInteger(max) || max < min) errors.push('positionals.max must be an integer not below min');
      if (positionals.names !== undefined && (!Array.isArray(positionals.names) || positionals.names.some((name) => typeof name !== 'string'))) {
        errors.push('positionals.names must be an array of strings');
      }
      if (positionals.choices !== undefined && (!Array.isArray(positionals.choices) || positionals.choices.some((choice) => typeof choice !== 'string'))) {
        errors.push('positionals.choices must be an array of strings');
      }
    }
  }
  if (metadata.trailing !== undefined && typeof metadata.trailing !== 'boolean' && !isPlainObject(metadata.trailing)) {
    errors.push('trailing must be a boolean or an object with a summary');
  }
  if (metadata.json !== undefined && typeof metadata.json !== 'boolean') errors.push('json must be a boolean');
  if (metadata.authorization !== undefined && (typeof metadata.authorization !== 'string' || metadata.authorization.trim().length === 0)) {
    errors.push('authorization must be a non-empty string when present');
  }
  if (metadata.artifacts !== undefined && (!Array.isArray(metadata.artifacts) || metadata.artifacts.some((artifact) => typeof artifact !== 'string'))) {
    errors.push('artifacts must be an array of relative paths');
  }
  return errors;
}

function requireMetadata(metadata) {
  const errors = validateOperatorMetadata(metadata);
  if (errors.length > 0) throw new OperatorCliMetadataError(errors.join('; '));
  return metadata;
}

function commandSummaryLine(metadata, commandName) {
  const command = (metadata.commands ?? []).find((candidate) => candidate.name === commandName);
  return command === undefined ? null : `  ${command.name.padEnd(18)} ${command.summary}`;
}

function declarationUsage(metadata) {
  if (typeof metadata.usage === 'string' && metadata.usage.length > 0) return metadata.usage;
  const parts = [`node ${metadata.entry}`];
  const commands = metadata.commands ?? [];
  if (commands.length > 0) {
    const names = commands.map((command) => command.name);
    if (metadata.commandRequired === true) parts.push(metadata.defaultCommand === undefined ? `<${names.join('|')}>` : `[${names.join('|')}]`);
    else parts.push(`[${names.join('|')}]`);
  }
  for (const flag of metadata.flags ?? []) {
    if (flag.name === '--json' && metadata.json === true) continue;
    const value = flag.shape === 'boolean' ? '' : flag.shape === 'enum' ? `=<${(flag.values ?? []).join('|')}>` : '=<value>';
    parts.push(flag.repeatable === true ? `[${flag.name}${value}]...` : `[${flag.name}${value}]`);
  }
  const positionals = metadata.positionals;
  if (positionals !== undefined && (positionals.max ?? 0) > 0) {
    const names = positionals.names ?? [];
    const min = positionals.min ?? 0;
    for (let index = 0; index < (positionals.max ?? 0); index += 1) {
      const name = names[index] ?? `arg${index + 1}`;
      parts.push(index < min ? `<${name}>` : `[${name}]`);
    }
  }
  if (metadata.json === true) parts.push('[--json]');
  if (metadata.trailing !== undefined && metadata.trailing !== false) parts.push('[-- ...]');
  return parts.join(' ');
}

/**
 * Human usage. States purpose, commands, flags with value shapes, exit codes,
 * artifacts and authorization class, per the contract.
 * @param {object} metadata
 * @returns {string}
 */
export function renderOperatorHelp(metadata) {
  requireMetadata(metadata);
  const lines = [];
  lines.push(`Usage: ${declarationUsage(metadata)}`);
  lines.push('');
  lines.push(metadata.purpose.trim());
  const commands = metadata.commands ?? [];
  if (commands.length > 0) {
    lines.push('');
    lines.push('Commands:');
    for (const command of commands) lines.push(commandSummaryLine(metadata, command.name) ?? '');
  }
  const flags = metadata.flags ?? [];
  if (flags.length > 0 || metadata.json === true) {
    lines.push('');
    lines.push('Options:');
    for (const flag of flags) {
      if (flag.name === '--json' && metadata.json === true) continue;
      const shape = flag.shape === 'enum' ? `=<${(flag.values ?? []).join('|')}>` : flag.shape === 'boolean' ? '' : `=<${flag.shape}>`;
      lines.push(`  ${`${flag.name}${shape}`.padEnd(24)} ${flag.summary}`);
    }
    if (metadata.json === true) lines.push(`  ${'--json'.padEnd(24)} emit exactly one JSON document on stdout`);
  }
  if (metadata.commandRequired === true) {
    lines.push('');
    lines.push('The subcommand is required.');
  }
  lines.push('');
  lines.push('Exit codes: 0 success, 1 failure, 2 usage error, 3 fail-closed refusal, 4 external block.');
  if (Array.isArray(metadata.artifacts) && metadata.artifacts.length > 0) {
    lines.push(`Artifacts: ${metadata.artifacts.join(', ')}`);
  } else {
    lines.push('Artifacts: none.');
  }
  lines.push(`Authorization: ${metadata.authorization ?? 'LOCAL_ONLY'}.`);
  if (metadata.trailing !== undefined && metadata.trailing !== false) {
    const summary = isPlainObject(metadata.trailing) ? String(metadata.trailing.summary ?? '') : '';
    lines.push(`Trailing arguments are forwarded${summary.length > 0 ? `: ${summary}` : '.'}`);
  }
  return lines.join('\n');
}

function levenshtein(left, right) {
  const rows = left.length + 1;
  const columns = right.length + 1;
  let previous = Array.from({ length: columns }, (_, index) => index);
  for (let row = 1; row < rows; row += 1) {
    const current = [row];
    for (let column = 1; column < columns; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(previous[column] + 1, current[column - 1] + 1, previous[column - 1] + cost);
    }
    previous = current;
  }
  return previous[columns - 1];
}

function suggest(token, candidates) {
  let best = null;
  for (const candidate of candidates) {
    const distance = levenshtein(token, candidate);
    if (best === null || distance < best.distance) best = { candidate, distance };
  }
  if (best === null || best.distance > 3) return null;
  return best.candidate;
}

function refuseUnknownFlag(metadata, token) {
  const suggestion = suggest(token, [
    ...(metadata.flags ?? []).map((flag) => flag.name),
    '--help',
    ...(metadata.json === true ? ['--json'] : []),
  ]);
  throw new OperatorCliUsageError('CLI_UNKNOWN_ARGUMENT', `${token}${suggestion === null ? '' : ` (did you mean ${suggestion}?)`}`);
}

function coerceFlagValue(metadata, flag, token, value) {
  if (flag.shape === 'boolean') {
    if (value !== undefined) throw new OperatorCliUsageError('CLI_ARGUMENT_INVALID', `${token} is boolean and takes no value`);
    return true;
  }
  if (value === undefined) {
    throw new OperatorCliUsageError('CLI_ARGUMENT_INVALID', `${flag.name} expects a value (shape: ${flag.shape})`);
  }
  if (flag.shape === 'integer') {
    if (!/^-?\d+$/.test(value)) throw new OperatorCliUsageError('CLI_ARGUMENT_INVALID', `${flag.name} expects an integer, got "${value}"`);
    return Number.parseInt(value, 10);
  }
  if (flag.shape === 'enum') {
    if (!(flag.values ?? []).includes(value)) {
      throw new OperatorCliUsageError('CLI_ARGUMENT_INVALID', `${flag.name} expects one of ${(flag.values ?? []).join('|')}, got "${value}"`);
    }
    return value;
  }
  if (flag.shape === 'path') {
    if (value.length === 0 || value.includes('\0')) throw new OperatorCliUsageError('CLI_ARGUMENT_INVALID', `${flag.name} expects a non-empty path`);
    return value;
  }
  return value;
}

/**
 * Pure argument parsing against one declaration.
 * @param {object} metadata
 * @param {readonly string[]} argv
 * @returns {{ ok: true, command: string|null, flags: Record<string, unknown>, positionals: string[], trailing: string[], json: boolean, raw: readonly string[] }
 *   | { ok: false, code: string, detail: string }}
 */
export function parseOperatorCli(metadata, argv) {
  let declared;
  try {
    declared = requireMetadata(metadata);
  } catch (error) {
    return { ok: false, code: 'CLI_METADATA_INVALID', detail: error instanceof Error ? error.message : 'metadata invalid' };
  }
  const argvList = Array.isArray(argv) ? argv : [];
  if (argvList.includes('--help') || argvList.includes('-h')) {
    return { ok: true, command: null, flags: {}, positionals: [], trailing: [], json: false, raw: argvList, help: true };
  }
  const commands = declared.commands ?? [];
  const commandNames = new Set(commands.map((command) => command.name));
  const flagByName = new Map((declared.flags ?? []).map((flag) => [flag.name, flag]));
  if (declared.json === true) flagByName.set('--json', { name: '--json', shape: 'boolean', summary: 'emit exactly one JSON document on stdout' });
  const positionals = [];
  const trailing = [];
  const flags = {};
  const rawFlags = new Map();
  let command = null;
  let sawTerminator = false;
  let helpRequested = false;

  const acceptPositional = (token, index) => {
    if (command === null && commands.length > 0 && commandNames.has(token)) {
      command = token;
      return;
    }
    if (command === null && declared.defaultCommand !== undefined) command = declared.defaultCommand;
    if (commands.length > 0 && command === null && !sawTerminator) {
      if (declared.trailing !== undefined && declared.trailing !== false) {
        trailing.push(token);
        return;
      }
      // A first positional that is not a declared command is an unknown
      // subcommand only when no free positional slot exists for it.
      const positionalMax = declared.positionals?.max ?? 0;
      if (positionals.length < positionalMax) {
        positionals.push(token);
        return;
      }
      const suggestion = suggest(token, commands.map((candidate) => candidate.name));
      throw new OperatorCliUsageError('CLI_UNKNOWN_COMMAND', `${token}${suggestion === null ? '' : ` (did you mean ${suggestion}?)`}`);
    }
    if (declared.trailing !== undefined && declared.trailing !== false) {
      trailing.push(token);
      return;
    }
    const max = declared.positionals?.max ?? 0;
    if (positionals.length >= max) {
      throw new OperatorCliUsageError('CLI_UNEXPECTED_POSITIONAL', `${token} was not expected`);
    }
    positionals.push(token);
    void index;
  };

  for (let index = 0; index < argvList.length; index += 1) {
    const token = argvList[index];
    if (token === undefined) continue;
    if (sawTerminator) {
      acceptPositional(token, index);
      continue;
    }
    if (token === '--') {
      sawTerminator = true;
      continue;
    }
    if (token === 'help' && command === null && index === 0) {
      helpRequested = true;
      continue;
    }
    if (token.startsWith('--')) {
      const equals = token.indexOf('=');
      const name = equals === -1 ? token : token.slice(0, equals);
      const inline = equals === -1 ? undefined : token.slice(equals + 1);
      const flag = flagByName.get(name);
      if (flag === undefined) {
        if (declared.trailing !== undefined && declared.trailing !== false) {
          trailing.push(token);
          continue;
        }
        refuseUnknownFlag(declared, name);
      }
      const previous = rawFlags.get(name);
      let value;
      if (flag.shape === 'boolean') {
        value = coerceFlagValue(declared, flag, name, inline);
      } else {
        if (inline !== undefined) value = coerceFlagValue(declared, flag, name, inline);
        else {
          const next = argvList[index + 1];
          if (next === undefined) throw new OperatorCliUsageError('CLI_ARGUMENT_INVALID', `${name} expects a value (shape: ${flag.shape})`);
          if (next.startsWith('--')) throw new OperatorCliUsageError('CLI_ARGUMENT_INVALID', `${name} expects a value (shape: ${flag.shape}), got "${next}"`);
          index += 1;
          value = coerceFlagValue(declared, flag, name, next);
        }
      }
      if (flag.repeatable === true) {
        const values = flags[name];
        flags[name] = Array.isArray(values) ? [...values, value] : [value];
      } else if (previous !== undefined) {
        const previousValue = flags[name];
        if (JSON.stringify(previousValue) !== JSON.stringify(value)) {
          throw new OperatorCliUsageError('CLI_ARGUMENT_CONFLICT', `${name} was given twice with different values ("${String(previousValue)}" and "${String(value)}")`);
        }
      } else {
        flags[name] = value;
      }
      rawFlags.set(name, token);
      continue;
    }
    if (token.startsWith('-') && token !== '-') {
      if (declared.trailing !== undefined && declared.trailing !== false) {
        trailing.push(token);
        continue;
      }
      refuseUnknownFlag(declared, token);
    }
    acceptPositional(token, index);
  }

  if (helpRequested) return { ok: true, command: null, flags: {}, positionals: [], trailing: [], json: false, raw: argvList, help: true };
  if (command === null && commands.length > 0 && declared.defaultCommand === undefined && declared.commandRequired === true) {
    throw new OperatorCliUsageError('CLI_ARGUMENT_MISSING', `a subcommand is required (expected one of: ${commands.map((candidate) => candidate.name).join('|')})`);
  }
  const min = declared.positionals?.min ?? 0;
  if (positionals.length < min) {
    const names = declared.positionals?.names ?? [];
    throw new OperatorCliUsageError('CLI_ARGUMENT_MISSING', `${names[positionals.length] ?? 'an argument'} is required`);
  }
  const choices = declared.positionals?.choices;
  if (Array.isArray(choices)) {
    for (const positional of positionals) {
      if (!choices.includes(positional)) {
        const suggestion = suggest(positional, choices);
        throw new OperatorCliUsageError('CLI_ARGUMENT_INVALID', `${positional} is not an accepted argument${suggestion === null ? '' : ` (did you mean ${suggestion}?)`}`);
      }
    }
  }
  return { ok: true, command, flags, positionals, trailing, json: flags['--json'] === true, raw: argvList };
}

/**
 * Process-facing wrapper. Every path that exits does so before any effect,
 * because the bin calls this before its own work. Returns the parsed result on
 * a clean invocation.
 *
 * @param {object} metadata
 * @param {{
 *   argv?: readonly string[],
 *   entryUrl?: string,
 *   stdout?: { write(chunk: string): unknown },
 *   stderr?: { write(chunk: string): unknown },
 *   exit?: (code: number) => void,
 * }} [options]
 */
export function defineOperatorCli(metadata, options = {}) {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const exit = options.exit ?? ((code) => { process.exitCode = code; });
  let declared;
  try {
    declared = requireMetadata(metadata);
  } catch (error) {
    stderr.write(`[operator-cli] CLI_METADATA_INVALID: ${error instanceof Error ? error.message : 'metadata invalid'}\n`);
    exit(OPERATOR_CLI_EXIT.USAGE);
    return { ok: false, code: 'CLI_METADATA_INVALID', stop: true };
  }
  if (typeof options.entryUrl === 'string') {
    const actual = options.entryUrl.split('/').pop() ?? '';
    if (!actual.endsWith(declared.entry.split('/').pop() ?? '\u0000')) {
      stderr.write(`[${declared.name}] CLI_METADATA_INVALID: entry ${declared.entry} does not match ${actual}\n`);
      exit(OPERATOR_CLI_EXIT.USAGE);
      return { ok: false, code: 'CLI_METADATA_INVALID', stop: true };
    }
  }
  const argv = options.argv ?? process.argv.slice(2);
  if (argv.includes('--print-metadata')) {
    stdout.write(`${JSON.stringify(declared)}\n`);
    exit(OPERATOR_CLI_EXIT.SUCCESS);
    return { ok: true, command: null, flags: {}, positionals: [], trailing: [], json: false, raw: argv, metadataOnly: true, stop: true };
  }
  if (argv.includes('--help') || argv.includes('-h') || argv[0] === 'help') {
    stdout.write(`${renderOperatorHelp(declared)}\n`);
    exit(OPERATOR_CLI_EXIT.SUCCESS);
    return { ok: true, command: null, flags: {}, positionals: [], trailing: [], json: false, raw: argv, help: true, stop: true };
  }
  let parsed;
  try {
    parsed = parseOperatorCli(declared, argv);
  } catch (error) {
    const code = error instanceof OperatorCliUsageError ? error.code : 'CLI_ARGUMENT_INVALID';
    stderr.write(`[${declared.name}] ${code}: ${error instanceof Error ? error.message : 'invalid arguments'}\n`);
    stderr.write(`Usage: ${declarationUsage(declared)}\n`);
    exit(OPERATOR_CLI_EXIT.USAGE);
    return { ok: false, code, stop: true };
  }
  if (!parsed.ok) {
    stderr.write(`[${declared.name}] ${parsed.code}: ${parsed.detail}\n`);
    exit(OPERATOR_CLI_EXIT.USAGE);
    return { ...parsed, stop: true };
  }
  return { ...parsed, stop: false };
}

/**
 * The one JSON convention: exactly one document on stdout, nothing else; human
 * diagnostics belong on stderr. Stable top-level `status` is the caller's to
 * provide; this helper only guarantees one document.
 */
export function emitOperatorJson(document, stdout = process.stdout) {
  stdout.write(`${JSON.stringify(document)}\n`);
}

/** A fail-closed refusal (unauthorized, unsupported, policy): exit 3. */
export function refuseOperatorCli(name, code, detail) {
  process.stderr.write(`[${name}] ${code}: ${detail}\n`);
  process.exitCode = OPERATOR_CLI_EXIT.REFUSAL;
}

/** An environment or external block that is not a defect: exit 4. */
export function blockOperatorCli(name, code, detail) {
  process.stderr.write(`[${name}] ${code}: ${detail}\n`);
  process.exitCode = OPERATOR_CLI_EXIT.EXTERNAL_BLOCK;
}

/** True when the module was invoked as the process entry point. */
export function invokedDirectly(entryUrl, argvEntry = process.argv[1]) {
  if (typeof argvEntry !== 'string' || argvEntry.length === 0) return false;
  const invoked = argvEntry.split('/').pop() ?? '';
  const entry = entryUrl.split('/').pop() ?? '';
  return invoked === entry;
}

/**
 * Safety scan for 4.8: usage/error text may not carry a credential or an
 * absolute path outside the checkout. Pure so the sweep and the bin can both
 * assert the same rule.
 * @param {string} text
 * @returns {string[]} findings
 */
export function scanOperatorOutputForLeaks(text) {
  const findings = [];
  const pathMatch = ABSOLUTE_PATH_PATTERN.exec(text);
  if (pathMatch !== null) findings.push(`ABSOLUTE_PATH:${pathMatch[1]}`);
  if (/(?:ghp_|github_pat_|AKIA[0-9A-Z]{16}|Bearer\s+[A-Za-z0-9._-]{20,}|password\s*[:=]\s*\S+)/.test(text)) {
    findings.push('CREDENTIAL_SHAPED_TOKEN');
  }
  return findings;
}
