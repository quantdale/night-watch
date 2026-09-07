// ---------------------------------------------------------------------------
// Wave 4 — convert a mined Bug Atlas record into a leak-free replay case.
//
// Visible material is the pre-fix snapshot only. The fix commit message,
// SHA, locator, and symptom text stay in hidden ground truth and are refused
// when they already appear in the snapshot (cannot isolate).
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import type { BugAtlasRecord } from '../agentProtocol/atlas';
import { detectBenchmarkLeakage } from '../agentProtocol/benchmark';
import { defineBenchmarkCase, type DefinedBenchmarkCase } from './case';
import { extractPreFixSnapshot, parsePreFixSnapshotFiles, type PreFixSnapshot } from './preFixSource';
import {
  MINED_TEST_REPLAY_VERSION,
  packageDirForTestPath,
  parseMinedTestReplayDescriptor,
  type MinedTestReplayDescriptor,
} from './containedTestReplay';

const REPO_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SHA_RE = /^[0-9a-f]{7,40}$/i;
const ADDED_TEST_FILE_RE =
  /(?:^|\/)(?:[^/]+_test\.go|[^/]+\.test\.[cm]?[jt]sx?|[^/]+\.spec\.[cm]?[jt]sx?|test_[^/]+\.py)$/i;

export function resolveMinedRepoPath(repositoriesRoot: string, repository: string | null): string | null {
  if (typeof repository !== 'string' || !REPO_ID_RE.test(repository)) return null;
  const resolved = path.resolve(repositoriesRoot, repository);
  try {
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink() || !stat.isDirectory()) return null;
  } catch {
    return null;
  }
  return resolved;
}

function isolated(value: string | null, haystack: string): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (haystack.includes(value)) return null;
  return value;
}

/** Test path added in the fix (not present in the pre-fix snapshot). Hidden-only. */
function firstAddedTestPath(extracted: PreFixSnapshot): string | null {
  if (extracted.status !== 'EXTRACTED') return null;
  const snapshot = parsePreFixSnapshotFiles(extracted.snapshot);
  for (const file of extracted.files) {
    if (!ADDED_TEST_FILE_RE.test(file)) continue;
    if (snapshot.has(file)) continue;
    return file;
  }
  return null;
}

export function tryDefineMinedBenchmarkCase(
  record: BugAtlasRecord,
  repoPath: string,
): DefinedBenchmarkCase | null {
  const sha = record.provenance.sourceSha;
  if (typeof sha !== 'string' || !SHA_RE.test(sha)) return null;
  const extracted = extractPreFixSnapshot(repoPath, sha);
  if (extracted.status !== 'EXTRACTED' || extracted.snapshot.length === 0) return null;
  if (extracted.snapshot.includes(sha)) return null;

  const haystack = extracted.snapshot;
  const hidden = {
    fixCommit: sha,
    fixDiff: isolated(record.fixLocator, haystack),
    issueTitle: null,
    bugDescription: isolated(record.symptom, haystack),
    knownFailingTest: isolated(record.testsAdded[0] ?? firstAddedTestPath(extracted), haystack),
    explanation: isolated(record.rootCause, haystack) ?? isolated(record.symptom, haystack),
  };
  const leaked = detectBenchmarkLeakage(
    {
      blobs: [
        'inspect the listed pre-fix files for anomalies',
        haystack,
        'observe pre-fix blobs only',
      ],
    },
    hidden,
  );
  if (leaked.length > 0) return null;

  const caseId = `mined-${record.bugId}`.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 80);
  if (caseId.length < 8) return null;
  // Hidden-only contained-replay coordinates: the isolated added test file
  // (null when no added test survived isolation). The descriptor is never
  // part of the visible context; defineBenchmarkCase re-proves its secrets
  // are absent from the visible blobs.
  let minedReplay: MinedTestReplayDescriptor | null = null;
  if (typeof hidden.knownFailingTest === 'string' && typeof record.repository === 'string') {
    minedReplay = parseMinedTestReplayDescriptor({
      schemaVersion: MINED_TEST_REPLAY_VERSION,
      repository: record.repository,
      fixCommit: sha,
      testPath: hidden.knownFailingTest,
      packageDir: packageDirForTestPath(hidden.knownFailingTest),
    });
  }
  try {
    return defineBenchmarkCase({
      caseId,
      productFamily: record.product ?? record.repository ?? 'unknown',
      category: 'backend',
      hidden,
      preFix: {
        symptomReport: 'inspect the listed pre-fix files for anomalies',
        sourceSnapshot: extracted.snapshot,
        reproSteps: 'observe pre-fix blobs only',
      },
      minedReplay,
    });
  } catch {
    return null;
  }
}
