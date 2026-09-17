// ---------------------------------------------------------------------------
// NW-HIST-005 (Wave 1, Phase 1a) — CACHE_KEY_CONTRACT tests.
//
// Every case invokes the production modules: the pure extractors/matcher, the
// strict declaration validator, the orchestrator with injected read-only
// access, and the real driver against tiny local fixture repositories under
// .tmp-nightwatch/ (removed afterwards; product repositories are never used as
// fixtures). Phase 1a emits reports only — the suite asserts the absence of any
// finding-shaped output.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  CACHE_KEY_REASON_CODES,
  evaluateKeyCoverage,
  extractConsumerKeyShapes,
  extractProducerPatterns,
  patternCoversShape,
  shapeDigest,
  type CanonicalKeyShape,
  type CacheKeyEnvMap,
} from '../../src/core/source/cacheKeyShapes';
import { CACHE_KEY_CONTRACTS_SCHEMA, validateCacheKeyContractConfig, type CacheKeyContractDeclaration } from '../../src/core/source/cacheKeyContractValidation';
import { runCacheKeyContract, CACHE_KEY_REPORT_SCHEMA } from '../../src/core/source/cacheKeyContract';
import { resolveScratchPath } from '../../src/core/workspace/ephemeralLayout';

const ROOT = path.join(__dirname, '..', '..');
const TMP_ROOT = path.join(ROOT, resolveScratchPath('test', 'cache-key-contract'));
const REPOS_ROOT = path.join(TMP_ROOT, 'repos');

const ENV_MAP: CacheKeyEnvMap = {
  producerEnvToken: 'runEnv',
  pairs: [
    { producer: 'prod', consumer: 'production' },
    { producer: 'production', consumer: 'production' },
  ],
};

const CONSUMER_PHP = `<?php
class Cache {
    public function getUserHash(string $key): array {
        $set_key = implode(':', [getenv(API_NEV), 'ripple-api', 'user', $this->cahceid]);
        return [$set_key];
    }
}
`;

const PRODUCER_GO_COVERED = `package mgtacct

import "fmt"

func clearRippleUserCache(mspID string) {
	pattern := fmt.Sprintf("%s:ripple-api:user:%s*", runEnv, mspID)
	_ = pattern
}
`;

const PRODUCER_GO_PIPE = `package mgtacct

import "fmt"

func clearRippleUserCache(mspID string) {
	pattern := fmt.Sprintf("production|user|%s*", mspID)
	_ = pattern
}
`;

function consumerExtraction(source: string) {
  return extractConsumerKeyShapes(source, { functions: ['getUserHash'], namespace: 'ripple-api' });
}

function producerExtraction(source: string, delimiter = ':') {
  return extractProducerPatterns(source, { functions: ['clearRippleUserCache'], namespace: 'ripple-api', delimiter, envToken: 'runEnv' });
}

// ---------------------------------------------------------------------------
// Matcher truth table (real matcher, canonical fixture shapes as inputs).
// ---------------------------------------------------------------------------

const shape = (delimiter: string, atoms: CanonicalKeyShape['atoms']): CanonicalKeyShape => ({ delimiter, atoms });
const ENV = { kind: 'ENV_PREFIX' } as const;
const VAR = { kind: 'VARIABLE' } as const;
const LIT = (text: string) => ({ kind: 'LITERAL', text }) as const;
const NS = (text: string) => ({ kind: 'NAMESPACE', text }) as const;
const WILD = (wildcard: 'PREFIX' | 'SUFFIX' | 'INFIX' | 'FULL') => ({ kind: 'WILDCARD', wildcard }) as const;

