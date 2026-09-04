// ---------------------------------------------------------------------------
// MA-8 / F-13 — the P1 observation-scope admission chain, qualified against
// SYNTHETIC subjects only.
//
// The organising claim is falsifiable: for EVERY gate, hold every other
// prerequisite valid, break exactly that one, and require a categorical DENY
// whose reason names that gate — with the grant left unconsumed and every
// later gate `NOT_EVALUATED`. A denial that burns the grant, or a gate that
// cannot deny, fails this suite.
//
// The positive path exists so the chain is not vacuously always-deny: one
// fully synthetic admission must actually allow, consume its grant exactly
// once, and bind host, subject, and deadline.
//
// Everything here is synthetic and local-only. No production, DEV, or NEXT
// host; no credential; no auth state; no network.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import {
  P1_GATE_DENIAL_CODES,
  P1_OBSERVATION_DENIAL_CODES,
  P1_OBSERVATION_SCOPE_CHAIN_VERSION,
  P1_OBSERVATION_SCOPE_GATES,
  type P1ObservationDenialCode,
  type P1ObservationScopeGate,
} from '../../src/core/prodObserveP1/types';
import {
  clearP1ObserveGrantRegistryForTest,
  consumeP1ObserveGrant,
  isRegisteredP1Grant,
  p1GrantLifecycleState,
  revokeP1ObserveGrant,
  validateP1ObserveGrant,
} from '../../src/core/prodObserveP1/authorization';
import {
  loadP1ScopeConfig,
  type P1ScopeConfig,
} from '../../src/core/prodObserveP1/scopeConfig';
import {
  evaluateP1ObservationScope,
  p1ScopeChainDefinitionDigest,
  type P1AdmissionInput,
  type P1AdmissionOutcome,
} from '../../src/core/prodObserveP1/observer';
import { createDevPrivacyPolicy } from '../../src/core/prodPrivacy/policy';
import {
  P1_FIXTURE_CAMPAIGN,
  P1_FIXTURE_HOST,
  P1_FIXTURE_NONCE,
  P1_FIXTURE_SHA_B,
  P1_T0,
  P1_WINDOW_MS,
  mintP1Grant,
  p1Digest,
  validP1AdmissionInput,
  writeP1ScopeConfigFile,
} from './support/p1Fixtures';

const ROOT = path.resolve(__dirname, '../..');

interface P1World {
  readonly workspaceRoot: string;
  readonly evidenceDestination: string;
  readonly config: P1ScopeConfig;
}

function loadWorld(overrides?: Parameters<typeof writeP1ScopeConfigFile>[0]): P1World & { readonly configPath: string } {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-p1-wsroot-'));
  const { configPath } = writeP1ScopeConfigFile({ repositoryRoot: ROOT, workspaceRoot, ...overrides });
  process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
  const loaded = loadP1ScopeConfig({ repositoryRoot: ROOT, workspaceRoot, digest: p1Digest });
  if (!loaded.ok) throw new Error(`P1_FIXTURE_CONFIG_FAILED:${loaded.failure}`);
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { evidenceDestination: string };
  return { workspaceRoot, evidenceDestination: raw.evidenceDestination, config: loaded.config, configPath };
}

function validInput(world: P1World): P1AdmissionInput {
  return validP1AdmissionInput({
    grant: mintP1Grant(),
    config: world.config,
    evidenceDestination: world.evidenceDestination,
  });
}

test.beforeEach(() => {
  clearP1ObserveGrantRegistryForTest();
  delete process.env.NIGHTWATCH_P1_SCOPE_CONFIG;
});

