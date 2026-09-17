// ---------------------------------------------------------------------------
// Nightwatch C-05 — universe discovery and admission hygiene.
//
// One sentence is being made mechanical: a repository DISCOVERED is not a
// repository ADMITTED. 149 git repositories sit under the sibling root and
// eight are admitted, and before C-05 nothing in the codebase said so —
// admission was an unstated INTERSECTION of two lists in two files, where a
// repository present in one and absent from the other was silently dropped.
//
// The assertions here are chosen to fail if the separation erodes:
//
//   * no property of a discovered repository can promote it, including the two
//     that actually hold for `blueinternal` (it has an OpenAPI document, and it
//     sits beside the already-admitted `blueapi`);
//   * the authority and the dependency map must AGREE, in both directions,
//     rather than silently intersecting;
//   * the persisted record carries no current mutable Git state;
//   * UNKNOWN never becomes a number when an enumeration is truncated.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  C05_ADMITTED_REPOSITORY_IDS,
  NON_ADMISSION_PROPERTIES,
  OWNER_APPROVED_UNIVERSE,
  approvedRootsFor,
  classifyDiscoveredRepositories,
  isOwnerApproved,
  ownerApprovedRepositoryIds,
} from '../../src/core/source/universe';
import { PHASE25_APPROVED_REPOSITORY_IDS } from '../../src/core/source/approvedScan';
import { DEFAULT_SIBLING_ROOT, createSiblingSourceAccess } from '../../src/core/source/siblingSource';
import { RIPPLE_REPOSITORIES } from '../../src/core/changeIntelligence/map';

const root = path.resolve(__dirname, '..', '..');

/** Whether a read-only sibling checkout is present, as C-02a asks it. */
function siblingRepoAvailable(repoId: string): boolean {
  return fs.existsSync(path.join(DEFAULT_SIBLING_ROOT, ...repoId.split('/'), '.git'));
}

test.describe('C-05 — the admission authority is single', () => {
  test('the scan universe is exactly the owner-approved universe', () => {
    expect([...PHASE25_APPROVED_REPOSITORY_IDS]).toEqual([...ownerApprovedRepositoryIds()]);
  });

  test('every admitted repository has at least one approved root', () => {
    for (const repoId of ownerApprovedRepositoryIds()) {
      const roots = approvedRootsFor(repoId);
      expect(roots).not.toBeNull();
      expect(roots!.length).toBeGreaterThan(0);
    }
  });

  test('the authority and the dependency map agree in BOTH directions', () => {
    // The old intersection made either disagreement invisible. Each direction
    // means something different and neither is guessable, so both are errors.
    const approved = new Set(ownerApprovedRepositoryIds());
    const inScope = new Set(RIPPLE_REPOSITORIES.filter((repository) => repository.scope === 'IN_SCOPE').map((repository) => repository.repoId));
    expect([...approved].filter((repoId) => !inScope.has(repoId))).toEqual([]);
    expect([...inScope].filter((repoId) => !approved.has(repoId))).toEqual([]);
  });

  test('no scanner keeps a repository allowlist of its own', () => {
    // `approvedScan.ts` used to own an APPROVED_ROOTS literal. The authority
    // is now the only place a root set may be stated.
    const scan = fs.readFileSync(path.join(root, 'src/core/source/approvedScan.ts'), 'utf8');
    expect(scan).not.toMatch(/APPROVED_ROOTS\s*[:=]/);
    expect(scan).toMatch(/from '\.\/universe'/);
  });

  test('an unapproved repository is refused by the scan config', () => {
    expect(isOwnerApproved('alphauslabs/definitely-not-approved')).toBe(false);
    expect(approvedRootsFor('alphauslabs/definitely-not-approved')).toBeNull();
  });
});

