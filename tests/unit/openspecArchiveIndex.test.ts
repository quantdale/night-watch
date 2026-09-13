// Published-spec baseline integrity (nightwatch-published-spec-baseline-integrity-v1).
//
// The archive index is parsed as data with a strict row grammar, and every
// published spec Purpose must be a capability statement rather than the
// archive CLI's stub. Fixtures are disposable trees; the live repository is
// checked separately so the repair is proven, not assumed.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  inspectArchiveIndex,
  inspectPublishedSpecPurposes,
  parseArchiveIndex,
  publishedSpecNames,
} from '../../bin/lib/openspec-archive-index.mjs';

const REPO_ROOT = path.join(__dirname, '..', '..');
const tempRoots: string[] = [];

function fixtureRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-archive-'));
  tempRoots.push(root);
  return root;
}

test.afterAll(() => {
  for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
});

function writeIndex(root: string, rows: string[]): void {
  const dir = path.join(root, 'openspec', 'changes', 'archive');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'ARCHIVE-INDEX.md'),
    [
      '# OpenSpec archive index',
      '',
      'Schema: nightwatch.openspec-archive-index.v1',
      '',
      '| Change | Task status | Classification | Reason |',
      '|---|---|---|---|',
      ...rows,
      '',
    ].join('\n'),
    'utf8'
  );
}

function writeArchiveDir(root: string, id: string, date = '2026-01-01'): void {
  fs.mkdirSync(path.join(root, 'openspec', 'changes', 'archive', `${date}-${id}`), { recursive: true });
}

function writeSpec(root: string, capability: string, purpose: string): void {
  const dir = path.join(root, 'openspec', 'specs', capability);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'spec.md'),
    [
      `# ${capability} Specification`,
      '',
      '## Purpose',
      '',
      purpose,
      '',
      '## Requirements',
      '',
      '### Requirement: Example',
      '',
      'The system SHALL do the example thing.',
      '',
      '#### Scenario: works',
      '',
      '- GIVEN a fixture',
      '- WHEN run',
      '- THEN done',
      '',
    ].join('\n'),
    'utf8'
  );
}

const GOOD_PURPOSE = 'Nightwatch SHALL keep the example capability honest and machine-checked for its operator.';

test.describe('archive index row grammar', () => {
  test('the real trailing garbage row fails with its line number', () => {
    const root = fixtureRoot();
    writeArchiveDir(root, 'nw-real-v1');
    writeSpec(root, 'cap-one', GOOD_PURPOSE);
    writeIndex(root, [
      '| nw-real-v1 | COMPLETE | CAPABILITY_BEARING | archived with specs; published: cap-one |',
      '| 54 | undefined | CAPABILITY_BEARING | archived with specs; published:  |',
    ]);
    const result = inspectArchiveIndex(root);
    expect(result.errors.join('\n')).toContain('ARCHIVE_INDEX_MALFORMED_ROW');
    expect(result.errors.join('\n')).toContain('line 8');
  });

  test('a bare integer and an undefined Change cell both fail', () => {
    expect(parseArchiveIndex('| Change | S | C | R |\n| 7 | COMPLETE | CAPABILITY_BEARING | published: x |').errors.join('\n')).toContain(
      'ARCHIVE_INDEX_MALFORMED_ROW'
    );
    expect(parseArchiveIndex('| undefined | COMPLETE | CAPABILITY_BEARING | published: x |').errors.join('\n')).toContain(
      'ARCHIVE_INDEX_MALFORMED_ROW'
    );
  });

  test('a row without a directory fails', () => {
    const root = fixtureRoot();
    writeSpec(root, 'cap-one', GOOD_PURPOSE);
    writeIndex(root, ['| nw-missing-v1 | COMPLETE | CAPABILITY_BEARING | archived with specs; published: cap-one |']);
    expect(inspectArchiveIndex(root).errors.join('\n')).toContain('ARCHIVE_INDEX_ROW_WITHOUT_DIRECTORY');
  });

  test('a directory without a row fails', () => {
    const root = fixtureRoot();
    writeArchiveDir(root, 'nw-unlisted-v1');
    writeIndex(root, []);
    expect(inspectArchiveIndex(root).errors.join('\n')).toContain('ARCHIVE_INDEX_DIRECTORY_WITHOUT_ROW');
  });

  test('a published name that does not exist fails', () => {
    const root = fixtureRoot();
    writeArchiveDir(root, 'nw-real-v1');
    writeIndex(root, ['| nw-real-v1 | COMPLETE | CAPABILITY_BEARING | archived with specs; published: not-a-real-spec |']);
    expect(inspectArchiveIndex(root).errors.join('\n')).toContain('ARCHIVE_INDEX_PUBLISHED_SPEC_MISSING');
  });

  test('a BLOCKED_NOT_PUBLISHED row containing published: fails', () => {
    const root = fixtureRoot();
    writeArchiveDir(root, 'nw-blocked-v1');
    writeIndex(root, [
      '| nw-blocked-v1 | BLOCKED | BLOCKED_NOT_PUBLISHED | archived with --skip-specs; published: cap-one |',
    ]);
    expect(inspectArchiveIndex(root).errors.join('\n')).toContain('ARCHIVE_INDEX_BLOCKED_ROW_PUBLISHES');
  });

  test('a well-formed 1:1 index passes', () => {
    const root = fixtureRoot();
    writeArchiveDir(root, 'nw-real-v1');
    writeSpec(root, 'cap-one', GOOD_PURPOSE);
    writeIndex(root, ['| nw-real-v1 | COMPLETE | CAPABILITY_BEARING | archived with specs; published: cap-one |']);
    expect(inspectArchiveIndex(root).errors).toEqual([]);
  });

  test('published names split on commas and whitespace', () => {
    expect(publishedSpecNames('archived with specs; published: a, b  c')).toEqual(['a', 'b', 'c']);
    expect(publishedSpecNames('archived with --skip-specs')).toEqual([]);
  });
});

test.describe('published spec purposes', () => {
  test('the archive stub, an empty purpose, and an out-of-bounds purpose fail', () => {
    const root = fixtureRoot();
    writeSpec(root, 'cap-stub', 'TBD - created by archiving change nw-x. Update Purpose after archive.');
    writeSpec(root, 'cap-empty', '');
    writeSpec(root, 'cap-short', 'Too short.');
    writeSpec(root, 'cap-long', 'Long. '.repeat(200));
    const errors = inspectPublishedSpecPurposes(root).errors.join('\n');
    expect(errors).toContain('PUBLISHED_SPEC_PURPOSE_STUB: cap-stub');
    expect(errors).toContain('PUBLISHED_SPEC_PURPOSE_STUB: cap-empty');
    expect(errors).toContain('PUBLISHED_SPEC_PURPOSE_STUB: cap-short');
    expect(errors).toContain('PUBLISHED_SPEC_PURPOSE_STUB: cap-long');
  });

  test('a one-paragraph capability purpose passes', () => {
    const root = fixtureRoot();
    writeSpec(root, 'cap-good', GOOD_PURPOSE);
    expect(inspectPublishedSpecPurposes(root).errors).toEqual([]);
    expect(inspectPublishedSpecPurposes(root).capabilities).toBe(1);
  });
});

test.describe('the live published baseline', () => {
  test('the repaired index is a complete 1:1 table', () => {
    expect(inspectArchiveIndex(REPO_ROOT).errors).toEqual([]);
  });

  test('every published capability purpose is a real statement', () => {
    const result = inspectPublishedSpecPurposes(REPO_ROOT);
    expect(result.errors).toEqual([]);
    expect(result.capabilities).toBe(56);
  });
});