test.describe('chain identity', () => {
  test('the chain is versioned, named, ordered, and code-confined', () => {
    expect(P1_OBSERVATION_SCOPE_CHAIN_VERSION).toBe('nightwatch.p1-observation-scope.v1');
    expect([...P1_OBSERVATION_SCOPE_GATES]).toEqual([
      'P1_KILL_SWITCH_ENTRY',
      'P1_OWNER_AUTHORIZATION',
      'P1_AUTHORIZATION_CLASS',
      'P1_CONFIGURATION_INTEGRITY',
      'P1_IMPLEMENTATION_IDENTITY',
      'P1_PQ_BINDING',
      'P1_SUBJECT_PRESENCE',
      'P1_SUBJECT_PROVENANCE',
      'P1_HOST_ADMISSION',
      'P1_OBSERVATION_WINDOW',
      'P1_OBSERVER_IDENTITY',
      'P1_PRIVACY_CAPABILITY',
      'P1_EVIDENCE_DESTINATION',
      'P1_ATTRIBUTION_CAPABILITY',
      'P1_KILL_SWITCH_PREATTACH',
    ]);
    // Every gate owns at least one code, and no gate borrows another's.
    const owned = new Set<P1ObservationDenialCode>();
    for (const gate of P1_OBSERVATION_SCOPE_GATES) {
      const codes = P1_GATE_DENIAL_CODES[gate];
      expect(codes.length).toBeGreaterThan(0);
      for (const code of codes) {
        expect(P1_OBSERVATION_DENIAL_CODES).toContain(code);
        expect(owned.has(code)).toBe(false);
        owned.add(code);
      }
    }
  });

  test('the chain-definition digest is deterministic and bound to the definition', () => {
    const first = p1ScopeChainDefinitionDigest(p1Digest);
    const second = p1ScopeChainDefinitionDigest(p1Digest);
    expect(first).toBe(second);
    expect(first.startsWith('p1scope:')).toBe(true);
  });
});

test.describe('positive path', () => {
  test('a fully synthetic admission allows, binds, and consumes exactly once', () => {
    const world = loadWorld();
    const input = validInput(world);
    const outcome = evaluateP1ObservationScope(input, p1Digest);
    expect(outcome.allowed).toBe(true);
    expect(outcome.denialCode).toBe(null);
    expect(outcome.deniedAtGate).toBe(null);
    expect(outcome.deniedBeforeAttach).toBe(true);
    expect(outcome.outcomes.length).toBe(P1_OBSERVATION_SCOPE_GATES.length);
    for (const gateOutcome of outcome.outcomes) expect(gateOutcome.result).toBe('PASS');
    expect(outcome.admittedHost).toBe(P1_FIXTURE_HOST);
    expect(outcome.admittedSubjectNonce).toBe(P1_FIXTURE_NONCE);
    // Deadline is the earlier of the window end and nowMs + max duration.
    expect(outcome.observationDeadlineMs).toBe(P1_T0 + P1_WINDOW_MS);
    expect(outcome.gateDefinitionDigest).toBe(p1ScopeChainDefinitionDigest(p1Digest));
    expect(p1GrantLifecycleState(input.grant)).toBe('CONSUMED');
  });

  test('a consumed grant cannot admit twice', () => {
    const world = loadWorld();
    const input = validInput(world);
    const first = evaluateP1ObservationScope(input, p1Digest);
    expect(first.allowed).toBe(true);
    const second = evaluateP1ObservationScope(input, p1Digest);
    expect(second.allowed).toBe(false);
    expect(second.denialCode).toBe('P1_ALREADY_CONSUMED');
    expect(second.deniedAtGate).toBe('P1_OWNER_AUTHORIZATION');
  });
});

interface FaultCase {
  readonly name: string;
  readonly gate: P1ObservationScopeGate;
  readonly code: P1ObservationDenialCode;
  readonly breakInput: (world: P1World, input: P1AdmissionInput) => P1AdmissionInput;
}