test.describe('C-05 — discovery grants nothing', () => {
  test('a large discovered set admits only the authority members', () => {
    const discovered = [
      ...ownerApprovedRepositoryIds(),
      'alphauslabs/some-other-service',
      'mobingilabs/another-legacy-api',
      'thirdparty/vendored-thing',
    ];
    const projection = classifyDiscoveredRepositories(discovered);
    expect(projection.discoveredCount).toBe(discovered.length);
    expect(projection.admittedCount).toBe(ownerApprovedRepositoryIds().length);
    expect(projection.notAdmittedCount).toBe(3);
    for (const repository of projection.repositories) {
      expect(repository.admission).toBe(isOwnerApproved(repository.repoId) ? 'ADMITTED' : 'DISCOVERED_NOT_ADMITTED');
    }
  });

  test('a not-admitted repository is given no roots at all', () => {
    const projection = classifyDiscoveredRepositories(['alphauslabs/some-other-service']);
    expect(projection.repositories[0]!.admission).toBe('DISCOVERED_NOT_ADMITTED');
    expect(projection.repositories[0]!.approvedRoots).toBeNull();
  });

  test('the properties that are NOT admission reasons are stated, and none is consulted', () => {
    // These are the plausible shortcuts. Two of them genuinely hold for
    // `blueinternal` — it HAS an OpenAPI document and it DOES sit in the same
    // organization directory as the admitted `blueapi` — and neither is why it
    // is admitted. An owner authorization is.
    expect(NON_ADMISSION_PROPERTIES).toContain('CONTAINS_OPENAPI_DOCUMENT');
    expect(NON_ADMISSION_PROPERTIES).toContain('FILESYSTEM_ADJACENT_TO_ADMITTED_REPOSITORY');
    expect(NON_ADMISSION_PROPERTIES).toContain('ORGANIZATION_DIRECTORY_MATCHES');
    // A sibling in the same org directory, with a name shaped like an admitted
    // one, still gets nothing.
    const projection = classifyDiscoveredRepositories(['alphauslabs/blueexternal', 'alphauslabs/blueinternal']);
    expect(projection.repositories.find((repository) => repository.repoId === 'alphauslabs/blueexternal')!.admission).toBe('DISCOVERED_NOT_ADMITTED');
    expect(projection.repositories.find((repository) => repository.repoId === 'alphauslabs/blueinternal')!.admission).toBe('ADMITTED');
  });

  test('a truncated enumeration reports UNKNOWN rather than a total', () => {
    const bounded = classifyDiscoveredRepositories(['alphauslabs/blueapi'], true);
    expect(bounded.truncated).toBe(true);
    expect(bounded.totalDiscovered).toBeNull();
    expect(bounded.remainingUnknown).toBe(true);
    const complete = classifyDiscoveredRepositories(['alphauslabs/blueapi'], false);
    expect(complete.totalDiscovered).toBe(1);
    expect(complete.remainingUnknown).toBe(false);
  });

  test('an admitted repository the enumeration never saw is reported, not silently dropped', () => {
    const projection = classifyDiscoveredRepositories(['alphauslabs/blueapi']);
    expect(projection.admittedButNotDiscovered).toContain('mobingilabs/wave-api');
    expect(projection.admittedCount).toBe(1);
  });

  test('duplicate discoveries collapse and ordering is deterministic', () => {
    const a = classifyDiscoveredRepositories(['b/two', 'a/one', 'b/two']);
    const b = classifyDiscoveredRepositories(['a/one', 'b/two']);
    expect(a.repositories.map((repository) => repository.repoId)).toEqual(['a/one', 'b/two']);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

test.describe('C-05 — the two owner-named admissions, and no third', () => {
  test('exactly the two named repositories were admitted', () => {
    expect([...C05_ADMITTED_REPOSITORY_IDS]).toEqual(['alphauslabs/blueinternal', 'mobingilabs/wave-api']);
    for (const repoId of C05_ADMITTED_REPOSITORY_IDS) expect(isOwnerApproved(repoId)).toBe(true);
  });

  test('the admitted universe is exactly the pre-C-05 six plus those two', () => {
    // Stated as a literal so that admitting a ninth repository fails HERE,
    // rather than being absorbed by a count that merely changed.
    expect([...ownerApprovedRepositoryIds()]).toEqual([
      'alphauslabs/blue-sdk-go',
      'alphauslabs/blueapi',
      'alphauslabs/blueinternal',
      'alphauslabs/grpc-chunk-parser',
      'mobingilabs/ouchan',
      'mobingilabs/ripple-api',
      'mobingilabs/ripple-ui',
      'mobingilabs/wave-api',
    ]);
  });

  test('blueinternal is admitted for openapiv2 only', () => {
    expect([...approvedRootsFor('alphauslabs/blueinternal')!]).toEqual(['openapiv2']);
  });

  test('wave-api is admitted for src and the Wave 2 tests root, by its real identity', () => {
    // Wave 2 / OQ-5 admitted `tests` for bounded static test-oracle
    // classification; no other root was added.
    expect([...approvedRootsFor('mobingilabs/wave-api')!]).toEqual(['src', 'tests']);
    // The authorization said "wave-api"; workspace truth says the identity is
    // `mobingilabs/wave-api`. A top-level `wave-api` does not exist.
    expect(isOwnerApproved('wave-api')).toBe(false);
  });

  test('the pre-C-05 root sets are unchanged apart from the Wave 2 tests admission', () => {
    // Wave 2 / OQ-5: `tests` only; `src` remains the product root.
    expect([...approvedRootsFor('mobingilabs/ripple-api')!]).toEqual(['src', 'tests']);
    expect([...approvedRootsFor('mobingilabs/ouchan')!]).toEqual(['services', 'pkg']);
    expect(approvedRootsFor('alphauslabs/blueapi')!).toContain('openapiv2');
    expect(approvedRootsFor('alphauslabs/blueapi')!).toContain('billing');
  });
});

test.describe('C-05 — no current mutable Git state is persisted', () => {
  const definitionFields = () => {
    const types = fs.readFileSync(path.join(root, 'src/core/changeIntelligence/types.ts'), 'utf8');
    const block = /export interface RepoDefinition \{([\s\S]*?)\n\}/.exec(types);
    expect(block).not.toBeNull();
    return block![1]!;
  };

  test('the persisted record carries no branch, tracking SHA, ahead, behind or dirty', () => {
    // These decayed exactly where you would expect: the checkout-local fields
    // stayed accurate because the working copies had not moved, and 10 of 18
    // remote-tracking fields diverged because the REMOTES had. `ouchan`
    // recorded behind: 25 while actually 310 behind.
    const fields = definitionFields();
    for (const field of ['branch', 'trackingSha', 'ahead', 'behind', 'dirty']) {
      expect(fields).not.toMatch(new RegExp(`(^|\\n)\\s*${field}\\s*:`));
    }
  });

  test('no repository entry carries a mutable Git field', () => {
    const map = fs.readFileSync(path.join(root, 'src/core/changeIntelligence/map.ts'), 'utf8');
    for (const field of ['branch', 'trackingSha', 'ahead', 'behind', 'dirty']) {
      expect(map).not.toMatch(new RegExp(`(^|\\n)\\s{4}${field}:`));
    }
  });

  test('the pinned anchors REMAIN, because a staleness check needs a pin', () => {
    // Removing these would make every staleness check vacuously pass, which is
    // strictly worse than a stale value: it would be a silent rebind.
    const fields = definitionFields();
    expect(fields).toMatch(/checkedOutSha\s*:/);
    expect(fields).toMatch(/sourceMapSha\s*:/);
    expect(fields).toMatch(/trackingRef\s*:/);
    for (const repository of RIPPLE_REPOSITORIES) {
      expect(repository.checkedOutSha).toMatch(/^[0-9a-f]{40}$/);
      expect(repository.sourceMapSha).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  test('the shadow report derives its Git state live rather than from the map', () => {
    const shadow = fs.readFileSync(path.join(root, 'bin/change-intelligence.mjs'), 'utf8');
    // It must observe, and it must not republish the persisted fields.
    expect(shadow).toMatch(/observedRepo/);
    expect(shadow).toMatch(/rev-list', '--left-right', '--count'/);
    expect(shadow).not.toMatch(/behind: repo\.behind/);
    expect(shadow).not.toMatch(/trackingSha: repo\.trackingSha/);
    // A missing local tracking ref must stay UNKNOWN rather than become zero.
    expect(shadow).toMatch(/trackingSha = null/);
  });

  test('the repositories root is never derived from this checkout location', () => {
    // A session worktree lives outside the workspace tree, so
    // `resolve(nightwatchRoot, '../..')` resolved to `$HOME/.nightwatch` and
    // every git call failed with ENOENT.
    const shadow = fs.readFileSync(path.join(root, 'bin/change-intelligence.mjs'), 'utf8');
    expect(shadow).toMatch(/DEFAULT_SIBLING_ROOT/);
    expect(shadow).not.toMatch(/const workspaceRoot = path\.resolve\(nightwatchRoot, '\.\.\/\.\.'\)/);
  });
});

test.describe('C-05 — an unapproved repository is never READ, proven at the boundary', () => {
  // The old guarantee was `operations === 0`, a property of OUTPUT. An analyzer
  // that opened every file and derived nothing satisfies that just as well as
  // one that opened nothing, so it could never distinguish the two. These
  // assertions are about what was ATTEMPTED.

  const unapproved = 'alphauslabs/blueexternal-not-approved';

  test('the boundary refuses a content read and COUNTS the refusal', () => {
    const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT, {
      admittedRepositoryIds: ownerApprovedRepositoryIds(),
    });
    expect(access.reader.readFile(unapproved, 'README.md')).toBeNull();
    expect(access.readLedger.contentReads(unapproved)).toBe(0);
    expect(access.readLedger.admissionRefusals(unapproved)).toBe(1);
    expect(access.readLedger.attempts(unapproved)).toBe(1);
  });

  test('enumeration is refused with a reason, not returned as an empty repository', () => {
    const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT, {
      admittedRepositoryIds: ownerApprovedRepositoryIds(),
    });
    const enumeration = access.enumerateFiles(unapproved, ['src'], {
      maxFiles: 16, maxTotalBytes: 1_000, maxFileBytes: 1_000, allowedExtensions: ['.ts'], excludedDirectories: [],
    } as never);
    expect(enumeration.entries).toEqual([]);
    // A refusal that looks like an empty repository is the ambiguity the
    // ledger exists to remove.
    expect(enumeration.rejectedPaths.length).toBeGreaterThan(0);
    expect(access.readLedger.admissionRefusals(unapproved)).toBe(1);
  });

  test('git metadata is refused too, so currentness cannot leak admission', () => {
    const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT, {
      admittedRepositoryIds: ownerApprovedRepositoryIds(),
    });
    expect(access.currentness.currentSnapshot(unapproved)).toBeNull();
    expect(access.readLedger.admissionRefusals(unapproved)).toBe(1);
  });

  test('a REAL discovered-but-unapproved repository yields zero content reads', () => {
    // `alphauslabs/blue` and its siblings exist on disk. Discovery may see
    // them; the boundary must still open nothing.
    const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT, {
      admittedRepositoryIds: ownerApprovedRepositoryIds(),
    });
    for (const repoId of ['alphauslabs/blue', 'mobingilabs/ripple-web', 'alphauslabs/bluectl']) {
      access.reader.readFile(repoId, 'README.md');
      access.reader.readFile(repoId, 'go.mod');
      expect(access.readLedger.contentReads(repoId)).toBe(0);
    }
    expect(access.readLedger.totalAdmissionRefusals()).toBe(6);
  });

  test('an APPROVED repository is still readable, so the gate is not vacuous', () => {
    // This is the ONLY case in this suite that needs real content on disk: it
    // is the converse that stops the gate being trivially satisfied by refusing
    // everything. Every other case asserts a REFUSAL, which the boundary
    // decides before touching the filesystem and which therefore holds whether
    // or not the checkout exists.
    //
    // It self-skips without the sibling checkouts, exactly as C-02a's
    // real-source block does. Written without this guard it failed in CI --
    // where the checkouts are absent -- while passing locally, which is the
    // precise failure mode R-12 spent a campaign making visible.
    test.skip(!siblingRepoAvailable('alphauslabs/blueinternal'), 'requires the read-only sibling Alphaus checkouts');
    const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT, {
      admittedRepositoryIds: ownerApprovedRepositoryIds(),
    });
    const text = access.reader.readFile('alphauslabs/blueinternal', 'openapiv2/apidocs.swagger.json');
    expect(text).not.toBeNull();
    expect(access.readLedger.contentReads('alphauslabs/blueinternal')).toBe(1);
    expect(access.readLedger.admissionRefusals('alphauslabs/blueinternal')).toBe(0);
  });

  test('an empty admitted set admits nothing, while omitting the option enforces nothing', () => {
    // These two must not be conflated: `[]` is a decision, `undefined` is the
    // pre-C-05 behaviour retained for existing callers.
    const closed = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT, { admittedRepositoryIds: [] });
    expect(closed.reader.readFile('alphauslabs/blueinternal', 'openapiv2/apidocs.swagger.json')).toBeNull();
    expect(closed.readLedger.admissionRefusals('alphauslabs/blueinternal')).toBe(1);
    const unset = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT);
    expect(unset.readLedger.totalAdmissionRefusals()).toBe(0);
  });

  test('the ledger reports every repository it was asked about', () => {
    const access = createSiblingSourceAccess(DEFAULT_SIBLING_ROOT, {
      admittedRepositoryIds: ownerApprovedRepositoryIds(),
    });
    access.reader.readFile('z/unapproved', 'a');
    access.reader.readFile('a/unapproved', 'b');
    expect([...access.readLedger.repositoriesTouched()]).toEqual(['a/unapproved', 'z/unapproved']);
  });
});