test.describe('C4 matcher truth table', () => {
  const cases: { name: string; consumer: CanonicalKeyShape; producer: CanonicalKeyShape; covered: boolean; reason?: string }[] = [
    { name: 'identical concrete shapes cover exactly', consumer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR]), producer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR]), covered: true },
    { name: 'suffix wildcard over-covers a trailing variable', consumer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR]), producer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR, WILD('SUFFIX')]), covered: true },
    { name: 'full wildcard over-covers everything after it', consumer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR]), producer: shape(':', [ENV, WILD('FULL')]), covered: true },
    { name: 'prefix wildcard covers exactly one segment', consumer: shape(':', [ENV, LIT('ns'), LIT('user'), VAR]), producer: shape(':', [WILD('PREFIX'), LIT('ns'), LIT('user'), VAR]), covered: true },
    { name: 'delimiter difference is a first-class mismatch', consumer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR]), producer: shape('|', [ENV, NS('ripple-api'), LIT('user'), VAR]), covered: false, reason: 'DELIMITER_MISMATCH' },
    { name: 'literal segment mismatch', consumer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR]), producer: shape(':', [ENV, NS('ripple-api'), LIT('account'), VAR]), covered: false, reason: 'SEGMENT_MISMATCH' },
    { name: 'unmapped env literal', consumer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR]), producer: shape(':', [LIT('staging'), NS('ripple-api'), LIT('user'), VAR]), covered: false, reason: 'ENV_PREFIX_MISMATCH' },
    { name: 'mapped env literal is covered', consumer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR]), producer: shape(':', [LIT('production'), NS('ripple-api'), LIT('user'), VAR]), covered: true },
    { name: 'exact pattern on a variable shape', consumer: shape(':', [ENV, NS('ripple-api'), VAR, VAR]), producer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR]), covered: false, reason: 'EXACT_PATTERN_ON_VARIABLE_SHAPE' },
    { name: 'opaque producer segment on a literal shape', consumer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR]), producer: shape(':', [ENV, VAR, LIT('user'), VAR]), covered: false, reason: 'OPAQUE_SEGMENT_ON_LITERAL_SHAPE' },
    { name: 'producer exhausted with a trailing consumer variable', consumer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR, VAR]), producer: shape(':', [ENV, NS('ripple-api'), LIT('user'), VAR]), covered: false, reason: 'MISSING_WILDCARD' },
    { name: 'producer demands more structure than the shape carries', consumer: shape(':', [ENV, NS('ripple-api'), LIT('user')]), producer: shape(':', [ENV, NS('ripple-api'), LIT('user'), LIT('extra')]), covered: false, reason: 'SEGMENT_MISMATCH' },
  ];
  for (const entry of cases) {
    test(entry.name, () => {
      const result = patternCoversShape(entry.consumer, entry.producer, ENV_MAP);
      if (entry.covered) {
        expect(result).toBe(true);
      } else {
        expect(result === true ? null : result.reason).toBe(entry.reason);
      }
    });
  }

  test('the reason vocabulary is closed and exercised by this table', () => {
    const exercised = new Set(cases.filter((entry) => !entry.covered).map((entry) => entry.reason));
    expect([...CACHE_KEY_REASON_CODES].sort()).toEqual([...exercised].sort());
  });
});

// ---------------------------------------------------------------------------
// Extraction fixtures (real PHP/Go extractors).
// ---------------------------------------------------------------------------

