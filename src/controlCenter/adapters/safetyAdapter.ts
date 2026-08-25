import {
  FROZEN_OWNER_OPERATIONS,
  OWNER_SCOPE_REASON,
  OWNER_SCOPE_STATUS,
} from '../../core/policy/ownerScope';
import {
  asSafeControlCenterCode,
  asSafeControlCenterDigest,
  asSafeControlCenterLabel,
  asSafeControlCenterSha,
} from '../contracts/common';
import type { ControlCenterSafetyCheckDto, ControlCenterSafetyDto } from '../contracts/safety';
import { CONTROL_CENTER_SAFETY_SCHEMA_VERSION } from '../contracts/safety';
import { boundedCount, safePublicCode, sortedUniqueCodes } from './common';

export interface SafetyAuthorityInput {
  readonly continuity: {
    readonly state: 'CURRENT' | 'ADVANCE_REQUIRES_RECONCILIATION' | 'UNKNOWN';
    readonly branch: string | null;
    readonly headSha: string | null;
    readonly checkpointDigest: string | null;
  };
  readonly checks: readonly {
    readonly checkCode: string;
    readonly state: 'PASS' | 'BLOCKED' | 'UNKNOWN' | 'NOT_MEASURED';
    readonly reasonCode: string;
  }[];
  readonly blockedOperationClasses?: readonly string[];
}

function checks(input: SafetyAuthorityInput): readonly ControlCenterSafetyCheckDto[] {
  return input.checks
    .map((check) => {
      const checkCode = asSafeControlCenterCode(check.checkCode);
      const reasonCode = asSafeControlCenterCode(check.reasonCode);
      if (checkCode === null || reasonCode === null) return null;
      return { checkCode, state: check.state, reasonCode } satisfies ControlCenterSafetyCheckDto;
    })
    .filter((check): check is ControlCenterSafetyCheckDto => check !== null)
    .sort((left, right) => left.checkCode.localeCompare(right.checkCode));
}

function safetyState(values: readonly ControlCenterSafetyCheckDto[]): ControlCenterSafetyDto['state'] {
  if (values.length === 0) return 'UNKNOWN';
  if (values.some((check) => check.state === 'BLOCKED')) return 'FAILED';
  if (values.some((check) => check.state === 'UNKNOWN' || check.state === 'NOT_MEASURED')) return 'WARNING';
  return 'HEALTHY';
}

/** Project local safety posture and owner policy without consulting any product environment. */
export function projectSafety(input: SafetyAuthorityInput): ControlCenterSafetyDto {
  const projectedChecks = checks(input);
  const blockedOperationClasses = sortedUniqueCodes([
    ...FROZEN_OWNER_OPERATIONS,
    ...(input.blockedOperationClasses ?? []),
  ]);
  return {
    schemaVersion: CONTROL_CENTER_SAFETY_SCHEMA_VERSION,
    state: safetyState(projectedChecks),
    scope: 'LOCAL_LOOPBACK_ONLY',
    readOnly: true,
    authMode: 'OWNER_LOCAL_ONLY_NO_AUTH_SESSION',
    networkPosture: 'LOOPBACK_ONLY_EXTERNAL_EGRESS_DISABLED',
    rawEvidenceExposure: 'DISABLED',
    ownerScope: {
      status: OWNER_SCOPE_STATUS,
      reason: OWNER_SCOPE_REASON,
    },
    operationPolicy: {
      controlCenter: 'READ_ONLY',
      productContact: 'DISABLED',
      execution: 'NONE',
      mutation: 'NONE',
      database: 'OUT_OF_SCOPE',
      infrastructure: 'OUT_OF_SCOPE',
      publication: 'DISABLED',
    },
    continuity: {
      state: input.continuity.state,
      branch: asSafeControlCenterLabel(input.continuity.branch),
      headSha: asSafeControlCenterSha(input.continuity.headSha),
      checkpointDigest: asSafeControlCenterDigest(input.continuity.checkpointDigest),
    },
    checks: projectedChecks,
    blockedOperationClasses,
  };
}

export const DEFAULT_CONTROL_CENTER_SAFETY_INPUT: SafetyAuthorityInput = Object.freeze({
  continuity: { state: 'UNKNOWN', branch: null, headSha: null, checkpointDigest: null },
  checks: [],
}) as SafetyAuthorityInput;