const FAULTS: FaultCase[] = [
  {
    name: 'kill switch engaged at entry',
    gate: 'P1_KILL_SWITCH_ENTRY',
    code: 'P1_KILL_SWITCH_ENGAGED_AT_ENTRY',
    breakInput: (_world, input) => ({ ...input, killSwitchProbe: () => true }),
  },
  {
    name: 'grant absent',
    gate: 'P1_OWNER_AUTHORIZATION',
    code: 'P1_AUTHORIZATION_ABSENT',
    breakInput: (_world, input) => ({ ...input, grant: { forged: true } }),
  },
  {
    name: 'grant expired',
    gate: 'P1_OWNER_AUTHORIZATION',
    code: 'P1_AUTHORIZATION_EXPIRED',
    // Narrow grant of its own: the fixture default is wider than the window.
    breakInput: (_world, input) => ({
      ...input,
      grant: mintP1Grant({ notBeforeMs: P1_T0, expiresAtMs: P1_T0 + 10_000 }),
      nowMs: P1_T0 + 20_000,
    }),
  },
  {
    name: 'grant wrong campaign',
    gate: 'P1_OWNER_AUTHORIZATION',
    code: 'P1_AUTHORIZATION_SCOPE_MISMATCH',
    breakInput: (_world, input) => ({ ...input, campaignId: 'some-other-campaign' }),
  },
  {
    name: 'grant already consumed',
    gate: 'P1_OWNER_AUTHORIZATION',
    code: 'P1_ALREADY_CONSUMED',
    breakInput: (_world, input) => {
      consumeP1ObserveGrant(input.grant);
      return input;
    },
  },
  {
    name: 'requested class is DEV',
    gate: 'P1_AUTHORIZATION_CLASS',
    code: 'P1_AUTHORIZATION_CLASS_NOT_P1_OBSERVE',
    breakInput: (_world, input) => ({ ...input, requestedAuthorizationClass: 'DEV' }),
  },
  {
    name: 'requested class is C-11 PROD_OBSERVE',
    gate: 'P1_AUTHORIZATION_CLASS',
    code: 'P1_AUTHORIZATION_CLASS_NOT_P1_OBSERVE',
    breakInput: (_world, input) => ({ ...input, requestedAuthorizationClass: 'PROD_OBSERVE' }),
  },
  {
    name: 'claimed stage is P2',
    gate: 'P1_AUTHORIZATION_CLASS',
    code: 'P1_AUTHORIZATION_CLASS_NOT_P1_OBSERVE',
    breakInput: (_world, input) => ({ ...input, claimedStage: 'P2' }),
  },
  {
    name: 'implementation SHA mismatch',
    gate: 'P1_IMPLEMENTATION_IDENTITY',
    code: 'P1_IMPLEMENTATION_IDENTITY_MISMATCH',
    breakInput: (_world, input) => ({
      ...input,
      grant: mintP1Grant({ implementationSha: P1_FIXTURE_SHA_B }),
    }),
  },
  {
    name: 'PQ digest absent',
    gate: 'P1_PQ_BINDING',
    code: 'P1_PQ_BINDING_ABSENT',
    breakInput: (_world, input) => ({ ...input, pqReceiptDigest: null }),
  },
  {
    name: 'PQ digest malformed',
    gate: 'P1_PQ_BINDING',
    code: 'P1_PQ_BINDING_INVALID',
    breakInput: (_world, input) => ({ ...input, pqReceiptDigest: 'not-a-receipt-digest' }),
  },
  {
    name: 'PQ digest mismatched against the grant',
    gate: 'P1_PQ_BINDING',
    code: 'P1_PQ_BINDING_INVALID',
    breakInput: (_world, input) => ({
      ...input,
      pqReceiptDigest: `receipt:sha256:${'cd'.repeat(32)}`,
    }),
  },
  {
    name: 'config absent',
    gate: 'P1_CONFIGURATION_INTEGRITY',
    code: 'P1_SCOPE_CONFIGURATION_INVALID',
    breakInput: (_world, input) => ({ ...input, config: null }),
  },
  {
    name: 'subject absent',
    gate: 'P1_SUBJECT_PRESENCE',
    code: 'P1_SUBJECT_ABSENT',
    breakInput: (_world, input) => ({ ...input, subject: null }),
  },
  {
    name: 'subject nonce empty',
    gate: 'P1_SUBJECT_PRESENCE',
    code: 'P1_SUBJECT_ABSENT',
    breakInput: (_world, input) => ({
      ...input,
      subject: { subjectNonce: '', provenance: 'OPERATOR_CREATED' as const, host: P1_FIXTURE_HOST },
    }),
  },
  {
    name: 'subject created by Nightwatch',
    gate: 'P1_SUBJECT_PROVENANCE',
    code: 'P1_SUBJECT_PROVENANCE_UNTRUSTED',
    breakInput: (_world, input) => ({
      ...input,
      subject: { subjectNonce: P1_FIXTURE_NONCE, provenance: 'NIGHTWATCH_CREATED' as const, host: P1_FIXTURE_HOST },
    }),
  },
  {
    name: 'subject provenance unknown',
    gate: 'P1_SUBJECT_PROVENANCE',
    code: 'P1_SUBJECT_PROVENANCE_UNTRUSTED',
    breakInput: (_world, input) => ({
      ...input,
      subject: { subjectNonce: P1_FIXTURE_NONCE, provenance: 'UNKNOWN' as const, host: P1_FIXTURE_HOST },
    }),
  },
  {
    name: 'subject host not admitted',
    gate: 'P1_HOST_ADMISSION',
    code: 'P1_HOST_NOT_ADMITTED',
    breakInput: (_world, input) => ({
      ...input,
      subject: { subjectNonce: P1_FIXTURE_NONCE, provenance: 'OPERATOR_CREATED' as const, host: 'elsewhere.invalid' },
    }),
  },
  {
    name: 'window not yet valid',
    gate: 'P1_OBSERVATION_WINDOW',
    code: 'P1_WINDOW_NOT_YET_VALID',
    breakInput: (_world, input) => ({ ...input, nowMs: P1_T0 - 1 }),
  },
  {
    name: 'window expired',
    gate: 'P1_OBSERVATION_WINDOW',
    code: 'P1_WINDOW_EXPIRED',
    breakInput: (_world, input) => ({ ...input, grant: mintP1Grant({ expiresAtMs: P1_T0 + P1_WINDOW_MS + 60_000 }), nowMs: P1_T0 + P1_WINDOW_MS }),
  },
  {
    name: 'observer identity outside the vocabulary (untyped caller)',
    gate: 'P1_OBSERVER_IDENTITY',
    code: 'P1_OBSERVER_IDENTITY_UNKNOWN',
    breakInput: (_world, input) => ({
      ...input,
      observerIdentityClass: 'ADMIN' as unknown as typeof input.observerIdentityClass,
    }),
  },
  {
    name: 'observer identity unknown',
    gate: 'P1_OBSERVER_IDENTITY',
    code: 'P1_OBSERVER_IDENTITY_UNKNOWN',
    breakInput: (_world, input) => ({ ...input, observerIdentityClass: 'UNKNOWN' as const }),
  },
  {
    name: 'privacy policy absent',
    gate: 'P1_PRIVACY_CAPABILITY',
    code: 'P1_PRIVACY_CAPABILITY_ABSENT',
    breakInput: (_world, input) => ({ ...input, privacyPolicy: null }),
  },
  {
    name: 'privacy cone is DEV',
    gate: 'P1_PRIVACY_CAPABILITY',
    code: 'P1_PRIVACY_CONE_NOT_PRODUCTION',
    breakInput: (_world, input) => ({ ...input, privacyPolicy: createDevPrivacyPolicy() }),
  },
  {
    name: 'evidence destination missing',
    gate: 'P1_EVIDENCE_DESTINATION',
    code: 'P1_EVIDENCE_DESTINATION_INVALID',
    breakInput: (_world, input) => ({ ...input, evidenceDestination: null }),
  },
  {
    name: 'evidence destination differs from the admitted one',
    gate: 'P1_EVIDENCE_DESTINATION',
    code: 'P1_EVIDENCE_DESTINATION_INVALID',
    breakInput: (_world, input) => ({
      ...input,
      evidenceDestination: path.join(os.tmpdir(), 'nightwatch-p1-rogue-destination'),
    }),
  },
  {
    name: 'attribution capability absent',
    gate: 'P1_ATTRIBUTION_CAPABILITY',
    code: 'P1_ATTRIBUTION_CAPABILITY_ABSENT',
    breakInput: (_world, input) => ({ ...input, attributionCapability: null }),
  },
  {
    name: 'attribution capability unknown',
    gate: 'P1_ATTRIBUTION_CAPABILITY',
    code: 'P1_ATTRIBUTION_CAPABILITY_ABSENT',
    breakInput: (_world, input) => ({ ...input, attributionCapability: 'UNKNOWN' as const }),
  },
  {
    name: 'kill switch revoked between entry and attach',
    gate: 'P1_KILL_SWITCH_PREATTACH',
    code: 'P1_KILL_SWITCH_ENGAGED_BEFORE_ATTACH',
    breakInput: (_world, input) => {
      let calls = 0;
      return {
        ...input,
        killSwitchProbe: () => {
          calls += 1;
          return calls >= 2;
        },
      };
    },
  },
];