test.describe('C4 bounded extraction', () => {
  test('positive: delimiter + namespace divergence extracts both sides and reports NOT_COVERED', () => {
    const consumer = consumerExtraction(CONSUMER_PHP);
    expect(consumer.ambiguous).toEqual([]);
    expect(consumer.shapes).toHaveLength(1);
    const producer = producerExtraction(PRODUCER_GO_PIPE, ':');
    expect(producer.ambiguous).toEqual([]);
    expect(producer.patterns).toHaveLength(1);
    const rows = evaluateKeyCoverage({ shapes: consumer.shapes, patterns: producer.patterns, envMap: ENV_MAP, exclusions: [] });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.verdict).toBe('NOT_COVERED');
    expect(rows[0]?.reasonCode).toBe('DELIMITER_MISMATCH');
    expect(rows[0]?.consumerShapeDigest).toMatch(/^cks:sha256:[0-9a-f]{24}$/);
    expect(rows[0]?.producerPatternDigest).toBeNull();
  });

  test('negative: the declared env mapping plus the canonical pattern covers the shape', () => {
    const consumer = consumerExtraction(CONSUMER_PHP);
    const producer = producerExtraction(PRODUCER_GO_COVERED, ':');
    expect(producer.patterns[0]?.envPositions).toEqual([1]);
    const rows = evaluateKeyCoverage({ shapes: consumer.shapes, patterns: producer.patterns, envMap: ENV_MAP, exclusions: [] });
    expect(rows[0]?.verdict).toBe('COVERED');
    expect(rows[0]?.producerPatternDigest).toMatch(/^ckp:sha256:[0-9a-f]{24}$/);
    expect(rows[0]?.reasonCode).toBeNull();
  });

  test('near miss: the root key is covered and the sub-scope key is not', () => {
    const nearMissPhp = `<?php
class Cache {
    public function getUserHash(string $key): array {
        $root = implode(':', [getenv(API_NEV), 'ripple-api', 'user', $this->cahceid]);
        $sub = implode(':', [getenv(API_NEV), 'ripple-api', 'user', $this->cahceid, $key]);
        return [$root, $sub];
    }
}
`;
    const consumer = consumerExtraction(nearMissPhp);
    expect(consumer.ambiguous).toEqual([]);
    expect(consumer.shapes).toHaveLength(2);
    const producer = producerExtraction(`package mgtacct

import "fmt"

func clearRippleUserCache(mspID string) {
	pattern := fmt.Sprintf("%s:ripple-api:user:%s", runEnv, mspID)
	_ = pattern
}
`, ':');
    const rows = evaluateKeyCoverage({ shapes: consumer.shapes, patterns: producer.patterns, envMap: ENV_MAP, exclusions: [] });
    const byVerdict = rows.map((row) => `${row.verdict}${row.reasonCode === null ? '' : `:${row.reasonCode}`}`).sort();
    expect(byVerdict).toEqual(['COVERED', 'NOT_COVERED:MISSING_WILDCARD']);
  });

  test('exclusion: a declared shape digest is excluded by declaration, matched by digest only', () => {
    const consumer = consumerExtraction(CONSUMER_PHP);
    const digest = consumer.shapes[0]?.digest ?? '';
    const rows = evaluateKeyCoverage({ shapes: consumer.shapes, patterns: [], envMap: ENV_MAP, exclusions: [digest] });
    expect(rows[0]?.verdict).toBe('EXCLUDED_BY_DECLARATION');
    // A near-miss digest never matches.
    const other = evaluateKeyCoverage({ shapes: consumer.shapes, patterns: [], envMap: ENV_MAP, exclusions: [`cks:sha256:${'0'.repeat(24)}`] });
    expect(other[0]?.verdict).toBe('NOT_APPLICABLE');
  });

  test('ambiguity: indirect builders and dynamic delimiters fail closed', () => {
    const indirect = consumerExtraction(`<?php
class Cache {
    public function getUserHash(string $key): array {
        $set_key = implode(':', [getenv(API_NEV), 'ripple-api', buildUserSegment(), $this->cahceid]);
        return [$set_key];
    }
}
`);
    expect(indirect.shapes).toEqual([]);
    expect(indirect.ambiguous.map((entry) => entry.detail)).toEqual(['CALL_SEGMENT']);
    const dynamic = consumerExtraction(`<?php
class Cache {
    public function getUserHash(string $key): array {
        $set_key = implode($key, [getenv(API_NEV), 'ripple-api', $this->cahceid]);
        return [$set_key];
    }
}
`);
    expect(dynamic.shapes).toEqual([]);
    expect(dynamic.ambiguous.map((entry) => entry.detail)).toEqual(['DYNAMIC_DELIMITER']);
    const go = producerExtraction(`package mgtacct

import "fmt"

func clearRippleUserCache(mspID string) {
	pattern := fmt.Sprintf(patternFormat, runEnv, mspID)
	_ = pattern
}
`, ':');
    expect(go.patterns).toEqual([]);
    expect(go.ambiguous.map((entry) => entry.detail)).toEqual(['DYNAMIC_FORMAT']);
  });

  test('privacy: value-like literals fail closed and cannot reach a report', () => {
    const sentinels = ['user@example.com', '123456789012', `AKIAIOSFODNN7EXAMPLE${'0123456789'.repeat(2)}`];
    for (const sentinel of sentinels) {
      const extraction = consumerExtraction(`<?php
class Cache {
    public function getUserHash(string $key): array {
        $set_key = implode(':', [getenv(API_NEV), 'ripple-api', '${sentinel}', $this->cahceid]);
        return [$set_key];
    }
}
`);
      expect(extraction.shapes).toEqual([]);
      expect(extraction.ambiguous.map((entry) => entry.detail)).toEqual(['VALUE_LIKE_LITERAL']);
      expect(JSON.stringify(extraction)).not.toContain(sentinel);
    }
  });

  test('digests are stable across repeated derivation and independent of other contracts', () => {
    const first = consumerExtraction(CONSUMER_PHP);
    const second = consumerExtraction(CONSUMER_PHP);
    expect(second.shapes[0]?.digest).toBe(first.shapes[0]?.digest);
    expect(shapeDigest({ delimiter: ':', atoms: [ENV, NS('ripple-api'), LIT('user'), VAR] })).toMatch(/^cks:sha256:[0-9a-f]{24}$/);
  });
});

