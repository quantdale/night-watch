// ---------------------------------------------------------------------------
// M5 (C-01/C-19) — the durable owner-local agent-findings store.
//
// Every mechanically admitted candidate is written atomically into the
// `agent-findings/` directory of the owner-local findings root BEFORE any
// campaign checkpoint is deleted, and a TERMINATED resume reads those records
// back verbatim instead of re-deriving admissions from absent history.
//
// This is the only module with filesystem authority over that directory, and
// it has no network, child-process, database, or AI authority. Publication is
// delegated to `PrivateArtifactStore`, so the owner-only / absolute /
// symlink-free / outside-the-repository contract is shared rather than
// re-implemented, and the nested directory comes from the closed
// `PRIVATE_ARTIFACT_DIRECTORIES` vocabulary, never from a caller-supplied path.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';

import { PrivateArtifactStore } from '../policy/privateArtifacts';
import {
  AGENT_FINDING_RECORD_ID_RE,
  agentFindingRecordPayload,
  validateAgentFindingRecord,
  type AgentFindingRecord,
} from './agentFindingRecord';

export const AGENT_FINDING_STORE_DIRECTORY = 'agent-findings' as const;

/** Bounded listing: the store never walks an unbounded directory. */
export const AGENT_FINDING_STORE_MAX_RECORDS = 512;

/** `afr-sha256-<24 hex>.json` — the pinned on-disk name shape. */
export const AGENT_FINDING_FILE_NAME_RE = /^afr-sha256-[0-9a-f]{24}\.json$/;

export type AgentFindingStoreErrorCode =
  | 'AGENT_FINDING_STORE_RECORD_INVALID'
  | 'AGENT_FINDING_STORE_IDENTITY_MISMATCH'
  | 'AGENT_FINDING_STORE_CORRUPT'
  | 'AGENT_FINDING_STORE_UNAVAILABLE'
  | 'AGENT_FINDING_STORE_WRITE_FAILED';

export class AgentFindingStoreError extends Error {
  readonly code: AgentFindingStoreErrorCode;
  readonly detail: string;

  constructor(code: AgentFindingStoreErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = 'AgentFindingStoreError';
    this.code = code;
    this.detail = detail;
  }
}

export function agentFindingRecordFileName(dossierId: string): string {
  if (typeof dossierId !== 'string' || !AGENT_FINDING_RECORD_ID_RE.test(dossierId)) {
    throw new AgentFindingStoreError(
      'AGENT_FINDING_STORE_RECORD_INVALID',
      'dossier id is not afr:sha256:<24 hex>',
    );
  }
  return `${dossierId.replace(/:/g, '-')}.json`;
}

export interface PersistedAgentFindingRecord {
  readonly dossierId: string;
  readonly candidateId: string;
  readonly campaignId: string;
  readonly fileName: string;
  /** True when an identical record was already stored (idempotent resume). */
  readonly alreadyPresent: boolean;
}

export interface AgentFindingStoreOptions {
  /** Injected root (tests only). Derived roots are held to the private policy. */
  readonly root?: string;
}

/**
 * Durable, content-addressed storage for admitted agent findings.
 */
export class AgentFindingStore {
  private readonly artifacts: PrivateArtifactStore;
  readonly root: string;

  constructor(options: AgentFindingStoreOptions = {}) {
    this.artifacts = new PrivateArtifactStore({
      root: options.root,
      subtree: 'findings',
      directory: AGENT_FINDING_STORE_DIRECTORY,
    });
    this.root = this.artifacts.root;
  }

  /** Fail-closed validation of one record before it can touch the disk. */
  private static validated(value: unknown): AgentFindingRecord {
    const validation = validateAgentFindingRecord(value);
    if (!validation.ok) {
      throw new AgentFindingStoreError(
        'AGENT_FINDING_STORE_RECORD_INVALID',
        validation.errors.map((error) => `${error.code}: ${error.detail}`).join('; '),
      );
    }
    return validation.record;
  }

