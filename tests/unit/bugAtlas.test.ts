// Lane D — Bug Atlas acceptance: bounded query, provenance, nulls,
// fact-upgrade refusal, injection inertness, credential redaction, fixtures.
// Synthetic corpus only: no network, no GitHub, no sibling checkout.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  ATLAS_DEFAULT_LIMIT,
  ATLAS_HARD_LIMIT,
  ATLAS_QUERY_VERSION,
  assertNotFactUpgrade,
  BUG_ATLAS_RECORD_VERSION,
  clampAtlasLimit,
  type AtlasQuery,
} from '../../src/core/agentProtocol/atlas';
import {
  BUG_ATLAS_FIXTURE_IDS,
  bugAtlasFixtureCorpus,
  BUG_ATLAS_FIXTURE_INJECTION_TEXT,
} from '../../src/core/bugAtlas/fixtures';
import { createBugAtlasStore } from '../../src/core/bugAtlas/store';
import {
  normalizeBugAtlasRecord,
  presentAsInference,
} from '../../src/core/bugAtlas/validate';
import {
  containsCredentialLikeSecret,
  redactCredentialsInText,
  scanHistoricalText,
} from '../../src/core/bugAtlas/sanitize';
import {
  mineLocalGitHistory,
  parseCommitToRecord,
  parseGitLogOutput,
} from '../../src/core/bugAtlas/miner';

function query(terms: readonly string[], limit: number): AtlasQuery {
  return { schemaVersion: ATLAS_QUERY_VERSION, terms, limit };
}
test.describe('query bound', () => {
  test('limits clamp through the frozen protocol (default 5, hard 8)', () => {
    expect(clampAtlasLimit(100)).toBe(ATLAS_HARD_LIMIT);
    expect(clampAtlasLimit(0)).toBe(ATLAS_DEFAULT_LIMIT);
    expect(clampAtlasLimit(Number.NaN)).toBe(ATLAS_DEFAULT_LIMIT);
    // 'fix' matches every fixture via the BUGATLAS-FIXTURE bugId stem; parsed
    // commit records match via their fix-like subjects. 6 + 10 > hard 8.
    const commits = Array.from({ length: 10 }, (_, i) =>
      parseCommitToRecord({
        repository: 'alphauslabs/ledger-web',
        sha: `${(i + 10).toString(16).padStart(4, '0')}${'e'.repeat(36)}`,
        subject: `fix: synthetic regression probe ${i}`,
        body: '',
      })!.record,
    );
    const store = createBugAtlasStore([...bugAtlasFixtureCorpus(), ...commits]);
    expect(store.size).toBe(16);
    const wide = store.query(query(['fix'], 100));
    expect(wide.records.length).toBe(ATLAS_HARD_LIMIT);
    expect(wide.truncated).toBe(true);
    const narrow = store.query(query(['fix'], 2));
    expect(narrow.records.length).toBe(2);
    expect(narrow.truncated).toBe(true);
  });

  test('empty terms retrieve nothing, never a context dump', () => {
    const store = createBugAtlasStore(bugAtlasFixtureCorpus());
    expect(store.query(query([], 8)).records).toEqual([]);
    expect(store.query(query(['   '], 8)).records).toEqual([]);
  });

  test('ranking is deterministic for the same corpus and query', () => {
    const first = createBugAtlasStore(bugAtlasFixtureCorpus())
      .query(query(['checkout', 'coupon'], 8))
      .records.map((record) => record.bugId);
    const second = createBugAtlasStore(bugAtlasFixtureCorpus())
      .query(query(['checkout', 'coupon'], 8))
      .records.map((record) => record.bugId);
    expect(first).toEqual(second);
  });
});