// ---------------------------------------------------------------------------
// Orchestration over injected access (stale / unavailable / invalid).
// ---------------------------------------------------------------------------

function stubs(options: { consumerSha?: string | null; producerSha?: string | null; nullPath?: string }) {
  const files: Record<string, string> = {
    'mobingilabs/ripple-api|src/App/Core/Utility/Cache.php': CONSUMER_PHP,
    'mobingilabs/ouchan|services/costd/vendors/aws/mgtacct/mgtacct.go': PRODUCER_GO_COVERED,
  };
  const reader = {
    readFile(repoId: string, relativePath: string): string | null {
      if (options.nullPath === `${repoId}|${relativePath}`) return null;
      return files[`${repoId}|${relativePath}`] ?? null;
    },
  };
  const currentness = {
    currentSnapshot(repoId: string): { repoId: string; sha: string } | null {
      const sha = repoId === 'mobingilabs/ripple-api' ? options.consumerSha : options.producerSha;
      return sha === undefined || sha === null ? null : { repoId, sha };
    },
  };
  return { reader, currentness };
}

function declaration(overrides: Partial<CacheKeyContractDeclaration> = {}): CacheKeyContractDeclaration {
  return {
    contractId: 'synthetic-cache-key-pair',
    namespace: 'ripple-api',
    delimiter: ':',
    envMap: { producerEnvToken: 'runEnv', pairs: [{ producer: 'prod', consumer: 'production' }, { producer: 'production', consumer: 'production' }] },
    consumer: { repoId: 'mobingilabs/ripple-api', sha: 'a'.repeat(40), roots: ['src'], paths: ['src/App/Core/Utility/Cache.php'], functions: ['getUserHash'] },
    producer: { repoId: 'mobingilabs/ouchan', sha: 'b'.repeat(40), roots: ['services'], paths: ['services/costd/vendors/aws/mgtacct/mgtacct.go'], functions: ['clearRippleUserCache'] },
    exclusions: [],
    ...overrides,
  };
}

