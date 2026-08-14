import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { PrivateArtifactStore } from '../../src/core/policy/privateArtifacts';
import { runNodeRace } from './support/crossProcessRace';

const ROOT = path.resolve(__dirname, '../..');
const CHILD = path.join(ROOT, 'tests', 'fixtures', 'private-artifact-race-child.mjs');

function temporaryRoot(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.chmodSync(root, 0o700);
  return root;
}

function cleanup(root: string): void {
  fs.rmSync(root, { recursive: true, force: true });
}

function privateFileNames(root: string): string[] {
  return fs.readdirSync(root).filter((file) => file.endsWith('.tmp'));
}

function replaceablePayload(value: string): { readonly candidate: string } {
  return { candidate: value };
}

test.describe('Phase 7B.2.1 atomic private publication', () => {
  test('first complete publication wins and a later immutable attempt cannot replace it', () => {
    const root = temporaryRoot('nightwatch-private-atomic-');
    try {
      const first = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
      const second = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
      const destination = 'same-destination.json';
      first.writeImmutableJson(destination, replaceablePayload('first'));
      expect(() => second.writeImmutableJson(destination, replaceablePayload('second'))).toThrow('PRIVATE_ARTIFACT_IMMUTABLE');
      const bytes = fs.readFileSync(path.join(root, destination), 'utf8');
      expect(bytes).toBe(JSON.stringify({ candidate: 'first', status: 'READY' }, null, 2) + '\n');
      expect(() => JSON.parse(bytes)).not.toThrow();
      expect(fs.statSync(root).mode & 0o777).toBe(0o700);
      expect(fs.statSync(path.join(root, destination)).mode & 0o777).toBe(0o600);
      if (process.getuid !== undefined) expect(fs.statSync(path.join(root, destination)).uid).toBe(process.getuid());
      expect(privateFileNames(root)).toEqual([]);
    } finally {
      cleanup(root);
    }
  });

  test('privacy validation happens before temporary-file creation and non-immutable replacement remains available', () => {
    const root = temporaryRoot('nightwatch-private-policy-');
    try {
      const store = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
      expect(() => store.writeImmutableJson('blocked.json', { CUSTOMER_SENTINEL: 'synthetic-only' })).toThrow('PRIVATE_ARTIFACT_PRIVACY_BLOCKED');
      expect(fs.readdirSync(root)).toEqual([]);
      store.writeJson('replaceable.json', replaceablePayload('before'));
      store.writeIncomplete('replaceable.json', replaceablePayload('after'));
      expect(JSON.parse(fs.readFileSync(path.join(root, 'replaceable.json'), 'utf8'))).toMatchObject({ candidate: 'after', status: 'INCOMPLETE' });
    } finally {
      cleanup(root);
    }
  });

  test('unsupported no-replace publication fails closed without a rename fallback', () => {
    const root = temporaryRoot('nightwatch-private-unsupported-');
    const store = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
    const fsModule = fs as unknown as { linkSync: typeof fs.linkSync };
    const original = fsModule.linkSync;
    fsModule.linkSync = (() => {
      const error = Object.assign(new Error('synthetic unsupported hard link'), { code: 'ENOTSUP' });
      throw error;
    }) as typeof fs.linkSync;
    try {
      expect(() => store.writeImmutableJson('unsupported.json', replaceablePayload('payload'))).toThrow('PRIVATE_ARTIFACT_NO_REPLACE_UNSUPPORTED');
      expect(fs.existsSync(path.join(root, 'unsupported.json'))).toBe(false);
      expect(privateFileNames(root)).toEqual([]);
    } finally {
      fsModule.linkSync = original;
      cleanup(root);
    }
  });

  test('directory fsync failure does not remove the already-created winner', () => {
    const root = temporaryRoot('nightwatch-private-dir-fsync-');
    const store = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
    const fsModule = fs as unknown as { fsyncSync: typeof fs.fsyncSync };
    const original = fsModule.fsyncSync;
    fsModule.fsyncSync = ((descriptor: number) => {
      if (fs.fstatSync(descriptor).isDirectory()) throw new Error('synthetic directory fsync failure');
      original(descriptor);
    }) as typeof fs.fsyncSync;
    try {
      expect(() => store.writeImmutableJson('dir-fsync.json', replaceablePayload('winner'))).toThrow('PRIVATE_ARTIFACT_DIRECTORY_FSYNC_FAILED');
      expect(JSON.parse(fs.readFileSync(path.join(root, 'dir-fsync.json'), 'utf8'))).toMatchObject({ candidate: 'winner', status: 'READY' });
      expect(privateFileNames(root)).toEqual([]);
    } finally {
      fsModule.fsyncSync = original;
      cleanup(root);
    }
  });

  test('write failure before publication cleans the temporary and leaves no destination', () => {
    const root = temporaryRoot('nightwatch-private-write-failure-');
    const store = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
    const fsModule = fs as unknown as { writeFileSync: typeof fs.writeFileSync };
    const original = fsModule.writeFileSync;
    fsModule.writeFileSync = (() => { throw new Error('synthetic write failure'); }) as typeof fs.writeFileSync;
    try {
      expect(() => store.writeImmutableJson('write-failure.json', replaceablePayload('payload'))).toThrow('synthetic write failure');
      expect(fs.existsSync(path.join(root, 'write-failure.json'))).toBe(false);
      expect(privateFileNames(root)).toEqual([]);
    } finally {
      fsModule.writeFileSync = original;
      cleanup(root);
    }
  });

  test('preexisting symlink is never followed or replaced', () => {
    const root = temporaryRoot('nightwatch-private-symlink-');
    const outside = temporaryRoot('nightwatch-private-symlink-target-');
    try {
      const target = path.join(outside, 'target.txt');
      fs.writeFileSync(target, 'synthetic target\n', { mode: 0o600 });
      const destination = path.join(root, 'symlink.json');
      fs.symlinkSync(target, destination);
      const store = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
      expect(() => store.writeImmutableJson('symlink.json', replaceablePayload('attacker'))).toThrow('PRIVATE_ARTIFACT_DESTINATION_SYMLINK');
      expect(fs.readFileSync(target, 'utf8')).toBe('synthetic target\n');
      expect(fs.lstatSync(destination).isSymbolicLink()).toBe(true);
    } finally {
      cleanup(root);
      cleanup(outside);
    }
  });

  test('a symlink inserted at the final publication race is not followed or replaced', () => {
    const root = temporaryRoot('nightwatch-private-raced-symlink-');
    try {
      const target = path.join(root, 'synthetic-target.txt');
      const destination = path.join(root, 'raced-symlink.json');
      fs.writeFileSync(target, 'synthetic target\n', { encoding: 'utf8', mode: 0o600 });
      const store = new PrivateArtifactStore({ root, remotePrivacy: 'NO_REMOTE' });
      const fsModule = fs as unknown as { linkSync: typeof fs.linkSync };
      const original = fsModule.linkSync;
      fsModule.linkSync = ((temporary: fs.PathLike, finalPath: fs.PathLike) => {
        fs.symlinkSync(target, finalPath);
        return original(temporary, finalPath);
      }) as typeof fs.linkSync;
      try {
        expect(() => store.writeImmutableJson('raced-symlink.json', replaceablePayload('attacker'))).toThrow('PRIVATE_ARTIFACT_IMMUTABLE');
      } finally {
        fsModule.linkSync = original;
      }
      expect(fs.readFileSync(target, 'utf8')).toBe('synthetic target\n');
      expect(fs.lstatSync(destination).isSymbolicLink()).toBe(true);
      expect(privateFileNames(root)).toEqual([]);
    } finally {
      cleanup(root);
    }
  });

  test('two competing Node processes publish exactly one complete winner', async () => {
    const root = temporaryRoot('nightwatch-private-cross-process-');
    try {
      const labels = ['writer-a', 'writer-b'];
      const results = await runNodeRace({
        script: CHILD,
        labels,
        argsForLabel: (label, barrierRoot) => [root, barrierRoot, label, 'private', 'race.json', JSON.stringify(replaceablePayload(label === 'writer-a' ? 'process-a' : 'process-b'))],
      });
      expect(results.filter((result) => result.ok)).toHaveLength(1);
      expect(results.filter((result) => result.code === 'PRIVATE_ARTIFACT_IMMUTABLE')).toHaveLength(1);
      const persisted = JSON.parse(fs.readFileSync(path.join(root, 'race.json'), 'utf8')) as { candidate: string; status: string };
      expect(['process-a', 'process-b']).toContain(persisted.candidate);
      expect(persisted.status).toBe('READY');
      expect(fs.statSync(path.join(root, 'race.json')).mode & 0o777).toBe(0o600);
      expect(privateFileNames(root)).toEqual([]);
    } finally {
      cleanup(root);
    }
  });
});
