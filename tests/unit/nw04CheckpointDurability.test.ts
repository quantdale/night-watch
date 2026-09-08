import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  CHECKPOINT_GENERATION_FIELD,
  CHECKPOINT_SUPERSEDED_SUFFIX,
  CheckpointStoreError,
  MAX_CHECKPOINT_BYTES,
  listCheckpointTemporaries,
  publishCheckpointDocument,
  readCheckpointDocument,
  storedCheckpointGeneration,
  supersedeStoredCheckpoint,
} from '../../src/core/agentRuntime/checkpointStore';
import { loadLocalCampaignCheckpoint } from '../../src/core/agentRuntime/localCampaign';

/**
 * NW-04. The local campaign store published checkpoints with a direct
 * `writeFileSync` onto the destination, read and decoded them with no size
 * bound, and deleted an existing same-id checkpoint before any new durable
 * progress existed.
 *
 * The crash matrix is driven through the publication primitive's injection
 * hooks. Those hooks exist only in this module's signature: no campaign input
 * DTO, CLI flag or config file carries them, so a reasoner cannot reach them.
 */

// Deliberately shares no vocabulary with the diagnostics, the module name or
// the test path. An earlier value contained "CHECKPOINT", so an eight-character
// window of it matched the error CODE `CHECKPOINT_CORRUPT` and the fragment
// search reported a leak that was not one.
const PLANTED = 'ZZQQ7_XYLOPHONE_eyJhbGciOiJIUzI1NiJ9_MARMALADE_74';

interface Fixture {
  readonly base: string;
  readonly directory: string;
  readonly file: string;
}

function fixture(): Fixture {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'nw04-checkpoint-'));
  const directory = path.join(base, 'campaigns');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  return { base, directory, file: path.join(directory, 'synthetic.checkpoint.json') };
}

function document(marker: string): Record<string, unknown> {
  return { schemaVersion: 'synthetic.v1', campaignId: 'synthetic', marker };
}

/** Everything a thrown error could carry. */
function thrownText(run: () => unknown): string {
  try {
    run();
    return '';
  } catch (error) {
    const parts = [String((error as Error)?.message ?? ''), String((error as Error)?.stack ?? '')];
    try {
      parts.push(JSON.stringify(error, Object.getOwnPropertyNames(error as object)));
    } catch {
      // A payload that cannot be serialised is not a reason to skip the rest.
    }
    return parts.join('\n');
  }
}

