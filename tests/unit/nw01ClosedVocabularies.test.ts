import { test, expect } from '@playwright/test';
import {
  AGENT_INTENT_KINDS,
  AGENT_TERMINATION_REASONS,
  AGENT_TOOL_CATALOG,
  REASONER_TURN_RESPONSE_VERSION,
  isAgentToolId,
  lookupAgentTool,
  validateReasonerTurnResponse,
} from '../../src/core/agentProtocol';
import { buildAutonomousFindingDossier } from '../../src/core/autonomousFinding';

/**
 * NW-01. The reasoner-facing closed vocabularies were prototype-bearing
 * objects built with `Object.fromEntries` and queried by truthiness, so every
 * name inherited from `Object.prototype` passed membership. Because the intent
 * dispatch also ended in an unguarded fallback, an accepted-but-unknown
 * discriminant did not merely slip through validation — it was reinterpreted
 * as the LAST branch, minting a terminal state the model never named.
 *
 * These are the names an attacker or a confused model actually reaches: they
 * exist on every ordinary object, so they need no exotic payload.
 */
const INHERITED_NAMES = [
  'constructor',
  '__proto__',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
] as const;

const localContext = { authorizedEnvironments: ['LOCAL'] as const };

function turn(intents: unknown[]): unknown {
  return { schemaVersion: REASONER_TURN_RESPONSE_VERSION, intents, hypotheses: [] };
}

/** A dossier draft that is valid except for the field under test. */
function draft(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Synthetic closed-vocabulary probe',
    description: 'Fabricated draft used only to exercise vocabulary closure.',
    recommendedSeverity: 'S3',
    severityConfidence: 'MEDIUM',
    severityRationale: 'Synthetic probe; nothing was observed and nothing is concluded.',
    reproduction: 'Run the synthetic probe.',
    expected: 'The vocabulary closure rejects the value.',
    actual: 'Recorded by the assertion.',
    evidenceRefs: ['synthetic://evidence/1'],
    environment: 'LOCAL',
    confidence: 'MEDIUM',
    falsePositiveChecks: ['synthetic://false-positive-check/1'],
    reproductionCount: 1,
    provenance: ['synthetic://provenance/1'],
    ...overrides,
  };
}

test.describe('NW-01 — closed reasoner-facing vocabularies', () => {
  test('every valid vocabulary member is still accepted', () => {
    // The closure must reject inherited names without narrowing the frozen
    // vocabularies themselves.
    for (const reason of AGENT_TERMINATION_REASONS) {
      const result = validateReasonerTurnResponse(turn([{ kind: 'TERMINATE', reason }]), localContext);
      expect(result.ok, `termination reason ${reason} must remain valid`).toBe(true);
    }
    for (const tool of AGENT_TOOL_CATALOG) {
      expect(isAgentToolId(tool.id), `${tool.id} must remain a known tool`).toBe(true);
      expect(lookupAgentTool(tool.id)).toBe(tool);
    }
    expect(AGENT_INTENT_KINDS).toContain('TERMINATE');
  });

  test('an inherited intent kind is rejected, not reinterpreted as a terminal state', () => {
    for (const name of INHERITED_NAMES) {
      // `reason` is supplied deliberately: under the defect the unknown kind
      // fell through to the TERMINATE branch and this became a valid
      // termination the reasoner never asked for.
      const result = validateReasonerTurnResponse(
        turn([{ kind: name, reason: 'COMPLETE_WITH_FINDING' }]),
        localContext,
      );
      expect(result.ok, `intent kind ${name} must not validate`).toBe(false);
      if (!result.ok) expect(result.class).toBe('UNKNOWN_INTENT');
    }
  });

  test('an inherited termination reason is rejected', () => {
    for (const name of INHERITED_NAMES) {
      const result = validateReasonerTurnResponse(turn([{ kind: 'TERMINATE', reason: name }]), localContext);
      expect(result.ok, `termination reason ${name} must not validate`).toBe(false);
      if (!result.ok) expect(result.class).toBe('MALFORMED_OUTPUT');
    }
  });

  test('a non-string termination reason cannot be coerced into a member', () => {
    // The defect stringified the value before membership, so any object whose
    // toString produced a member name would have passed.
    const coercible = { toString: () => 'COMPLETE_WITH_FINDING' };
    const result = validateReasonerTurnResponse(turn([{ kind: 'TERMINATE', reason: coercible }]), localContext);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.class).toBe('MALFORMED_OUTPUT');
  });

  test('an inherited tool id resolves to nothing and validates to nothing', () => {
    for (const name of INHERITED_NAMES) {
      expect(isAgentToolId(name), `${name} must not be a tool id`).toBe(false);
      // The recorded defect: lookupAgentTool('constructor') returned an
      // inherited function, so a caller that trusted a non-null descriptor
      // received Object itself.
      expect(lookupAgentTool(name), `lookupAgentTool(${name}) must be null`).toBeNull();
      const result = validateReasonerTurnResponse(
        turn([{ kind: 'CALL_TOOL', toolId: name, arguments: {} }]),
        localContext,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.class).toBe('UNKNOWN_TOOL');
    }
  });

  test('an inherited dossier severity, confidence or environment is refused', () => {
    for (const name of INHERITED_NAMES) {
      expect(() => buildAutonomousFindingDossier(draft({ recommendedSeverity: name }) as never))
        .toThrow('AUTONOMOUS_FINDING_INVALID:UNKNOWN_SEVERITY');
      expect(() => buildAutonomousFindingDossier(draft({ confidence: name }) as never))
        .toThrow(/AUTONOMOUS_FINDING_INVALID:UNKNOWN_/);
      expect(() => buildAutonomousFindingDossier(draft({ severityConfidence: name }) as never))
        .toThrow(/AUTONOMOUS_FINDING_INVALID:UNKNOWN_/);
      expect(() => buildAutonomousFindingDossier(draft({ environment: name }) as never))
        .toThrow('AUTONOMOUS_FINDING_INVALID:UNKNOWN_ENVIRONMENT');
    }
  });

  test('a valid draft still builds, so closure is not a compatibility break', () => {
    const dossier = buildAutonomousFindingDossier(draft() as never);
    expect(dossier.recommendedSeverity).toBe('S3');
    expect(dossier.environment).toBe('LOCAL');
    expect(dossier.authority.humanReviewRequired).toBe(true);
    expect(dossier.authority.externalPublication).toBe('PROHIBITED');
  });
});
