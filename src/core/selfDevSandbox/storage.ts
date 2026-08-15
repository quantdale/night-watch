// ---------------------------------------------------------------------------
// Nightwatch Phase 8B — private immutable plan/result storage.
//
// Mirrors the existing self-development namespace pattern
// (privateArtifactRoot() + a fixed subdirectory) rather than introducing a
// sibling top-level `~/.nightwatch/selfdev-adoption/` root, for consistency
// with how src/core/selfDev/storage.ts already anchors its namespace.
// Writes are exact-ID, atomic, no-replace; there is no list/enumeration/
// latest lookup and no replacement-capable write path.
// ---------------------------------------------------------------------------

import path from 'node:path';
import { PrivateArtifactStore, privateArtifactRoot } from '../policy/privateArtifacts';
import { validateAdoptionPlan, validateAdoptionSandboxResult } from './validation';
import type { SelfDevAdoptionPlan, SelfDevAdoptionSandboxResult } from './types';

export const SELFDEV_SANDBOX_NAMESPACE = 'selfdev-adoption' as const;

export interface SelfDevSandboxStoreOptions {
  readonly root?: string;
  readonly readOnly?: boolean;
}

function safeFileName(id: string, prefix: string): string {
  // Private artifact file names must match [A-Za-z0-9][A-Za-z0-9._-]{0,160}\.json
  // and content-addressed IDs contain ':'; map to a filesystem-safe form.
  const mapped = id.replace(/:/g, '-');
  return `${prefix}-${mapped}.json`;
}

function stripStatus(value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const { status: _status, ...rest } = value as Record<string, unknown>;
    return rest;
  }
  return value;
}

export class SelfDevAdoptionPlanStore {
  readonly store: PrivateArtifactStore;

  constructor(options: SelfDevSandboxStoreOptions = {}) {
    this.store = new PrivateArtifactStore({
      root: options.root ?? path.join(privateArtifactRoot(), SELFDEV_SANDBOX_NAMESPACE, 'plans'),
      createIfMissing: options.readOnly !== true,
    });
  }

  /** Idempotent on an exact duplicate; throws on a same-ID content conflict. */
  writePlan(plan: SelfDevAdoptionPlan): 'CREATED' | 'EXACT_DUPLICATE' {
    const fileName = safeFileName(plan.planId, 'plan');
    try {
      this.store.writeImmutableJson(fileName, plan);
      return 'CREATED';
    } catch (error) {
      if (error instanceof Error && error.message === 'PRIVATE_ARTIFACT_IMMUTABLE') {
        const existing = validateAdoptionPlan(stripStatus(this.store.readJson(fileName)));
        if (existing.planId !== plan.planId || JSON.stringify(existing) !== JSON.stringify(plan)) throw new Error('SELFDEV_SANDBOX_PLAN_CONFLICT');
        return 'EXACT_DUPLICATE';
      }
      throw error;
    }
  }

  /** Exact plan ID only. No list, latest, or enumeration. */
  readPlan(planId: string): SelfDevAdoptionPlan {
    const fileName = safeFileName(planId, 'plan');
    const raw = this.store.readJson(fileName);
    if (raw === null) throw new Error('SELFDEV_SANDBOX_PLAN_NOT_FOUND');
    const plan = validateAdoptionPlan(stripStatus(raw));
    if (plan.planId !== planId) throw new Error('SELFDEV_SANDBOX_PLAN_ID_MISMATCH');
    return plan;
  }
}

export class SelfDevAdoptionResultStore {
  readonly store: PrivateArtifactStore;

  constructor(options: SelfDevSandboxStoreOptions = {}) {
    this.store = new PrivateArtifactStore({
      root: options.root ?? path.join(privateArtifactRoot(), SELFDEV_SANDBOX_NAMESPACE, 'results'),
      createIfMissing: options.readOnly !== true,
    });
  }

  writeResult(result: SelfDevAdoptionSandboxResult): 'CREATED' | 'EXACT_DUPLICATE' {
    const fileName = safeFileName(result.resultId, 'result');
    try {
      this.store.writeImmutableJson(fileName, result);
      return 'CREATED';
    } catch (error) {
      if (error instanceof Error && error.message === 'PRIVATE_ARTIFACT_IMMUTABLE') {
        const existing = validateAdoptionSandboxResult(stripStatus(this.store.readJson(fileName)));
        if (existing.resultId !== result.resultId || JSON.stringify(existing) !== JSON.stringify(result)) throw new Error('SELFDEV_SANDBOX_RESULT_CONFLICT');
        return 'EXACT_DUPLICATE';
      }
      throw error;
    }
  }

  readResult(resultId: string): SelfDevAdoptionSandboxResult {
    const fileName = safeFileName(resultId, 'result');
    const raw = this.store.readJson(fileName);
    if (raw === null) throw new Error('SELFDEV_SANDBOX_RESULT_NOT_FOUND');
    const result = validateAdoptionSandboxResult(stripStatus(raw));
    if (result.resultId !== resultId) throw new Error('SELFDEV_SANDBOX_RESULT_ID_MISMATCH');
    return result;
  }
}
