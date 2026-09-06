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
import { extractPreFixSnapshot } from './preFixSource';

const REPO_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SHA_RE = /^[0-9a-f]{7,40}$/i;

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
    knownFailingTest: isolated(record.testsAdded[0] ?? null, haystack),
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
    });
  } catch {
    return null;
  }
}
