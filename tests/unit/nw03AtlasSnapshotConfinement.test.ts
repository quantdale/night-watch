import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  BUG_ATLAS_SNAPSHOT_FILE,
  loadBugAtlasSnapshot,
  saveBugAtlasSnapshot,
  snapshotFilePath,
} from '../../src/core/bugAtlas/snapshot';
import { bugAtlasFixtureCorpus } from '../../src/core/bugAtlas/fixtures';
import { resolveSourceTopology } from '../../src/core/policy/sourceTopology';

/**
 * NW-03. `snapshotFilePath` joined a caller-supplied `fileName` onto the
 * state directory with no containment proof, and `saveBugAtlasSnapshot` then
 * called `writeFileSync` directly on the result. So a configured
 * `'../synthetic-escape.json'` wrote OUTSIDE the authorized root, an existing
 * leaf symlink was followed and its target truncated, and — because the
 * directory was created from `path.dirname(file)` — an escaping name also
 * created and chmodded a directory the store had no business touching.
 *
 * Every case runs in a disposable temporary tree and plants sentinels outside
 * the state root. A sentinel whose bytes change is the failure.
 */

interface Fixture {
  readonly base: string;
  readonly stateRoot: string;
  readonly outside: string;
}

function fixture(): Fixture {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'nw03-atlas-'));
  const stateRoot = path.join(base, 'state', 'bug-atlas');
  const outside = path.join(base, 'outside');
  fs.mkdirSync(stateRoot, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  return { base, stateRoot, outside };
}

const SENTINEL = 'SYNTHETIC SENTINEL — must never be rewritten\n';

function plantSentinel(file: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, SENTINEL);
}

function sentinelIntact(file: string): boolean {
  return fs.existsSync(file) && fs.readFileSync(file, 'utf8') === SENTINEL;
}

const records = () => bugAtlasFixtureCorpus().slice(0, 2);

/** Names that must never reach the filesystem as a path component. */
const UNSAFE_NAMES = [
  '../synthetic-escape.json',
  '../../synthetic-escape.json',
  'nested/synthetic-escape.json',
  './synthetic-escape.json',
  '/synthetic-absolute.json',
  '..',
  '.',
  '',
  'no-extension',
  '.hidden.json',
] as const;