test.describe('one-fault denial matrix', () => {
  for (const fault of FAULTS) {
    test(`denies: ${fault.name}`, () => {
      const world = loadWorld();
      const input = fault.breakInput(world, validInput(world));
      const outcome: P1AdmissionOutcome = evaluateP1ObservationScope(input, p1Digest);
      expect(outcome.allowed).toBe(false);
      expect(outcome.denialCode).toBe(fault.code);
      expect(outcome.deniedAtGate).toBe(fault.gate);
      expect(outcome.deniedBeforeAttach).toBe(true);
      expect(outcome.admittedHost).toBe(null);
      expect(outcome.admittedSubjectNonce).toBe(null);
      expect(outcome.observationDeadlineMs).toBe(null);
      // Causal order: the denying gate fired, every later gate never evaluated.
      const deniedIndex = P1_OBSERVATION_SCOPE_GATES.indexOf(fault.gate);
      outcome.outcomes.forEach((gateOutcome, index) => {
        if (index < deniedIndex) expect(gateOutcome.result).toBe('PASS');
        else if (index === deniedIndex) {
          expect(gateOutcome.result).toBe('DENY');
          expect(gateOutcome.denialCode).toBe(fault.code);
        } else expect(gateOutcome.result).toBe('NOT_EVALUATED');
      });
      // A denied admission must not burn the grant (except the consumed-grant case itself).
      if (fault.code !== 'P1_ALREADY_CONSUMED' && isRegisteredP1Grant(input.grant)) {
        expect(p1GrantLifecycleState(input.grant)).toBe('ISSUED');
      }
    });
  }

  test('excessive window denies even with a valid grant', () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-p1-wsroot-'));
    const { configPath } = writeP1ScopeConfigFile({
      repositoryRoot: ROOT,
      workspaceRoot,
      notBeforeMs: P1_T0,
      notAfterMs: P1_T0 + 800_000,
      maxObservationDurationMs: 100_000,
    });
    process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
    const loaded = loadP1ScopeConfig({ repositoryRoot: ROOT, workspaceRoot, digest: p1Digest });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) throw new Error('unreachable');
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { evidenceDestination: string };
    const grant = mintP1Grant({ expiresAtMs: P1_T0 + 900_000 });
    const input = validP1AdmissionInput({
      grant,
      config: loaded.config,
      evidenceDestination: raw.evidenceDestination,
    });
    const outcome = evaluateP1ObservationScope(input, p1Digest);
    expect(outcome.allowed).toBe(false);
    expect(outcome.denialCode).toBe('P1_WINDOW_EXCESSIVE');
    expect(outcome.deniedAtGate).toBe('P1_OBSERVATION_WINDOW');
  });
});

