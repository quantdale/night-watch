import { test, expect } from '@playwright/test';
import {
  assertOwnerPolicyAllows,
  decideOwnerScope,
  executeOwnerScoped,
  FROZEN_OWNER_OPERATIONS,
  OWNER_POLICY_BLOCKED,
  OWNER_SCOPE_STATUS,
  OwnerPolicyBlockedError,
} from '../../src/core/policy';

test.describe('owner infrastructure/data freeze', () => {
  test('all frozen classes fail before an executor callback', () => {
    for (const operation of FROZEN_OWNER_OPERATIONS) {
      let executed = false;
      expect(() => executeOwnerScoped(operation, () => { executed = true; })).toThrow(OWNER_POLICY_BLOCKED);
      expect(executed).toBe(false);
      expect(decideOwnerScope(operation).status).toBe(OWNER_SCOPE_STATUS);
    }
  });

  test('unknown operation classes fail closed and local operations are allowed', () => {
    expect(decideOwnerScope('future-cloud-command').allowed).toBe(false);
    expect(() => assertOwnerPolicyAllows('future-cloud-command')).toThrow(OwnerPolicyBlockedError);
    expect(executeOwnerScoped('SYNTHETIC_FIXTURE', () => 'local')).toBe('local');
    expect(decideOwnerScope('SELF_DEVELOPMENT_SYNTHETIC_EVALUATION').allowed).toBe(true);
    expect(decideOwnerScope('SELF_DEVELOPMENT_SYNTHETIC_EVALUATION').operation).not.toBe('AI_REVIEW_LOCAL');
  });

  test('Phase 8B sandbox adoption is allowed', () => {
    expect(decideOwnerScope('SELF_DEVELOPMENT_SANDBOX_ADOPTION').allowed).toBe(true);
    expect(executeOwnerScoped('SELF_DEVELOPMENT_SANDBOX_ADOPTION', () => 'sandbox-only')).toBe('sandbox-only');
  });

  test('Phase 8B.1 canonical adoption is explicitly allowed; other unknown future operations remain blocked', () => {
    // Deliberate capability expansion (Phase 8B.1, owner-scope-policy.v2):
    // SELF_DEVELOPMENT_CANONICAL_ADOPTION is the one new distinct operation
    // class this phase introduces. It must not be silently hidden behind a
    // stale "unknown operation" expectation.
    expect(decideOwnerScope('SELF_DEVELOPMENT_CANONICAL_ADOPTION').allowed).toBe(true);
    expect(executeOwnerScoped('SELF_DEVELOPMENT_CANONICAL_ADOPTION', () => 'canonical-one-file-only')).toBe('canonical-one-file-only');

    expect(decideOwnerScope('SELF_DEVELOPMENT_UNKNOWN_FUTURE_OPERATION').allowed).toBe(false);
    expect(() => assertOwnerPolicyAllows('SELF_DEVELOPMENT_UNKNOWN_FUTURE_OPERATION')).toThrow(OwnerPolicyBlockedError);
    let executed = false;
    expect(() => executeOwnerScoped('SELF_DEVELOPMENT_UNKNOWN_FUTURE_OPERATION', () => { executed = true; })).toThrow(OWNER_POLICY_BLOCKED);
    expect(executed).toBe(false);
  });
});