test.describe('NW-03 — Bug Atlas snapshots stay inside their authorized root', () => {
  test('an unsafe file name is refused before anything is created', () => {
    const { base, stateRoot, outside } = fixture();
    try {
      const escapeTarget = path.join(path.dirname(stateRoot), 'synthetic-escape.json');
      plantSentinel(escapeTarget);
      const before = fs.readdirSync(stateRoot);
      for (const fileName of UNSAFE_NAMES) {
        expect(
          () => snapshotFilePath({ stateDirectory: stateRoot, fileName }),
          `snapshotFilePath must refuse ${JSON.stringify(fileName)}`,
        ).toThrow(/BUG_ATLAS_SNAPSHOT_FILE_NAME_UNSAFE|BUG_ATLAS_SNAPSHOT_PATH_ESCAPE/);
        expect(
          () => saveBugAtlasSnapshot(records(), { stateDirectory: stateRoot, fileName }),
          `saveBugAtlasSnapshot must refuse ${JSON.stringify(fileName)}`,
        ).toThrow(/BUG_ATLAS_SNAPSHOT_FILE_NAME_UNSAFE|BUG_ATLAS_SNAPSHOT_PATH_ESCAPE/);
      }
      expect(sentinelIntact(escapeTarget), 'the escape target was rewritten').toBe(true);
      expect(fs.readdirSync(stateRoot), 'the state root was modified by a refused write').toEqual(before);
      expect(fs.readdirSync(outside)).toEqual([]);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('an existing leaf symlink is refused, not followed', () => {
    const { base, stateRoot, outside } = fixture();
    try {
      const target = path.join(outside, 'symlink-target.json');
      plantSentinel(target);
      fs.symlinkSync(target, path.join(stateRoot, BUG_ATLAS_SNAPSHOT_FILE));
      // Either refusal is correct: the path-component scan reaches the leaf
      // first, and the destination check backs it up. What matters is that the
      // symlink is refused rather than followed.
      expect(() => saveBugAtlasSnapshot(records(), { stateDirectory: stateRoot }))
        .toThrow(/BUG_ATLAS_SNAPSHOT_PATH_SYMLINK|BUG_ATLAS_SNAPSHOT_DESTINATION_UNSAFE/);
      expect(sentinelIntact(target), 'the symlink target was truncated').toBe(true);
      // The refusal must not leave a partial snapshot or a temporary behind.
      expect(fs.readdirSync(stateRoot)).toEqual([BUG_ATLAS_SNAPSHOT_FILE]);
      expect(fs.lstatSync(path.join(stateRoot, BUG_ATLAS_SNAPSHOT_FILE)).isSymbolicLink()).toBe(true);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('a symlinked ancestor of the state directory is refused', () => {
    const { base, outside } = fixture();
    try {
      const real = path.join(outside, 'real-state');
      fs.mkdirSync(real, { recursive: true });
      const linked = path.join(base, 'linked-state');
      fs.symlinkSync(real, linked);
      expect(() => saveBugAtlasSnapshot(records(), { stateDirectory: path.join(linked, 'bug-atlas') }))
        .toThrow(/BUG_ATLAS_STATE_SYMLINK_REFUSED/);
      expect(fs.readdirSync(real)).toEqual([]);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('a state directory inside Nightwatch or sibling source is refused', () => {
    // NW-03 consumes the NW-02 authority: owner-private Atlas state must not
    // land under tracked source, whatever checkout is running.
    //
    // This case names a path inside the REAL repositories root, because that
    // is the decision that matters. Against the pre-repair code it actually
    // created that directory and wrote a 0600 snapshot into the canonical
    // Nightwatch checkout — so the cleanup below is scoped to the exact
    // fabricated name this test chose, and runs whether the case passes or
    // fails.
    const { base } = fixture();
    const live = resolveSourceTopology();
    const insideSource = path.join(live.repositoriesRoot, 'nightwatch', 'synthetic-nw03-atlas-state');
    expect(path.basename(insideSource)).toBe('synthetic-nw03-atlas-state');
    try {
      expect(() => saveBugAtlasSnapshot(records(), { stateDirectory: insideSource }))
        .toThrow(/BUG_ATLAS_STATE_ROOT_INSIDE_REPOSITORY/);
      expect(fs.existsSync(insideSource), 'a refused state root was created under source').toBe(false);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
      fs.rmSync(insideSource, { recursive: true, force: true });
    }
  });

  test('a normal save and load still round-trips, and replaces an existing snapshot', () => {
    const { base, stateRoot } = fixture();
    try {
      const first = saveBugAtlasSnapshot(records(), { stateDirectory: stateRoot });
      expect(first.records).toBe(2);
      expect(path.dirname(first.file)).toBe(stateRoot);
      expect(path.basename(first.file)).toBe(BUG_ATLAS_SNAPSHOT_FILE);
      expect(fs.lstatSync(first.file).mode & 0o777).toBe(0o600);
      expect(loadBugAtlasSnapshot({ stateDirectory: stateRoot }).records).toHaveLength(2);

      // A snapshot is mutable state: replacement is intended and explicit.
      const second = saveBugAtlasSnapshot(bugAtlasFixtureCorpus().slice(0, 1), { stateDirectory: stateRoot });
      expect(second.file).toBe(first.file);
      expect(loadBugAtlasSnapshot({ stateDirectory: stateRoot }).records).toHaveLength(1);

      // No temporary survives a successful publish.
      expect(fs.readdirSync(stateRoot)).toEqual([BUG_ATLAS_SNAPSHOT_FILE]);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('a republish replaces the file by rename, never truncating it in place', () => {
    // The observable signature of atomic publication. A direct
    // `writeFileSync` on the destination truncates and rewrites the SAME
    // inode, so a reader holding the old file — or an interrupted write —
    // sees a partial snapshot. A same-directory temporary published by
    // `rename` always yields a DIFFERENT inode, and a reader either sees the
    // complete previous file or the complete new one.
    const { base, stateRoot } = fixture();
    try {
      const first = saveBugAtlasSnapshot(records(), { stateDirectory: stateRoot });
      const firstInode = fs.statSync(first.file).ino;
      const second = saveBugAtlasSnapshot(bugAtlasFixtureCorpus().slice(0, 1), { stateDirectory: stateRoot });
      expect(second.file).toBe(first.file);
      expect(fs.statSync(second.file).ino, 'the destination was truncated in place').not.toBe(firstInode);
      expect(fs.readdirSync(stateRoot)).toEqual([BUG_ATLAS_SNAPSHOT_FILE]);
      expect(loadBugAtlasSnapshot({ stateDirectory: stateRoot }).records).toHaveLength(1);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('control: a record that cannot be normalised leaves the previous snapshot intact', () => {
    // Labelled a control on purpose: normalisation runs before publication, so
    // this case passes against the pre-repair code too. It guards the ordering,
    // not the atomicity.
    const { base, stateRoot } = fixture();
    try {
      saveBugAtlasSnapshot(records(), { stateDirectory: stateRoot });
      const before = fs.readFileSync(path.join(stateRoot, BUG_ATLAS_SNAPSHOT_FILE), 'utf8');
      expect(() => saveBugAtlasSnapshot([{ not: 'a record' }], { stateDirectory: stateRoot })).toThrow();
      expect(fs.readFileSync(path.join(stateRoot, BUG_ATLAS_SNAPSHOT_FILE), 'utf8')).toBe(before);
      expect(fs.readdirSync(stateRoot)).toEqual([BUG_ATLAS_SNAPSHOT_FILE]);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('the default snapshot name is still the frozen one', () => {
    const { base, stateRoot } = fixture();
    try {
      expect(BUG_ATLAS_SNAPSHOT_FILE).toBe('bug-atlas-snapshot.json');
      expect(snapshotFilePath({ stateDirectory: stateRoot }))
        .toBe(path.join(stateRoot, 'bug-atlas-snapshot.json'));
      // An explicit safe name is still accepted.
      expect(snapshotFilePath({ stateDirectory: stateRoot, fileName: 'alternate-snapshot.json' }))
        .toBe(path.join(stateRoot, 'alternate-snapshot.json'));
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });
});
