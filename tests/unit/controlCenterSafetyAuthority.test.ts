// M6 task 7.7 (B-11/C-25) — the Safety Center is MEASURED from the owner-scope
// policy, with explicit NOT_MEASURED labels for the owner-CLI surfaces and an
// explicit NOT_WIRED currentness state.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { FROZEN_OWNER_OPERATIONS } from '../../src/core/policy/ownerScope';
import {
  SAFETY_CURRENTNESS_REASON,
  SAFETY_CURRENTNESS_STATE,
  createSafetyAuthority,
  safetyAuthorityInputForTests,
} from '../../src/controlCenter/authorities/safetyAuthority';
import { projectSafety } from '../../src/controlCenter/adapters/safetyAdapter';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

test.describe('measured Safety Center (7.7)', () => {
  test('the owner-scope check is measured from the policy, not asserted', () => {
    const input = safetyAuthorityInputForTests();
    const check = input.checks.find((entry) => entry.checkCode === 'OWNER_SCOPE_POLICY');
    expect(check).toBeTruthy();
    expect(check?.state).toBe('PASS');
    expect(check?.reasonCode).toContain('FROZEN_BY_OWNER');
    expect(check?.reasonCode).toContain('INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE');
  });

  test('owner-CLI surfaces are NOT_MEASURED with a precise reason', () => {
    const input = safetyAuthorityInputForTests();
    const workspace = input.checks.find((entry) => entry.checkCode === 'WORKSPACE_INTEGRITY');
    const session = input.checks.find((entry) => entry.checkCode === 'SESSION_PROTOCOL');
    expect(workspace?.state).toBe('NOT_MEASURED');
    expect(workspace?.reasonCode).toBe('WORKSPACE_INTEGRITY_IS_AN_OWNER_CLI_SURFACE');
    expect(session?.state).toBe('NOT_MEASURED');
    expect(session?.reasonCode).toBe('SESSION_PROTOCOL_IS_AN_OWNER_CLI_SURFACE');
  });

  test('the frozen operation classes come from the policy', () => {
    const input = safetyAuthorityInputForTests();
    const expected = FROZEN_OWNER_OPERATIONS.map((operation) =>
      String(operation).toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
    );
    expect(input.blockedOperationClasses).toEqual(expected);
    expect(input.blockedOperationClasses?.length).toBeGreaterThan(0);
  });

  test('currentness is labelled NOT_WIRED rather than implied', () => {
    expect(SAFETY_CURRENTNESS_STATE).toBe('NOT_WIRED');
    const dto = projectSafety(createSafetyAuthority().input());
    expect(dto.currentness.state).toBe('NOT_WIRED');
    expect(dto.currentness.reasonCode).toBe(SAFETY_CURRENTNESS_REASON);
    // The wiring check is visible in the check list too.
    const wiring = dto.checks.find((check) => check.checkCode === 'CURRENTNESS_WIRING');
    expect(wiring?.state).toBe('NOT_MEASURED');
  });

  test('the projected safety view keeps the frozen owner posture', () => {
    const dto = projectSafety(createSafetyAuthority().input());
    expect(dto.scope).toBe('LOCAL_LOOPBACK_ONLY');
    expect(dto.readOnly).toBe(true);
    expect(dto.ownerScope).toEqual({
      status: 'FROZEN_BY_OWNER',
      reason: 'INFRASTRUCTURE_AND_DATA_LAYER_OUT_OF_SCOPE',
    });
    expect(dto.operationPolicy.database).toBe('OUT_OF_SCOPE');
    expect(dto.operationPolicy.publication).toBe('DISABLED');
  });

  test('the collector no longer projects the retired constant', () => {
    const source = fs.readFileSync(
      path.join(REPO_ROOT, 'src', 'controlCenter', 'server', 'defaultCollector.ts'),
      'utf8',
    );
    expect(source).toContain('createSafetyAuthority().input()');
    expect(source).not.toContain('DEFAULT_CONTROL_CENTER_SAFETY_INPUT');
    const adapter = fs.readFileSync(
      path.join(REPO_ROOT, 'src', 'controlCenter', 'adapters', 'safetyAdapter.ts'),
      'utf8',
    );
    expect(adapter).not.toContain('DEFAULT_CONTROL_CENTER_SAFETY_INPUT');
  });
});