test.describe('C4 orchestration', () => {
  test('current sources produce a COVERED report with no findings anywhere', () => {
    const config = { schemaVersion: CACHE_KEY_CONTRACTS_SCHEMA, contracts: [declaration()] };
    const report = runCacheKeyContract({ config, ...stubs({ consumerSha: 'a'.repeat(40), producerSha: 'b'.repeat(40) }) });
    expect(report.schemaVersion).toBe(CACHE_KEY_REPORT_SCHEMA);
    expect(report.verdict).toBe('COVERED');
    expect(report.reportDigest).toMatch(/^ckr:sha256:[0-9a-f]{24}$/);
    expect(Object.keys(report).sort()).toEqual(['schemaVersion', 'verdict', 'contracts', 'reportDigest', 'note'].sort());
    const row = report.contracts[0]?.rows[0];
    expect(row?.consumerProvenance).toEqual({ repoId: 'mobingilabs/ripple-api', sha: 'a'.repeat(40), relativePath: 'src/App/Core/Utility/Cache.php', symbol: 'getUserHash' });
    expect(row?.producerProvenance).toEqual({ repoId: 'mobingilabs/ouchan', sha: 'b'.repeat(40), relativePath: 'services/costd/vendors/aws/mgtacct/mgtacct.go', symbol: 'clearRippleUserCache' });
    expect(JSON.stringify(report)).not.toMatch(/finding|Finding|SOURCE_EXPECTATION_MISMATCH|invariant/i);
    // Repeat derivation is byte-identical.
    const again = runCacheKeyContract({ config, ...stubs({ consumerSha: 'a'.repeat(40), producerSha: 'b'.repeat(40) }) });
    expect(again).toEqual(report);
    expect(again.reportDigest).toBe(report.reportDigest);
  });

  test('a moved snapshot is SOURCE_STALE and never judged', () => {
    const config = { schemaVersion: CACHE_KEY_CONTRACTS_SCHEMA, contracts: [declaration()] };
    const report = runCacheKeyContract({ config, ...stubs({ consumerSha: 'c'.repeat(40), producerSha: 'b'.repeat(40) }) });
    expect(report.verdict).toBe('SOURCE_STALE');
    expect(report.contracts[0]?.rows).toEqual([]);
    const unavailable = runCacheKeyContract({ config, ...stubs({ consumerSha: null, producerSha: 'b'.repeat(40) }) });
    expect(unavailable.verdict).toBe('SOURCE_UNAVAILABLE');
    const missingPath = runCacheKeyContract({ config, ...stubs({ consumerSha: 'a'.repeat(40), producerSha: 'b'.repeat(40), nullPath: 'mobingilabs/ouchan|services/costd/vendors/aws/mgtacct/mgtacct.go' }) });
    expect(missingPath.verdict).toBe('SOURCE_UNAVAILABLE');
  });

  test('an unapproved repo or root is DECLARATION_INVALID before any read', () => {
    const base = declaration();
    const invalid = [
      { ...base, consumer: { ...base.consumer, repoId: 'mobingilabs/secret-repo' } },
      { ...base, consumer: { ...base.consumer, roots: ['tests'], paths: ['tests/App/Cache.php'] } },
      { ...base, consumer: { ...base.consumer, paths: ['src/../etc/passwd'] } },
      { ...base, consumer: { ...base.consumer, functions: [] } },
      { ...base, envMap: { producerEnvToken: null, pairs: [] } },
      { ...base, exclusions: ['not-a-digest'] },
      { ...base, extra: true },
    ];
    for (const contract of invalid) {
      const config = { schemaVersion: CACHE_KEY_CONTRACTS_SCHEMA, contracts: [contract] };
      const validation = validateCacheKeyContractConfig(config);
      expect(validation.ok).toBe(false);
      const report = runCacheKeyContract({ config, ...stubs({ consumerSha: 'a'.repeat(40), producerSha: 'b'.repeat(40) }) });
      expect(report.verdict).toBe('DECLARATION_INVALID');
      expect(report.contracts).toEqual([]);
    }
    expect(validateCacheKeyContractConfig({ schemaVersion: 'nightwatch.cache-key-contracts.v2', contracts: [] }).ok).toBe(false);
    expect(validateCacheKeyContractConfig({ schemaVersion: CACHE_KEY_CONTRACTS_SCHEMA, contracts: Array(9).fill(declaration()) }).ok).toBe(false);
  });

  test('ambiguity in a declared function is its own non-escalating row', () => {
    const ambiguousPhp = CONSUMER_PHP.replace(`'user', $this->cahceid`, `buildSegment(), $this->cahceid`);
    const config = { schemaVersion: CACHE_KEY_CONTRACTS_SCHEMA, contracts: [declaration()] };
    const reader = {
      readFile(repoId: string, relativePath: string): string | null {
        if (repoId === 'mobingilabs/ripple-api') return ambiguousPhp;
        return PRODUCER_GO_COVERED;
      },
    };
    const currentness = stubs({ consumerSha: 'a'.repeat(40), producerSha: 'b'.repeat(40) }).currentness;
    const report = runCacheKeyContract({ config, reader, currentness });
    expect(report.verdict).toBe('EXTRACTION_AMBIGUOUS');
    expect(report.contracts[0]?.rows[0]?.verdict).toBe('EXTRACTION_AMBIGUOUS');
    expect(report.contracts[0]?.rows[0]?.consumerShapeDigest).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Driver integration against fixture repositories (real process, real files).
// ---------------------------------------------------------------------------

function git(cwd: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 15_000, maxBuffer: 512 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) throw new Error(`fixture git ${args.join(' ')} failed: ${(result.stderr || '').slice(0, 200)}`);
  return result.stdout ?? '';
}

function initFixtureRepo(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  git(dir, ['init', '--quiet']);
  git(dir, ['config', 'user.name', 'Nightwatch Fixture']);
  git(dir, ['config', 'user.email', 'fixture@example.invalid']);
}

function commitFile(dir: string, relativePath: string, content: string): string {
  const absolute = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, 'utf8');
  git(dir, ['add', '-A']);
  const date = '2026-01-02T03:04:05Z';
  const result = spawnSync('git', ['commit', '--quiet', '-m', `add ${relativePath}`], {
    cwd: dir, encoding: 'utf8', timeout: 15_000, env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) throw new Error(`fixture commit failed: ${(result.stderr || '').slice(0, 200)}`);
  return git(dir, ['rev-parse', 'HEAD']).trim();
}

function runDriver(configPath: string): { status: number | null; report: any; stdout: string } {
  const outPath = path.join(TMP_ROOT, 'report.json');
  fs.rmSync(outPath, { force: true });
  const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'cache-key-contract.mjs'), '--config', configPath, '--out', outPath, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, NIGHTWATCH_REPOS_ROOT: REPOS_ROOT },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const report = JSON.parse(result.stdout);
  const written = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  expect(written).toEqual(report);
  return { status: result.status, report, stdout: result.stdout };
}

test.describe('C4 read-only driver (local fixture repositories)', () => {
  let consumerSha = '';
  let producerSha = '';
  let coveredConfig: CacheKeyContractDeclaration;
  let brokenConfig: CacheKeyContractDeclaration;

  test.beforeAll(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
    const consumerRepo = path.join(REPOS_ROOT, 'mobingilabs', 'ripple-api');
    const producerRepo = path.join(REPOS_ROOT, 'mobingilabs', 'ouchan');
    initFixtureRepo(consumerRepo);
    initFixtureRepo(producerRepo);
    consumerSha = commitFile(consumerRepo, 'src/App/Core/Utility/Cache.php', CONSUMER_PHP);
    producerSha = commitFile(producerRepo, 'services/costd/vendors/aws/mgtacct/mgtacct.go', PRODUCER_GO_COVERED);
    coveredConfig = declaration({
      consumer: { ...declaration().consumer, sha: consumerSha },
      producer: { ...declaration().producer, sha: producerSha },
    });
    brokenConfig = declaration({
      consumer: { ...declaration().consumer, sha: consumerSha },
      producer: { ...declaration().producer, sha: producerSha },
    });
    // A second producer file with the historical pipe-delimited pattern: the
    // declaration points at it so its SHA pins the same fixture repository.
    producerSha = commitFile(producerRepo, 'services/costd/vendors/aws/mgtacct/legacy.go', PRODUCER_GO_PIPE);
    brokenConfig = {
      ...brokenConfig,
      producer: { ...brokenConfig.producer, sha: producerSha, paths: ['services/costd/vendors/aws/mgtacct/legacy.go'], functions: ['clearRippleUserCache'] },
    };
    coveredConfig = { ...coveredConfig, producer: { ...coveredConfig.producer, sha: producerSha } };
  });

  test.afterAll(() => {
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  test('covers the declared pair, then reports the historical delimiter divergence', () => {
    const coveredPath = path.join(TMP_ROOT, 'covered.json');
    fs.writeFileSync(coveredPath, `${JSON.stringify({ schemaVersion: CACHE_KEY_CONTRACTS_SCHEMA, contracts: [coveredConfig] }, null, 2)}\n`, 'utf8');
    const covered = runDriver(coveredPath);
    expect(covered.status).toBe(0);
    expect(covered.report.verdict).toBe('COVERED');
    expect(covered.report.reportDigest).toMatch(/^ckr:sha256:[0-9a-f]{24}$/);
    const repeat = runDriver(coveredPath);
    expect(repeat.report.reportDigest).toBe(covered.report.reportDigest);

    const brokenPath = path.join(TMP_ROOT, 'broken.json');
    fs.writeFileSync(brokenPath, `${JSON.stringify({ schemaVersion: CACHE_KEY_CONTRACTS_SCHEMA, contracts: [brokenConfig] }, null, 2)}\n`, 'utf8');
    const broken = runDriver(brokenPath);
    expect(broken.status).toBe(1);
    expect(broken.report.verdict).toBe('NOT_COVERED');
    expect(broken.report.contracts[0].rows[0].reasonCode).toBe('DELIMITER_MISMATCH');
    expect(broken.report.contracts[0].rows[0].verdict).toBe('NOT_COVERED');
    // Phase 1a: no finding anywhere in the emitted surface.
    expect(broken.stdout).not.toMatch(/SOURCE_EXPECTATION_MISMATCH|SemanticOracleFinding|findingId/);
  });

  test('an invalid declaration is refused before any source read', () => {
    const invalidPath = path.join(TMP_ROOT, 'invalid.json');
    fs.writeFileSync(invalidPath, `${JSON.stringify({
      schemaVersion: CACHE_KEY_CONTRACTS_SCHEMA,
      contracts: [{ ...coveredConfig, consumer: { ...coveredConfig.consumer, repoId: 'mobingilabs/unapproved' } }],
    }, null, 2)}\n`, 'utf8');
    const result = runDriver(invalidPath);
    expect(result.status).toBe(2);
    expect(result.report.verdict).toBe('DECLARATION_INVALID');
    expect(result.report.contracts).toEqual([]);
  });

  test('the shipped registry declares no real contract and the driver refuses a missing config', () => {
    const shipped = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'cache-key-contracts.v1.json'), 'utf8'));
    expect(shipped).toEqual({ schemaVersion: CACHE_KEY_CONTRACTS_SCHEMA, contracts: [] });
    const missing = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'cache-key-contract.mjs'), '--config', path.join(TMP_ROOT, 'absent.json'), '--out', path.join(TMP_ROOT, 'report.json')], {
      cwd: ROOT, encoding: 'utf8', timeout: 30_000, env: { ...process.env, NIGHTWATCH_REPOS_ROOT: REPOS_ROOT }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain('CONFIG_UNREADABLE');
  });
});
