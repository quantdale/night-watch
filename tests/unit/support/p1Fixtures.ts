// ---------------------------------------------------------------------------
// MA-8 / F-13 test support — shared synthetic builders for the P1 suites.
//
// Everything here is synthetic and local-only. Hosts use `.invalid` names
// that can never resolve; nonces, digests, and SHAs are fixed obviously-fake
// values. No production, DEV, or NEXT contact; no credential material.
// ---------------------------------------------------------------------------

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  issueP1ObserveGrant,
  type P1ObserveGrant,
} from '../../../src/core/prodObserveP1/authorization';
import type { P1ScopeConfig } from '../../../src/core/prodObserveP1/scopeConfig';
import { P1_SCOPE_CONFIG_SCHEMA } from '../../../src/core/prodObserveP1/scopeConfig';
import type { P1AdmissionInput } from '../../../src/core/prodObserveP1/observer';
import { createProductionPrivacyPolicy } from '../../../src/core/prodPrivacy/policy';

export const P1_FIXTURE_HOST = 'p1-scope-fixture.invalid';
export const P1_FIXTURE_NONCE = 'p1-operator-subject-nonce-001';
export const P1_FIXTURE_SHA_A = '0123456789abcdef0123456789abcdef01234567';
export const P1_FIXTURE_SHA_B = 'fedcba9876543210fedcba9876543210fedcba98';
export const P1_FIXTURE_PQ_DIGEST = `receipt:sha256:${'ab'.repeat(32)}`;
export const P1_FIXTURE_CAMPAIGN = 'nightwatch-p1-observation-scope-ma8-v1';

export const P1_T0 = 1_786_000_000_000;
export const P1_WINDOW_MS = 600_000;

export function p1Digest(canonical: string): string {
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export interface P1FixtureWorld {
  readonly repositoryRoot: string;
  readonly workspaceRoot: string;
  readonly configPath: string;
  readonly config: P1ScopeConfig;
  readonly grant: P1ObserveGrant;
  readonly evidenceDestination: string;
  dispose(): void;
}

function writeModeOwnerOnly(file: string): void {
  fs.chmodSync(file, 0o600);
}

/**
 * Mint a disposable outside-repo scope-config file plus its loaded config.
 * The file lives in os.tmpdir(), outside both roots. Mode 0600.
 */
export function writeP1ScopeConfigFile(options: {
  readonly repositoryRoot: string;
  readonly workspaceRoot: string;
  readonly admittedHost?: string;
  readonly notBeforeMs?: number;
  readonly notAfterMs?: number;
  readonly maxObservationDurationMs?: number;
  readonly evidenceDestination?: string;
  readonly expectedImplementationSha?: string;
  readonly mutate?: (body: Record<string, unknown>) => void;
  readonly mode?: number;
}): { readonly configPath: string; readonly body: Record<string, unknown> } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-p1-scope-'));
  const configPath = path.join(directory, 'p1scope.json');
  const evidenceDestination =
    options.evidenceDestination ?? path.join(directory, 'p1-evidence-store');
  const body: Record<string, unknown> = {
    schemaVersion: P1_SCOPE_CONFIG_SCHEMA,
    admittedHost: options.admittedHost ?? P1_FIXTURE_HOST,
    observationWindow: {
      notBeforeMs: options.notBeforeMs ?? P1_T0,
      notAfterMs: options.notAfterMs ?? P1_T0 + P1_WINDOW_MS,
    },
    maxObservationDurationMs: options.maxObservationDurationMs ?? P1_WINDOW_MS,
    evidenceDestination,
    expectedImplementationSha: options.expectedImplementationSha ?? P1_FIXTURE_SHA_A,
  };
  options.mutate?.(body);
  fs.writeFileSync(configPath, JSON.stringify(body));
  writeModeOwnerOnly(configPath);
  if (options.mode !== undefined) fs.chmodSync(configPath, options.mode);
  return { configPath, body };
}

/** A fully valid admission input. Override exactly one field per negative case. */
export function validP1AdmissionInput(world: {
  readonly grant: P1ObserveGrant;
  readonly config: P1ScopeConfig;
  readonly evidenceDestination: string;
}): P1AdmissionInput {
  return {
    campaignId: P1_FIXTURE_CAMPAIGN,
    claimedStage: 'P1',
    requestedAuthorizationClass: 'P1_OBSERVE',
    grant: world.grant,
    pqReceiptDigest: P1_FIXTURE_PQ_DIGEST,
    config: world.config,
    subject: {
      subjectNonce: P1_FIXTURE_NONCE,
      provenance: 'OPERATOR_CREATED',
      host: P1_FIXTURE_HOST,
    },
    observerIdentityClass: 'ORDINARY_USER',
    privacyPolicy: createProductionPrivacyPolicy({}),
    evidenceDestination: world.evidenceDestination,
    attributionCapability: 'ATTRIBUTING_PROXY',
    killSwitchProbe: () => false,
    nowMs: P1_T0 + 1_000,
  };
}

export function mintP1Grant(overrides?: {
  readonly campaignId?: string;
  readonly implementationSha?: string;
  readonly pqReceiptDigest?: string;
  readonly notBeforeMs?: number;
  readonly expiresAtMs?: number;
}): P1ObserveGrant {
  // Default grant validity deliberately WIDER than the observation window, so
  // window faults isolate to the window gate instead of tripping grant expiry
  // first. Faults targeting the grant mint their own narrow window.
  return issueP1ObserveGrant({
    campaignId: overrides?.campaignId ?? P1_FIXTURE_CAMPAIGN,
    implementationSha: overrides?.implementationSha ?? P1_FIXTURE_SHA_A,
    pqReceiptDigest: overrides?.pqReceiptDigest ?? P1_FIXTURE_PQ_DIGEST,
    notBeforeMs: overrides?.notBeforeMs ?? P1_T0 - 3_600_000,
    expiresAtMs: overrides?.expiresAtMs ?? P1_T0 + P1_WINDOW_MS + 3_600_000,
  });
}
