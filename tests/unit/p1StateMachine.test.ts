// ---------------------------------------------------------------------------
// MA-8 / F-13 — deterministic seeded property tests over the P1 gate/state
// transitions.
//
// Invariants under test:
//   UNKNOWN never grants authority
//   a consumed authorization never becomes reusable
//   P1 cannot transition to P2 (or any other stage/class)
//   the kill switch dominates every other grant
//   an expired scope cannot become active
//   a missing privacy firewall cannot become active
//   no sequence of denied transitions reaches OBSERVING (allowed)
//   NIGHTWATCH_ATTRIBUTABLE > 0 can never yield P1 PASS
//   UNKNOWN attribution > 0 can never yield P1 PASS
//
// Seeded PRNG (mulberry32); seeds recorded below. A failure reproduces with
// the printed seed.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import { P1_OBSERVATION_SCOPE_GATES } from '../../src/core/prodObserveP1/types';
import { clearP1ObserveGrantRegistryForTest } from '../../src/core/prodObserveP1/authorization';
import { loadP1ScopeConfig, type P1ScopeConfig } from '../../src/core/prodObserveP1/scopeConfig';
import {
  evaluateP1ObservationScope,
  type P1AdmissionInput,
} from '../../src/core/prodObserveP1/observer';
import {
  classifyP1Session,
  isP1SessionPass,
  tallyAttribution,
  type AttributedRequest,
} from '../../src/core/prodObserveP1/attribution';
import {
  P1_FIXTURE_HOST,
  mintP1Grant,
  p1Digest,
  validP1AdmissionInput,
  writeP1ScopeConfigFile,
  P1_T0,
  P1_WINDOW_MS,
} from './support/p1Fixtures';

const ROOT = path.resolve(__dirname, '../..');

export const P1_STATE_MACHINE_SEEDS = [11, 101, 1001] as const;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function loadConfig(): { config: P1ScopeConfig; evidenceDestination: string } {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwatch-p1-wsroot-'));
  const { configPath } = writeP1ScopeConfigFile({ repositoryRoot: ROOT, workspaceRoot });
  process.env.NIGHTWATCH_P1_SCOPE_CONFIG = configPath;
  const loaded = loadP1ScopeConfig({ repositoryRoot: ROOT, workspaceRoot, digest: p1Digest });
  if (!loaded.ok) throw new Error(`P1_FIXTURE_CONFIG_FAILED:${loaded.failure}`);
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { evidenceDestination: string };
  return { config: loaded.config, evidenceDestination: raw.evidenceDestination };
}

function validInput(): P1AdmissionInput {
  const { config, evidenceDestination } = loadConfig();
  return validP1AdmissionInput({ grant: mintP1Grant(), config, evidenceDestination });
}

test.beforeEach(() => {
  clearP1ObserveGrantRegistryForTest();
  delete process.env.NIGHTWATCH_P1_SCOPE_CONFIG;
});

