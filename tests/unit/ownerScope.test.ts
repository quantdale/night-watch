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
  });
});