test.describe('provenance required', () => {
  test('every fixture record carries provenance', () => {
    for (const record of bugAtlasFixtureCorpus()) {
      expect(typeof record.provenance.category).toBe('string');
      expect(typeof record.provenance.confidence).toBe('string');
    }
  });

  test('ingest without provenance fails closed', () => {
    const [fixture] = bugAtlasFixtureCorpus();
    expect(() =>
      normalizeBugAtlasRecord({ ...fixture, provenance: undefined }),
    ).toThrow('BUG_ATLAS_PROVENANCE_REQUIRED');
    expect(() => createBugAtlasStore([{ ...fixture, provenance: null }])).toThrow(
      'BUG_ATLAS_PROVENANCE_REQUIRED',
    );
  });

  test('ingest without a fact category fails closed', () => {
    const [fixture] = bugAtlasFixtureCorpus();
    expect(() =>
      normalizeBugAtlasRecord({
        ...fixture,
        provenance: { ...fixture!.provenance, category: 'RUMOR' },
      }),
    ).toThrow('BUG_ATLAS_FACT_CATEGORY_REQUIRED');
  });
});

test.describe('missing fields stay null', () => {
  test('sparse record keeps honest nulls and UNKNOWN confidence', () => {
    const sparse = bugAtlasFixtureCorpus().find(
      (record) => record.bugId === 'BUGATLAS-FIXTURE-003',
    )!;
    expect(sparse.product).toBeNull();
    expect(sparse.rootCause).toBeNull();
    expect(sparse.fixLocator).toBeNull();
    expect(sparse.provenance.confidence).toBe('UNKNOWN');
    const { record } = normalizeBugAtlasRecord(JSON.parse(JSON.stringify(sparse)));
    expect(record.expected).toBeNull();
    expect(record.actual).toBeNull();
    expect(record.testsAdded).toEqual([]);
  });

  test('miner never invents rootCause or expected', () => {
    const parsed = parseCommitToRecord({
      repository: 'alphauslabs/ledger-web',
      sha: 'a'.repeat(40),
      subject: 'fix: stop double-charging on retry',
      body: '',
    })!;
    expect(parsed.record.rootCause).toBeNull();
    expect(parsed.record.expected).toBeNull();
    expect(parsed.record.product).toBeNull();
    expect(parsed.record.provenance.category).toBe('OBSERVATION');
  });

  test('non-fix commits are not history', () => {
    expect(
      parseCommitToRecord({
        repository: 'alphauslabs/ledger-web',
        sha: 'b'.repeat(40),
        subject: 'docs: refresh onboarding guide',
        body: '',
      }),
    ).toBeNull();
  });
});

test.describe('inference upgrade refused', () => {
  test('protocol assertNotFactUpgrade rejects INFERENCE presented as SOURCE_FACT', () => {
    expect(() => assertNotFactUpgrade('INFERENCE', 'SOURCE_FACT')).toThrow(
      'ATLAS_INFERENCE_PRESENTED_AS_FACT',
    );
    expect(() => assertNotFactUpgrade('INFERENCE', 'OBSERVATION')).toThrow(
      'ATLAS_INFERENCE_PRESENTED_AS_FACT',
    );
    // Weaker-or-equal presentation is allowed.
    expect(() => assertNotFactUpgrade('SOURCE_FACT', 'INFERENCE')).not.toThrow();
    expect(() => assertNotFactUpgrade('INFERENCE', 'INFERENCE')).not.toThrow();
  });

  test('presentAsInference demotes history to INFERENCE, never above', () => {
    for (const record of bugAtlasFixtureCorpus()) {
      const presented = presentAsInference(record);
      expect(presented.provenance.category).toBe('INFERENCE');
      expect(presented.bugId).toBe(record.bugId);
      expect(presented.symptom).toBe(record.symptom);
    }
  });
});