for (const seed of P1_STATE_MACHINE_SEEDS) {
  test.describe(`seed ${seed}`, () => {
    test('UNKNOWN authority inputs never admit: unknown identity, unknown provenance, unknown capability', () => {
      for (const mutate of [
        (input: P1AdmissionInput): P1AdmissionInput => ({ ...input, observerIdentityClass: 'UNKNOWN' }),
        (input: P1AdmissionInput): P1AdmissionInput => ({
          ...input,
          subject: { subjectNonce: 'nonce', provenance: 'UNKNOWN', host: P1_FIXTURE_HOST },
        }),
        (input: P1AdmissionInput): P1AdmissionInput => ({ ...input, attributionCapability: 'UNKNOWN' }),
      ]) {
        const outcome = evaluateP1ObservationScope(mutate(validInput()), p1Digest);
        expect(outcome.allowed, `seed ${seed}`).toBe(false);
      }
    });

    test('a consumed authorization never becomes reusable, however retried', () => {
      const rand = mulberry32(seed);
      const input = validInput();
      const first = evaluateP1ObservationScope(input, p1Digest);
      expect(first.allowed).toBe(true);
      const retries = 2 + Math.floor(rand() * 5);
      for (let attempt = 0; attempt < retries; attempt += 1) {
        const outcome = evaluateP1ObservationScope(input, p1Digest);
        expect(outcome.allowed, `seed ${seed} attempt ${attempt}`).toBe(false);
        expect(outcome.denialCode).toBe('P1_ALREADY_CONSUMED');
      }
    });

    test('P1 cannot transition to any other stage or class', () => {
      const rand = mulberry32(seed * 7 + 3);
      const stages = ['P0', 'PQ', 'P2', 'P3', 'P4', ''];
      const classes = ['PROD_OBSERVE', 'DEV', 'NEXT', 'AUTHENTICATED_BROWSER', 'REPLAY', 'SOURCE_INTELLIGENCE', 'REAL_RUN'] as const;
      for (let round = 0; round < 4; round += 1) {
        const stage = stages[Math.floor(rand() * stages.length)] ?? 'P2';
        const input = { ...validInput(), claimedStage: stage };
        // Fresh grant per round: consumption must not mask the stage denial.
        const outcome = evaluateP1ObservationScope(input, p1Digest);
        expect(outcome.allowed, `seed ${seed} stage ${stage}`).toBe(false);
        expect(outcome.deniedAtGate).toBe('P1_AUTHORIZATION_CLASS');
      }
      for (const authorizationClass of classes) {
        const outcome = evaluateP1ObservationScope(
          { ...validInput(), requestedAuthorizationClass: authorizationClass },
          p1Digest,
        );
        expect(outcome.allowed, `seed ${seed} class ${authorizationClass}`).toBe(false);
        expect(outcome.deniedAtGate).toBe('P1_AUTHORIZATION_CLASS');
      }
    });

    test('the kill switch dominates every other grant', () => {
      const rand = mulberry32(seed * 13 + 1);
      for (let round = 0; round < 3; round += 1) {
        void rand();
        const outcome = evaluateP1ObservationScope(
          { ...validInput(), killSwitchProbe: () => true },
          p1Digest,
        );
        expect(outcome.allowed, `seed ${seed} round ${round}`).toBe(false);
        expect(outcome.deniedAtGate).toBe('P1_KILL_SWITCH_ENTRY');
        expect(outcome.outcomes[0]).toEqual({
          gate: 'P1_KILL_SWITCH_ENTRY',
          result: 'DENY',
          denialCode: 'P1_KILL_SWITCH_ENGAGED_AT_ENTRY',
        });
      }
    });

    test('an expired scope cannot become active at any later clock reading', () => {
      const rand = mulberry32(seed * 29 + 5);
      for (let round = 0; round < 3; round += 1) {
        const drift = Math.floor(rand() * 3_600_000);
        const outcome = evaluateP1ObservationScope(
          { ...validInput(), nowMs: P1_T0 + P1_WINDOW_MS + drift },
          p1Digest,
        );
        expect(outcome.allowed, `seed ${seed} drift ${drift}`).toBe(false);
      }
    });

    test('a missing privacy firewall cannot become active', () => {
      const outcome = evaluateP1ObservationScope({ ...validInput(), privacyPolicy: null }, p1Digest);
      expect(outcome.allowed).toBe(false);
      expect(outcome.deniedAtGate).toBe('P1_PRIVACY_CAPABILITY');
    });

    test('no denied-prefix sequence reaches OBSERVING: denial index is monotone in fault position', () => {
      // Breaking gate k denies AT k (all earlier gates hold by construction of
      // the one-fault matrix); this asserts the monotone consequence: no fault
      // at or before k can produce an allow, whatever follows.
      const rand = mulberry32(seed * 101 + 7);
      const breakers: ((input: P1AdmissionInput) => P1AdmissionInput)[] = [
        (input) => ({ ...input, killSwitchProbe: () => true }),
        (input) => ({ ...input, grant: { forged: true } }),
        (input) => ({ ...input, requestedAuthorizationClass: 'DEV' as const }),
        (input) => ({ ...input, config: null }),
        (input) => ({ ...input, subject: null }),
        (input) => ({
          ...input,
          subject: { subjectNonce: 'n', provenance: 'UNKNOWN' as const, host: P1_FIXTURE_HOST },
        }),
        (input) => ({
          ...input,
          subject: { subjectNonce: 'n', provenance: 'OPERATOR_CREATED' as const, host: 'elsewhere.invalid' },
        }),
        (input) => ({ ...input, nowMs: P1_T0 + P1_WINDOW_MS + 1 }),
        (input) => ({ ...input, observerIdentityClass: 'UNKNOWN' as const }),
        (input) => ({ ...input, privacyPolicy: null }),
        (input) => ({ ...input, evidenceDestination: null }),
        (input) => ({ ...input, attributionCapability: 'UNKNOWN' as const }),
      ];
      for (let round = 0; round < 6; round += 1) {
        const count = 1 + Math.floor(rand() * breakers.length);
        let input = validInput();
        for (let pick = 0; pick < count; pick += 1) {
          const breaker = breakers[Math.floor(rand() * breakers.length)];
          if (breaker !== undefined) input = breaker(input);
        }
        const outcome = evaluateP1ObservationScope(input, p1Digest);
        expect(outcome.allowed, `seed ${seed} round ${round}`).toBe(false);
      }
    });

    test('attributable or unknown traffic can never yield P1 PASS, at any mix', () => {
      const rand = mulberry32(seed * 1009 + 2);
      const classes = ['OPERATOR_PREEXISTING', 'APPLICATION_AUTONOMOUS', 'NIGHTWATCH_ATTRIBUTABLE', 'UNKNOWN'] as const;
      for (let round = 0; round < 25; round += 1) {
        const length = Math.floor(rand() * 8);
        const attributed: AttributedRequest[] = [];
        for (let index = 0; index < length; index += 1) {
          const attribution = classes[Math.floor(rand() * classes.length)] ?? 'UNKNOWN';
          attributed.push({ requestId: `s${seed}-r${round}-${index}`, attribution });
        }
        const tally = tallyAttribution(attributed);
        const verdict = classifyP1Session({ subjectAttached: true, windowEmpty: false, tally });
        if (tally.nightwatchAttributable > 0 || tally.unknown > 0) {
          expect(isP1SessionPass(verdict), `seed ${seed} round ${round}`).toBe(false);
        } else if (tally.total > 0) {
          expect(verdict).toBe('PASSIVE_OBSERVATION_COMPLETE');
        } else {
          expect(verdict).toBe('NO_QUALIFYING_OBSERVATION');
        }
      }
    });

    test('the chain under test is the fifteen-gate P1 chain', () => {
      expect(P1_OBSERVATION_SCOPE_GATES.length).toBe(15);
    });
  });
}