test.describe('grant lifecycle', () => {
  test('issue, validate, consume, and reject reuse', () => {
    const grant = mintP1Grant();
    expect(isRegisteredP1Grant(grant)).toBe(true);
    expect(p1GrantLifecycleState(grant)).toBe('ISSUED');
    const validation = validateP1ObserveGrant({
      candidate: grant,
      campaignId: P1_FIXTURE_CAMPAIGN,
      nowMs: P1_T0 + 1_000,
    });
    expect(validation.ok).toBe(true);
    expect(consumeP1ObserveGrant(grant)).toEqual({ ok: true, denialCode: null });
    expect(p1GrantLifecycleState(grant)).toBe('CONSUMED');
    expect(consumeP1ObserveGrant(grant).ok).toBe(false);
    const revalidation = validateP1ObserveGrant({
      candidate: grant,
      campaignId: P1_FIXTURE_CAMPAIGN,
      nowMs: P1_T0 + 1_000,
    });
    expect(revalidation.ok).toBe(false);
  });

  test('a structurally identical copy carries no authority', () => {
    const grant = mintP1Grant();
    const copy = { ...grant };
    expect(isRegisteredP1Grant(copy)).toBe(false);
    expect(p1GrantLifecycleState(copy)).toBe('UNREGISTERED');
  });

  test('revocation denies as consumed', () => {
    const grant = mintP1Grant();
    revokeP1ObserveGrant(grant);
    const validation = validateP1ObserveGrant({
      candidate: grant,
      campaignId: P1_FIXTURE_CAMPAIGN,
      nowMs: P1_T0 + 1_000,
    });
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.denialCode).toBe('P1_ALREADY_CONSUMED');
  });

  test('minting rejects malformed bindings', () => {
    expect(() => mintP1Grant({ implementationSha: 'not-a-sha' })).toThrow('P1_GRANT_IMPLEMENTATION_SHA_INVALID');
    expect(() => mintP1Grant({ campaignId: '' })).toThrow('P1_GRANT_CAMPAIGN_ID_INVALID');
    expect(() => mintP1Grant({ notBeforeMs: P1_T0, expiresAtMs: P1_T0 })).toThrow('P1_GRANT_WINDOW_INVALID');
  });
});
