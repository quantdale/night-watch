// F-11 / group 9 — the shared lexical and calendar primitives of the
// dependency-currency assessment.
//
// Both halves of the assessment — the root `package-lock.json` assessment in
// `./index` and the UI lockfile assessment in `./uiLockfile` — need the same
// two things: a strict `YYYY-MM-DD` calendar so a review date is never compared
// as a loose string, and a comment-blanking reader so a name that appears only
// inside a comment can never satisfy (or break) a call-site or import test.
//
// This module is pure: no filesystem, process, network, Git or clock authority.
// Keeping these primitives in one place is what stops the two halves of the
// assessment from drifting apart — a second, subtly different date parser is
// exactly the kind of duplication that makes a staleness check pass when it
// should fail.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A single-quoted, double-quoted or untagged template string literal. */
export const LITERAL_STRING_RE = /^(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`[^`$]*`)$/;

/** Days since the Unix epoch for a strict `YYYY-MM-DD` date, or null. */
export function daysSinceEpoch(date: string): number | null {
  const match = DATE_RE.exec(date);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const milliseconds = Date.UTC(year, month - 1, day);
  const check = new Date(milliseconds);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return Math.floor(milliseconds / 86_400_000);
}

/** `date + intervalDays` rendered as `YYYY-MM-DD`, or null on a bad date. */
export function computeDueDate(date: string, intervalDays: number): string | null {
  const base = daysSinceEpoch(date);
  if (base === null || !Number.isInteger(intervalDays) || intervalDays <= 0) return null;
  const result = new Date((base + intervalDays) * 86_400_000);
  const year = result.getUTCFullYear();
  const month = String(result.getUTCMonth() + 1).padStart(2, '0');
  const day = String(result.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 1-based line number of `index` inside `text`. */
export function lineOf(text: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index && cursor < text.length; cursor += 1) {
    if (text[cursor] === '\n') line += 1;
  }
  return line;
}

/**
 * Blank out comments while preserving line structure. String literals are
 * kept intact, because the specifier under inspection is itself a string
 * literal; only comments can carry a look-alike that must not count.
 */
export function stripComments(text: string): string {
  let output = '';
  let index = 0;
  let quote: string | null = null;
  while (index < text.length) {
    const character = text[index] ?? '';
    if (quote !== null) {
      output += character;
      if (character === '\\') {
        output += text[index + 1] ?? '';
        index += 2;
        continue;
      }
      if (character === quote) quote = null;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      output += character;
      index += 1;
      continue;
    }
    if (character === '/' && text[index + 1] === '/') {
      const end = text.indexOf('\n', index);
      index = end === -1 ? text.length : end;
      continue;
    }
    if (character === '/' && text[index + 1] === '*') {
      const end = text.indexOf('*/', index + 2);
      const stop = end === -1 ? text.length : end + 2;
      output += text.slice(index, stop).replace(/[^\n]/g, ' ');
      index = stop;
      continue;
    }
    output += character;
    index += 1;
  }
  return output;
}