test.describe('NW-04 — bounded, generation-bearing, crash-safe checkpoints', () => {
  test('generations start at one and advance monotonically', () => {
    const { base, directory, file } = fixture();
    try {
      expect(storedCheckpointGeneration(file)).toBe(0);
      const first = publishCheckpointDocument(directory, file, document('one'));
      expect(first.generation).toBe(1);
      expect(readCheckpointDocument(file)?.[CHECKPOINT_GENERATION_FIELD]).toBe(1);
      const second = publishCheckpointDocument(directory, file, document('two'));
      expect(second.generation).toBe(2);
      expect(readCheckpointDocument(file)?.marker).toBe('two');
      expect(fs.lstatSync(file).mode & 0o777).toBe(0o600);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('a pre-NW-04 checkpoint without a generation still reads and advances', () => {
    // Old-reader compatibility in both directions: an existing document with
    // no generation field must load, and the next write must not restart the
    // sequence in a way that loses the ordering.
    const { base, directory, file } = fixture();
    try {
      fs.writeFileSync(file, `${JSON.stringify(document('legacy'))}\n`, { mode: 0o600 });
      expect(storedCheckpointGeneration(file)).toBe(0);
      expect(readCheckpointDocument(file)?.marker).toBe('legacy');
      const published = publishCheckpointDocument(directory, file, document('modern'));
      expect(published.generation).toBe(1);
      expect(readCheckpointDocument(file)?.marker).toBe('modern');
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('a crash at every publication step leaves ONE complete generation', () => {
    for (const step of ['afterStage', 'beforeRename', 'afterRename'] as const) {
      const { base, directory, file } = fixture();
      try {
        publishCheckpointDocument(directory, file, document('previous'));
        const before = fs.readFileSync(file, 'utf8');

        const crashed = () => publishCheckpointDocument(directory, file, document('next'), {
          [step]: () => {
            throw new Error(`SYNTHETIC_CRASH_${step}`);
          },
        });
        expect(crashed, `${step}: the injected crash must surface`).toThrow(`SYNTHETIC_CRASH_${step}`);

        // Either the complete previous document, or the complete next one.
        const after = readCheckpointDocument(file);
        expect(after, `${step}: the checkpoint disappeared`).not.toBeNull();
        const marker = after?.marker;
        expect(['previous', 'next'], `${step}: marker was ${String(marker)}`).toContain(marker);
        if (step === 'afterRename') {
          // The rename had already happened, so the NEW generation is visible
          // and complete.
          expect(marker).toBe('next');
          expect(after?.[CHECKPOINT_GENERATION_FIELD]).toBe(2);
        } else {
          // The rename had not happened, so the previous bytes are untouched.
          expect(marker).toBe('previous');
          expect(fs.readFileSync(file, 'utf8')).toBe(before);
        }
        // No partial file and no temporary residue either way.
        expect(listCheckpointTemporaries(directory), `${step}: a temporary survived`).toEqual([]);
        expect(fs.readdirSync(directory)).toEqual(['synthetic.checkpoint.json']);
      } finally {
        fs.rmSync(base, { recursive: true, force: true });
      }
    }
  });

  test('a competing same-id writer is refused, not silently clobbered', () => {
    const { base, directory, file } = fixture();
    try {
      publishCheckpointDocument(directory, file, document('generation-one'));
      // Interleave a second writer exactly where the race lives: after our
      // bytes are staged, before our rename.
      const conflicted = () => publishCheckpointDocument(directory, file, document('loser'), {
        afterStage: () => {
          publishCheckpointDocument(directory, file, document('winner'));
        },
      });
      expect(conflicted).toThrow(/CHECKPOINT_GENERATION_CONFLICT/);
      // The winner's document is intact and complete; the loser wrote nothing.
      const stored = readCheckpointDocument(file);
      expect(stored?.marker).toBe('winner');
      expect(stored?.[CHECKPOINT_GENERATION_FIELD]).toBe(2);
      expect(listCheckpointTemporaries(directory)).toEqual([]);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('a republish replaces by rename, never truncating in place', () => {
    const { base, directory, file } = fixture();
    try {
      publishCheckpointDocument(directory, file, document('one'));
      const firstInode = fs.statSync(file).ino;
      publishCheckpointDocument(directory, file, document('two'));
      expect(fs.statSync(file).ino, 'the checkpoint was truncated in place').not.toBe(firstInode);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('an oversized stored file is refused before it is read', () => {
    const { base, directory, file } = fixture();
    try {
      // Written directly, so the guard is measured against a real oversized
      // file rather than against the publisher's own cap.
      const oversized = Buffer.alloc(MAX_CHECKPOINT_BYTES + 1024, 'x');
      fs.writeFileSync(file, oversized, { mode: 0o600 });
      const thrown = thrownText(() => readCheckpointDocument(file));
      expect(thrown).toMatch(/CHECKPOINT_OVERSIZED/);
      expect(thrown).toMatch(/bytes=/);
      // The file is preserved for the owner, not deleted to make reads succeed.
      expect(fs.existsSync(file)).toBe(true);
      expect(fs.statSync(file).size).toBe(oversized.byteLength);
      // And publishing something oversized is refused too.
      const huge = { schemaVersion: 'synthetic.v1', blob: 'y'.repeat(MAX_CHECKPOINT_BYTES) };
      expect(() => publishCheckpointDocument(directory, path.join(directory, 'other.checkpoint.json'), huge))
        .toThrow(/CHECKPOINT_OVERSIZED/);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('corrupt state is preserved, refused, and reported without content', () => {
    const { base, directory, file } = fixture();
    try {
      const corrupt = `{"schemaVersion":"synthetic.v1","secret":"${PLANTED}" oops`;
      fs.writeFileSync(file, corrupt, { mode: 0o600 });

      const readThrown = thrownText(() => readCheckpointDocument(file));
      expect(readThrown).toMatch(/CHECKPOINT_CORRUPT/);
      expect(readThrown, 'the corrupt checkpoint leaked its own bytes').not.toContain(PLANTED);
      for (let start = 0; start + 8 <= PLANTED.length; start += 1) {
        expect(readThrown).not.toContain(PLANTED.slice(start, start + 8));
      }

      // A corrupt predecessor must not be treated as an empty slot and
      // overwritten: the owner's evidence stays put.
      expect(() => publishCheckpointDocument(directory, file, document('replacement')))
        .toThrow(/CHECKPOINT_CORRUPT/);
      expect(fs.readFileSync(file, 'utf8')).toBe(corrupt);
      expect(listCheckpointTemporaries(directory)).toEqual([]);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('a truncated document is corrupt, not a valid empty checkpoint', () => {
    const { base, directory, file } = fixture();
    try {
      publishCheckpointDocument(directory, file, document('complete'));
      const full = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, full.slice(0, Math.floor(full.length / 2)), { mode: 0o600 });
      expect(() => readCheckpointDocument(file)).toThrow(/CHECKPOINT_CORRUPT/);
      // A JSON array or scalar is also not a checkpoint document.
      fs.writeFileSync(file, '[]\n', { mode: 0o600 });
      expect(() => readCheckpointDocument(file)).toThrow(/CHECKPOINT_CORRUPT/);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('a symlinked destination or state component is refused', () => {
    const { base, directory, file } = fixture();
    try {
      const outside = path.join(base, 'outside.json');
      fs.writeFileSync(outside, 'SENTINEL\n');
      fs.symlinkSync(outside, file);
      expect(() => publishCheckpointDocument(directory, file, document('escape')))
        .toThrow(/CHECKPOINT_STATE_SYMLINK_REFUSED|CHECKPOINT_DESTINATION_UNSAFE/);
      expect(fs.readFileSync(outside, 'utf8')).toBe('SENTINEL\n');
      expect(() => readCheckpointDocument(file))
        .toThrow(/CHECKPOINT_STATE_SYMLINK_REFUSED|CHECKPOINT_DESTINATION_UNSAFE/);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('a checkpoint outside the state directory is refused', () => {
    const { base, directory } = fixture();
    try {
      expect(() => publishCheckpointDocument(directory, path.join(base, 'escape.checkpoint.json'), document('x')))
        .toThrow(/CHECKPOINT_DESTINATION_UNSAFE/);
      expect(fs.existsSync(path.join(base, 'escape.checkpoint.json'))).toBe(false);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });

  test('superseding moves the previous generation aside instead of destroying it', () => {
    const { base, directory, file } = fixture();
    try {
      publishCheckpointDocument(directory, file, document('previous-run'));
      const moved = supersedeStoredCheckpoint(directory, file);
      expect(moved).toBe(`${file}${CHECKPOINT_SUPERSEDED_SUFFIX}`);
      expect(fs.existsSync(file)).toBe(false);
      // The owner's previous progress is still readable.
      expect(readCheckpointDocument(moved as string)?.marker).toBe('previous-run');
      // Exactly one superseded document is retained per id.
      publishCheckpointDocument(directory, file, document('fresh-run'));
      supersedeStoredCheckpoint(directory, file);
      expect(fs.readdirSync(directory).filter((name) => name.endsWith(CHECKPOINT_SUPERSEDED_SUFFIX)))
        .toEqual(['synthetic.checkpoint.json.superseded']);
      expect(readCheckpointDocument(`${file}${CHECKPOINT_SUPERSEDED_SUFFIX}`)?.marker).toBe('fresh-run');
      // Superseding nothing is not an error.
      expect(supersedeStoredCheckpoint(directory, file)).toBeNull();
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });


  /**
   * The measurement that distinguishes the repair from the defect, through the
   * CONSUMER's public entry point rather than the new module's. A test that
   * only exercises the replacement primitive cannot fail against the code it
   * replaced.
   */
  test('the campaign loader bounds oversized state and reports corruption without content', () => {
    const { base, directory, file } = fixture();
    const campaignDirectory = path.join(base, 'campaign-state');
    fs.mkdirSync(campaignDirectory, { recursive: true, mode: 0o700 });
    const campaignFile = path.join(campaignDirectory, 'nw04-synthetic.checkpoint.json');
    try {
      // 1. Oversized. The pre-repair loader read and decoded the whole file
      //    with no bound; it must now be refused from the stat alone.
      fs.writeFileSync(campaignFile, Buffer.alloc(MAX_CHECKPOINT_BYTES + 1024, 'x'), { mode: 0o600 });
      const oversized = thrownText(() => loadLocalCampaignCheckpoint('nw04-synthetic', campaignDirectory));
      expect(oversized).toMatch(/CHECKPOINT_OVERSIZED/);
      expect(fs.existsSync(campaignFile), 'oversized state was destroyed').toBe(true);

      // 2. Corrupt with planted content. The pre-repair loader let a native
      //    SyntaxError carry a window of the checkpoint's own bytes.
      const corrupt = `{"schemaVersion":"nightwatch.agent-checkpoint.v1","secret":"${PLANTED}" oops`;
      fs.writeFileSync(campaignFile, corrupt, { mode: 0o600 });
      const leaked = thrownText(() => loadLocalCampaignCheckpoint('nw04-synthetic', campaignDirectory));
      expect(leaked).toMatch(/CHECKPOINT_CORRUPT/);
      expect(leaked, 'the loader leaked checkpoint content').not.toContain(PLANTED);
      for (let start = 0; start + 8 <= PLANTED.length; start += 1) {
        expect(leaked).not.toContain(PLANTED.slice(start, start + 8));
      }
      expect(fs.readFileSync(campaignFile, 'utf8'), 'corrupt state was destroyed').toBe(corrupt);
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
      expect(fs.existsSync(file)).toBe(false);
      expect(fs.existsSync(directory)).toBe(false);
    }
  });

  test('the store error class is typed, so callers can dispatch on it', () => {
    const { base, directory, file } = fixture();
    try {
      fs.writeFileSync(file, 'not json', { mode: 0o600 });
      try {
        readCheckpointDocument(file);
        throw new Error('the read should have failed');
      } catch (error) {
        expect(error).toBeInstanceOf(CheckpointStoreError);
        expect((error as CheckpointStoreError).code).toBe('CHECKPOINT_CORRUPT');
      }
      expect(directory).toContain('campaigns');
    } finally {
      fs.rmSync(base, { recursive: true, force: true });
    }
  });
});