  /**
   * Atomically publish one record. A re-persisted identical record is
   * accepted (resume must be idempotent); a different record under the same
   * content-addressed name is refused rather than overwritten.
   */
  persist(value: unknown): PersistedAgentFindingRecord {
    const record = AgentFindingStore.validated(value);
    const fileName = agentFindingRecordFileName(record.dossierId);
    const existing = this.readIfPresent(fileName);
    if (existing !== null) {
      if (agentFindingRecordPayload(existing) !== agentFindingRecordPayload(record)) {
        throw new AgentFindingStoreError(
          'AGENT_FINDING_STORE_IDENTITY_MISMATCH',
          `${fileName} already holds different content for ${record.dossierId}`,
        );
      }
      return Object.freeze({
        dossierId: record.dossierId,
        candidateId: record.candidateId,
        campaignId: record.campaignId,
        fileName,
        alreadyPresent: true,
      });
    }
    try {
      this.artifacts.writeImmutableJson(fileName, record);
    } catch (error) {
      throw new AgentFindingStoreError(
        'AGENT_FINDING_STORE_WRITE_FAILED',
        `${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return Object.freeze({
      dossierId: record.dossierId,
      candidateId: record.candidateId,
      campaignId: record.campaignId,
      fileName,
      alreadyPresent: false,
    });
  }

  /** Read one record by dossier id; fail closed on absence or corruption. */
  read(dossierId: string): AgentFindingRecord {
    const fileName = agentFindingRecordFileName(dossierId);
    const record = this.readIfPresent(fileName);
    if (record === null) {
      throw new AgentFindingStoreError('AGENT_FINDING_STORE_UNAVAILABLE', `${fileName} is not stored`);
    }
    return record;
  }

  has(dossierId: string): boolean {
    return this.readIfPresent(agentFindingRecordFileName(dossierId)) !== null;
  }

  private readIfPresent(fileName: string): AgentFindingRecord | null {
    let stored: unknown;
    try {
      stored = this.artifacts.readJson(fileName);
    } catch (error) {
      throw new AgentFindingStoreError(
        'AGENT_FINDING_STORE_CORRUPT',
        `${fileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (stored === null) return null;
    // The private-artifact envelope adds its own `status`; anything but a
    // complete publication is corrupt, and the envelope field is removed
    // before the record itself is validated so the record stays pure.
    if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) {
      throw new AgentFindingStoreError('AGENT_FINDING_STORE_CORRUPT', `${fileName}: not an object`);
    }
    const envelope = stored as Record<string, unknown>;
    if (envelope['status'] !== 'READY') {
      throw new AgentFindingStoreError('AGENT_FINDING_STORE_CORRUPT', `${fileName}: status is not READY`);
    }
    const { status: _status, ...recordValue } = envelope;
    const record = AgentFindingStore.validated(recordValue);
    if (agentFindingRecordFileName(record.dossierId) !== fileName) {
      throw new AgentFindingStoreError(
        'AGENT_FINDING_STORE_IDENTITY_MISMATCH',
        `${fileName} holds ${record.dossierId}`,
      );
    }
    return record;
  }

  /**
   * Every stored record, sorted by dossier id. A file that fails validation is
   * NEVER silently skipped: the read refuses so a corrupt store can never be
   * reported as an empty or smaller result.
   */
  list(): readonly AgentFindingRecord[] {
    let names: string[];
    try {
      if (!fs.existsSync(this.root)) return Object.freeze([]);
      names = fs.readdirSync(this.root);
    } catch (error) {
      throw new AgentFindingStoreError(
        'AGENT_FINDING_STORE_UNAVAILABLE',
        error instanceof Error ? error.message : String(error),
      );
    }
    const records: AgentFindingRecord[] = [];
    for (const name of names.slice().sort((a, b) => a.localeCompare(b))) {
      if (!AGENT_FINDING_FILE_NAME_RE.test(name)) continue;
      if (records.length >= AGENT_FINDING_STORE_MAX_RECORDS) {
        throw new AgentFindingStoreError(
          'AGENT_FINDING_STORE_UNAVAILABLE',
          `store holds more than ${AGENT_FINDING_STORE_MAX_RECORDS} records`,
        );
      }
      const record = this.readIfPresent(name);
      if (record !== null) records.push(record);
    }
    return Object.freeze(records.slice().sort((a, b) => a.dossierId.localeCompare(b.dossierId)));
  }

  /** Absolute path of one stored record, for owner-facing output only. */
  pathOf(dossierId: string): string {
    return path.join(this.root, agentFindingRecordFileName(dossierId));
  }
}
