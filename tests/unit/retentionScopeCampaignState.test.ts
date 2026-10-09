// ---------------------------------------------------------------------------
// X-11 (M10 11.3) — the documented retention scope of the campaign-state subtree.
//
// The repository's `artifacts/` tree has a retention capability
// (`bin/evidence-retention.mjs`: refusal-first, owner-applied, never a silent
// sweep). The owner-local `campaign-state/` subtree — the orchestrator's
// manifests, checkpoints, retry and replay ledgers, measured in the audit at
// 43.6 MB across 57 run directories a clean clone does not have — had NO
// documented retention scope, so nothing could say whether a checkpoint was
// load-bearing evidence or a removable by-product.
//
// This suite pins the scope in both directions: every named private directory
// carries one, `campaign-state` carries the specific one recorded here, an
// unknown directory is refused, and the scope is published on the policy record
// a store actually returns. The structural invariant (a directory that loses
// its scope fails `checkReviewStoreBoundary`) is pinned by the M-21/M-21b
// mutations in tests/unit/reviewStoreHardening.test.ts.
//
// Pure plus one temp roots: a PrivateArtifactStore under an injected root.
// No network, no DEV, no credentials, no real owner-local state.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';

import {
  PRIVATE_ARTIFACT_DIRECTORIES,
  PRIVATE_RETENTION_REFUSAL_ORDER,
  PRIVATE_RETENTION_POLICY,
  PRIVATE_RETENTION_SCOPES,
  PrivateArtifactStore,
  privateRetentionScopeFor,
  type PrivateArtifactDirectory,
} from '../../src/core/policy/privateArtifacts';

const REPO_ROOT = path.resolve(__dirname, '../..');
const POLICY_SOURCE_PATH = path.join(REPO_ROOT, 'src/core/policy/privateArtifacts.ts');

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-retention-scope-'));
}

test.describe('X-11 — the campaign-state subtree has a documented retention scope', () => {
  test('every named private directory carries a retention scope', () => {
    const scopeKeys = Object.keys(PRIVATE_RETENTION_SCOPES).sort();
    expect(scopeKeys).toEqual([...PRIVATE_ARTIFACT_DIRECTORIES].sort());
    for (const directory of PRIVATE_ARTIFACT_DIRECTORIES) {
      expect(PRIVATE_RETENTION_SCOPES[directory], `${directory} has no documented retention scope`).toBeDefined();
    }
  });

  test('the campaign-state scope is the one recorded, not a silent default', () => {
    const scope = privateRetentionScopeFor('campaign-state');
    expect(scope.autoDelete).toBe(false);
    expect(scope.removalAuthority).toBe('OWNER_EXPLICIT_APPLY');
    expect(scope.removalGranularity).toBe('WHOLE_DOCUMENT');
    expect(scope.unmeasurableRefused).toBe(true);
    // Refusal-first: referenced documents are refused BEFORE anything else,
    // because tracked state naming a checkpoint makes it load-bearing evidence
    // regardless of its age or size.
    expect([...scope.refusalOrder]).toEqual([...PRIVATE_RETENTION_REFUSAL_ORDER]);
    expect(scope.refusalOrder[0]).toBe('REFUSED_REFERENCED');
    // The sibling directory is covered too, and by the same refusal order.
    expect(privateRetentionScopeFor('agent-findings').removalAuthority).toBe('OWNER_EXPLICIT_APPLY');
  });

  test('an unknown or undocumented directory is refused, never assumed', () => {
    expect(() => privateRetentionScopeFor('campaign-state-typo' as never)).toThrow('PRIVATE_ARTIFACT_DIRECTORY_UNKNOWN');
    // The vocabulary is the whole path-safety argument, so a name that slips
    // past the union must still fail closed rather than resolve a scope.
    const directories = PRIVATE_ARTIFACT_DIRECTORIES as readonly string[];
    expect(directories).toContain('campaign-state');
    expect(directories).not.toContain('artifacts');
  });

  test('the scope is published on the policy record a store returns', () => {
    const root = tempRoot();
    try {
      const store = new PrivateArtifactStore({ root, directory: 'campaign-state' });
      expect(store.policy.retention.directoryScopes['campaign-state']).toEqual(privateRetentionScopeFor('campaign-state'));
      expect(store.policy.storageClass).toBe('OWNER_ONLY_LOCAL');
      expect(store.policy.externalPublication).toBe('PROHIBITED');
      // The findings-root rules this scope sits beside are unchanged.
      expect(store.policy.retention.autoDeleteActiveFindings).toBe(false);
      expect(store.policy.retention.unresolvedFindingsOwnerControlled).toBe(true);
      expect(PRIVATE_RETENTION_POLICY.directoryScopes).toBe(PRIVATE_RETENTION_SCOPES);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('the X-11 reasoning is recorded beside the vocabulary it governs', () => {
    const text = fs.readFileSync(POLICY_SOURCE_PATH, 'utf8');
    // The recorded defect and the recorded decision, in the source that the
    // hardening rule reads: a reader must find out WHY campaign-state gained a
    // scope without opening the audit.
    expect(text).toContain('X-11');
    expect(text).toContain('documented retention scope');
    expect(text).toContain('OWNER_EXPLICIT_APPLY');
    expect(text).toContain('campaign-state');
  });

  test('no retention scope can be an automatic sweep, in either direction', () => {
    for (const directory of PRIVATE_ARTIFACT_DIRECTORIES) {
      const scope = PRIVATE_RETENTION_SCOPES[directory];
      expect(scope.autoDelete, `${directory} must never be automatically deleted`).toBe(false);
      expect(scope.removalAuthority, `${directory} removal authority`).toBe('OWNER_EXPLICIT_APPLY');
      expect(scope.refusalOrder.length).toBe(4);
    }
  });
});
