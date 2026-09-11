#!/usr/bin/env node

// The command surface is discoverable from one place (programme 4.9).
//
// The listing is DERIVED from each entry point's own declared metadata: a bin
// that declares its contract via `defineOperatorCli` appears automatically, and
// a removed one disappears. Nothing here is hand-maintained per command. A bin
// that does not declare metadata is still listed, under `undeclared`, so its
// absence from the contract is visible rather than hidden.
//
// Extraction is PURE: the declaration is a data literal, read from the tracked
// source without executing the bin. That matters because `--help` on the
// dispatcher renders this listing, and a help request may not spawn a
// subprocess. The sweep separately proves the static declaration and the
// runtime `--print-metadata` answer are the same contract.

import fs from 'node:fs';
import path from 'node:path';
import { OPERATOR_CLI_GROUPS, validateOperatorMetadata } from './operator-cli.mjs';

/** Relative paths of every top-level `bin/*.mjs`, sorted. */
export function discoverOperatorBins(root) {
  const binDirectory = path.join(root, 'bin');
  const names = fs.readdirSync(binDirectory).filter((name) => name.endsWith('.mjs'));
  return names.sort((left, right) => left.localeCompare(right)).map((name) => `bin/${name}`);
}

/**
 * Static presence of a declaration. This is the structural fact hardening
 * checks can read without executing 62 processes; the behavioural facts (help,
 * refusal, metadata correctness) belong to the sweep.
 */
export function sourceDeclaresOperatorMetadata(source) {
  return /defineOperatorCli\s*\(/.test(source);
}

function isIdentifierStart(character) {
  return /[A-Za-z_$]/.test(character);
}

function isIdentifierPart(character) {
  return /[A-Za-z0-9_$]/.test(character);
}

/**
 * A strict reader for the metadata object literal. It accepts exactly the data
 * vocabulary a declaration may use — strings, numbers, booleans, null, arrays
 * and objects — and rejects identifiers that are not literal keywords. A
 * declaration that cannot be read as data is not a declaration.
 *
 * @param {string} text
 * @param {number} start
 * @returns {{ value: unknown, next: number } | null}
 */
function readLiteral(text, start) {
  let index = start;
  const skip = () => {
    while (index < text.length) {
      const character = text[index];
      if (character === ' ' || character === '\t' || character === '\n' || character === '\r') { index += 1; continue; }
      if (character === '/' && text[index + 1] === '/') {
        while (index < text.length && text[index] !== '\n') index += 1;
        continue;
      }
      if (character === '/' && text[index + 1] === '*') {
        index += 2;
        while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) index += 1;
        index += 2;
        continue;
      }
      break;
    }
  };
  const readString = (quote) => {
    index += 1;
    let value = '';
    while (index < text.length) {
      const character = text[index];
      if (character === '\\') {
        const escaped = text[index + 1];
        if (escaped === 'n') value += '\n';
        else if (escaped === 't') value += '\t';
        else if (escaped === 'r') value += '\r';
        else if (escaped === 'u') {
          const hex = text.slice(index + 2, index + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) return null;
          value += String.fromCharCode(Number.parseInt(hex, 16));
          index += 4;
        } else if (escaped === undefined) return null;
        else value += escaped;
        index += 2;
        continue;
      }
      if (character === quote) { index += 1; return { value, next: index }; }
      if (character === '\n') return null;
      value += character;
      index += 1;
    }
    return null;
  };
  const readIdentifier = () => {
    let value = '';
    while (index < text.length && isIdentifierPart(text[index] ?? '')) { value += text[index]; index += 1; }
    return value;
  };

  skip();
  const character = text[index];
  if (character === undefined) return null;
  if (character === '{') {
    index += 1;
    const object = {};
    skip();
    if (text[index] === '}') { index += 1; return { value: object, next: index }; }
    for (;;) {
      skip();
      let key;
      const keyCharacter = text[index];
      if (keyCharacter === '"' || keyCharacter === "'") {
        const parsed = readString(keyCharacter);
        if (parsed === null) return null;
        key = parsed.value;
      } else if (keyCharacter !== undefined && isIdentifierStart(keyCharacter)) {
        key = readIdentifier();
      } else return null;
      skip();
      if (text[index] !== ':') return null;
      index += 1;
      const parsed = readLiteral(text, index);
      if (parsed === null) return null;
      object[key] = parsed.value;
      index = parsed.next;
      skip();
      if (text[index] === ',') {
        index += 1;
        skip();
        if (text[index] === '}') { index += 1; return { value: object, next: index }; }
        continue;
      }
      if (text[index] === '}') { index += 1; return { value: object, next: index }; }
      return null;
    }
  }
  if (character === '[') {
    index += 1;
    const array = [];
    skip();
    if (text[index] === ']') { index += 1; return { value: array, next: index }; }
    for (;;) {
      const parsed = readLiteral(text, index);
      if (parsed === null) return null;
      array.push(parsed.value);
      index = parsed.next;
      skip();
      if (text[index] === ',') {
        index += 1;
        skip();
        if (text[index] === ']') { index += 1; return { value: array, next: index }; }
        continue;
      }
      if (text[index] === ']') { index += 1; return { value: array, next: index }; }
      return null;
    }
  }
  if (character === '"' || character === "'") {
    const parsed = readString(character);
    return parsed === null ? null : { value: parsed.value, next: index };
  }
  if (character === '-' || /[0-9]/.test(character)) {
    const match = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(index));
    if (match === null) return null;
    index += match[0].length;
    return { value: Number(match[0]), next: index };
  }
  if (isIdentifierStart(character)) {
    const identifier = readIdentifier();
    if (identifier === 'true') return { value: true, next: index };
    if (identifier === 'false') return { value: false, next: index };
    if (identifier === 'null') return { value: null, next: index };
    // The declaration refers to the imported schema constant, whose value is
    // fixed by the module. This is the one identifier a data declaration may
    // carry; every other identifier means the declaration is not pure data.
    if (identifier === 'OPERATOR_CLI_SCHEMA') return { value: 'nightwatch.operator-cli.v1', next: index };
    return null;
  }
  return null;
}