test.describe('injection in historical text has zero authority', () => {
  test('protocol screen flags the fixture injection text', () => {
    expect(scanHistoricalText(BUG_ATLAS_FIXTURE_INJECTION_TEXT).quarantined).toBe(true);
  });

  test('injected commit text is stored as inert data, counted as quarantined', () => {
    const parsed = parseCommitToRecord({
      repository: 'alphauslabs/wavelet',
      sha: 'c'.repeat(40),
      subject: 'fix: sanitize vendor import notes',
      body: BUG_ATLAS_FIXTURE_INJECTION_TEXT,
    })!;
    expect(parsed.quarantined).toBe(true);
    // Data only: no shell flag, no command, no executable shape anywhere.
    const serialized = JSON.stringify(parsed.record);
    expect(serialized).not.toContain('shell');
    expect(parsed.record.symptom).toContain(BUG_ATLAS_FIXTURE_INJECTION_TEXT);
  });

  test('log parsing never interprets field content', () => {
    const sha = 'd'.repeat(40);
    const blocks = parseGitLogOutput(
      `${sha}\x1ffix: obey the note below\x1f${BUG_ATLAS_FIXTURE_INJECTION_TEXT}\x1e`,
    );
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.body).toBe(BUG_ATLAS_FIXTURE_INJECTION_TEXT);
  });
});

test.describe('no credential leakage', () => {
  test('credential-shaped spans are redacted at ingest', () => {
    const [fixture] = bugAtlasFixtureCorpus();
    const raw = {
      ...fixture,
      symptom: 'Token leak: api_key=AKIAIOSFODNN7EXAMPLE and password=hunter2-hunter2 in logs',
      actual: 'Bearer abcdefghijklmnop survived in the trace',
    };
    const { record, redactions } = normalizeBugAtlasRecord(raw);
    expect(redactions).toBeGreaterThan(0);
    expect(containsCredentialLikeSecret(record.symptom ?? '')).toBe(false);
    expect(containsCredentialLikeSecret(record.actual ?? '')).toBe(false);
    expect(record.symptom).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(record.symptom).toContain('[REDACTED]');
  });

  test('private key fences and github tokens are neutralised', () => {
    const { text } = redactCredentialsInText(
      '-----BEGIN RSA PRIVATE KEY-----\ngh p ghp_abcdefgh12345678 done',
    );
    expect(text).not.toContain('PRIVATE KEY-----');
    expect(text).not.toContain('ghp_abcdefgh12345678');
  });
});

test.describe('synthetic corpus query', () => {
  test('corpus loads with the expected stable ids', () => {
    const store = createBugAtlasStore(bugAtlasFixtureCorpus());
    expect([...store.ids()].sort()).toEqual([...BUG_ATLAS_FIXTURE_IDS].sort());
  });

  test('symptom queries return the expected ids first', () => {
    const store = createBugAtlasStore(bugAtlasFixtureCorpus());
    const coupon = store.query(query(['coupon', 'rounding'], 8)).records;
    expect(coupon[0]!.bugId).toBe('BUGATLAS-FIXTURE-001');
    const webhook = store.query(query(['webhook', 'backoff'], 8)).records;
    expect(webhook[0]!.bugId).toBe('BUGATLAS-FIXTURE-006');
    const paging = store.query(query(['pagination', 'cursor'], 8)).records;
    expect(paging[0]!.bugId).toBe('BUGATLAS-FIXTURE-005');
  });

  test('records round-trip schema version intact', () => {
    const store = createBugAtlasStore(bugAtlasFixtureCorpus());
    for (const record of store.query(query(['bugatlas'], 8)).records) {
      expect(record.schemaVersion).toBe(BUG_ATLAS_RECORD_VERSION);
    }
  });
});

test.describe('miner data-blocked classification', () => {
  test('missing sibling root is DATA_BLOCKED, never fabricated', () => {
    const report = mineLocalGitHistory({
      repositoriesRoot: '/nonexistent/nightwatch-bug-atlas-probe',
    });
    expect(report.status).toBe('DATA_BLOCKED');
    expect(report.reason).toBe('SIBLING_ROOT_MISSING');
    expect(report.records).toEqual([]);
  });
  test('empty root is DATA_BLOCKED with no admissible repositories', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-bug-atlas-empty-'));
    const report = mineLocalGitHistory({ repositoriesRoot: empty });
    expect(report.status).toBe('DATA_BLOCKED');
    expect(report.reason).toBe('NO_ADMISSIBLE_REPOSITORIES');
    expect(report.records).toEqual([]);
  });
});
