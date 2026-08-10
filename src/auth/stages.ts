// ---------------------------------------------------------------------------
// Nightwatch — sanitized direct auth-capture stage diagnostics.
//
// This module deliberately carries only stage names, reason codes, and URL
// origin/path metadata. It must never be given a raw browser error, URL query,
// fragment, header, cookie, body, storage value, or page text.
// ---------------------------------------------------------------------------

import type { SafetyMonitorDiagnostic, SafetyMonitorReason } from '../state/run';

export const AUTH_CAPTURE_STAGES = [
  'PREFLIGHT',
  'PROXY_START',
  'PROXY_HEALTH',
  'BROWSER_LAUNCH',
  'GUARD_INSTALL',
  'TARGET_NAVIGATION',
  'TARGET_VERIFICATION',
  'HUMAN_WAIT',
  'POST_LOGIN_VERIFICATION',
  'STORAGE_STATE_WRITE',
  'PROVENANCE_WRITE',
  'STATE_VALIDATION',
  'CLEANUP',
] as const;

export type AuthCaptureStage = (typeof AUTH_CAPTURE_STAGES)[number];
export type AuthCaptureStageStatus = 'START' | 'PASS' | 'FAIL';

export interface SanitizedLocation {
  origin: string;
  path: string;
}

export interface AuthCaptureStageEvent {
  stage: AuthCaptureStage;
  status: AuthCaptureStageStatus;
  reason?: string;
  expected?: SanitizedLocation;
  actual?: SanitizedLocation;
  detail?: string;
  monitorReason?: SafetyMonitorReason;
  monitor?: SafetyMonitorDiagnostic;
}

export type AuthCaptureStageReporter = (event: AuthCaptureStageEvent) => void;

/** Parse only the non-secret URL fields permitted in terminal diagnostics. */
export function sanitizedLocation(raw: string): SanitizedLocation {
  try {
    const url = new URL(raw);
    return {
      origin: url.origin,
      path: url.pathname || '/',
    };
  } catch {
    return { origin: 'UNAVAILABLE', path: '/' };
  }
}

export class AuthCaptureStageError extends Error {
  readonly stage: AuthCaptureStage;
  readonly reason: string;
  readonly expected?: SanitizedLocation;
  readonly actual?: SanitizedLocation;
  readonly detail?: string;
  readonly monitorReason?: SafetyMonitorReason;
  readonly monitor?: SafetyMonitorDiagnostic;

  constructor(input: {
    stage: AuthCaptureStage;
    reason: string;
    expected?: SanitizedLocation;
    actual?: SanitizedLocation;
    detail?: string;
    monitorReason?: SafetyMonitorReason;
    monitor?: SafetyMonitorDiagnostic;
  }) {
    super(`${input.stage}: ${input.reason}`);
    this.name = 'AuthCaptureStageError';
    this.stage = input.stage;
    this.reason = input.reason;
    this.expected = input.expected;
    this.actual = input.actual;
    this.detail = input.detail;
    this.monitorReason = input.monitorReason;
    this.monitor = input.monitor;
  }
}

export function isAuthCaptureStageError(value: unknown): value is AuthCaptureStageError {
  return value instanceof AuthCaptureStageError;
}