/**
 * Read the first `defineOperatorCli({...})` declaration from source as data.
 * The first argument may be an inline literal or the name of a `const`
 * declared in the same file, which is the readable form. Returns null when
 * there is no declaration or it is not a data literal.
 * @param {string} source
 * @returns {unknown}
 */
export function extractDeclaredOperatorMetadata(source) {
  const match = /defineOperatorCli\s*\(/.exec(source);
  if (match === null) return null;
  let index = match.index + match[0].length;
  const skipWhitespace = () => {
    while (index < source.length && /\s/.test(source[index] ?? '')) index += 1;
  };
  skipWhitespace();
  if (isIdentifierStart(source[index] ?? '')) {
    let name = '';
    while (index < source.length && isIdentifierPart(source[index] ?? '')) { name += source[index]; index += 1; }
    const declaration = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*`).exec(source);
    if (declaration === null) return null;
    index = declaration.index + declaration[0].length;
    skipWhitespace();
  }
  if (source[index] !== '{') return null;
  const parsed = readLiteral(source, index);
  return parsed === null ? null : parsed.value;
}

/**
 * Collect declared metadata statically. When `run` is supplied each declared
 * bin is also asked for its runtime `--print-metadata` answer, and a mismatch
 * between the static declaration and the runtime answer is a contract failure:
 * the help text, the listing and the parser must describe one contract.
 *
 * @param {{
 *   root: string,
 *   bins: readonly string[],
 *   run?: (absolute: string) => { status: number|null, stdout?: string|null, stderr?: string|null, error?: Error },
 * }} input
 */
export function collectOperatorCommandMetadata(input) {
  const run = input.run;
  const entries = [];
  for (const bin of input.bins) {
    const source = fs.readFileSync(path.join(input.root, bin), 'utf8');
    if (!sourceDeclaresOperatorMetadata(source)) {
      entries.push({ bin, declared: false, metadata: null, error: 'OPERATOR_CLI_METADATA_NOT_DECLARED' });
      continue;
    }
    const metadata = extractDeclaredOperatorMetadata(source);
    if (metadata === null) {
      entries.push({ bin, declared: true, metadata: null, error: 'OPERATOR_CLI_METADATA_NOT_DATA' });
      continue;
    }
    const errors = validateOperatorMetadata(metadata);
    if (errors.length > 0) {
      entries.push({ bin, declared: true, metadata: null, error: errors.join('; ') });
      continue;
    }
    const declared = /** @type {{ entry: string }} */ (metadata);
    if (declared.entry !== bin) {
      entries.push({ bin, declared: true, metadata: null, error: `entry ${declared.entry} does not match ${bin}` });
      continue;
    }
    if (run !== undefined) {
      const result = run(path.join(input.root, bin));
      if (result.error !== undefined || result.status !== 0) {
        entries.push({ bin, declared: true, metadata, error: 'OPERATOR_CLI_RUNTIME_METADATA_UNREADABLE' });
        continue;
      }
      let runtime;
      try {
        runtime = JSON.parse(String(result.stdout ?? ''));
      } catch {
        entries.push({ bin, declared: true, metadata, error: 'OPERATOR_CLI_RUNTIME_METADATA_NOT_JSON' });
        continue;
      }
      if (JSON.stringify(runtime) !== JSON.stringify(metadata)) {
        entries.push({ bin, declared: true, metadata, error: 'OPERATOR_CLI_RUNTIME_METADATA_MISMATCH' });
        continue;
      }
    }
    entries.push({ bin, declared: true, metadata, error: null });
  }
  return entries;
}

const GROUP_TITLES = Object.freeze({
  'run-scenario': 'Run a scenario',
  'inspect-intelligence': 'Inspect intelligence',
  validate: 'Validate',
  'manage-sessions': 'Manage sessions',
  'manage-evidence': 'Manage evidence',
  'control-center': 'Operate the Control Center',
  'owner-gated': 'Owner-gated lanes',
  'internal-tooling': 'Internal tooling',
});

/**
 * Render the grouped listing. Every declared entry appears under its declared
 * group; undeclared bins appear last so the gap is visible.
 */
export function renderOperatorCommandListing(entries) {
  const lines = [];
  lines.push('Nightwatch operator commands');
  lines.push('============================');
  lines.push('');
  for (const group of OPERATOR_CLI_GROUPS) {
    const members = entries.filter((entry) => entry.metadata !== null && entry.metadata.group === group);
    if (members.length === 0) continue;
    lines.push(`${GROUP_TITLES[group] ?? group}:`);
    for (const member of members) {
      const metadata = member.metadata;
      const commands = Array.isArray(metadata.commands) && metadata.commands.length > 0
        ? ` [${metadata.commands.map((command) => command.name).join('|')}]`
        : '';
      lines.push(`  ${metadata.name.padEnd(28)} ${metadata.purpose}`);
      lines.push(`  ${''.padEnd(28)} ${metadata.entry}${commands} (auth: ${metadata.authorization ?? 'LOCAL_ONLY'})`);
    }
    lines.push('');
  }
  const undeclared = entries.filter((entry) => entry.metadata === null);
  if (undeclared.length > 0) {
    lines.push(`Undeclared metadata (${undeclared.length}):`);
    for (const member of undeclared) lines.push(`  ${member.bin} — ${member.error}`);
    lines.push('');
  }
  lines.push('Run `node <entry> --help` for the full contract of one command.');
  return lines.join('\n');
}

/**
 * The complete listing for a repository root. Pure by default; `run` is
 * injected only by the sweep that verifies runtime/static agreement.
 */
export function operatorCommandListing(root, options = {}) {
  const bins = options.bins ?? discoverOperatorBins(root);
  const entries = collectOperatorCommandMetadata({ root, bins, run: options.run });
  return { bins, entries, text: renderOperatorCommandListing(entries) };
}
