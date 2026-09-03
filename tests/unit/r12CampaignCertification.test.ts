// ---------------------------------------------------------------------------
// Nightwatch R-12 — campaign certification registry.
//
// The debt this campaign closed was not a typo in a list. Registration was
// enforced by six hand-written per-campaign loops inside
// `bin/hardening-check.mjs`; three campaigns never wrote one, and nothing
// detected the omission. Six load-bearing suites — C-01's four completeness
// suites, C-02a's OpenAPI admission suite and C-06's PHP read-only-proof
// suite — shipped without any authoritative gate group ever running them.
//
// Two things are asserted here, and they are deliberately different in kind:
//
//   * the REAL repository satisfies the three conjuncts (totality over the
//     campaign task ledger, existence on disk, registration in a lane a
//     REQUIRED gate group runs). This is a second, independent enforcement of
//     the same rule: delete the hardening rule and these still bite.
//   * every FAILURE path of the validator is exercised on synthetic input. A
//     guard whose failure paths are only ever probed by hand is a guard nobody
//     knows still works, which is precisely how the original six loops rotted.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  CAMPAIGN_CERTIFICATION_SCHEMA_VERSION,
  LANE_GATE_COMMANDS,
  laneSuites,
  validateCampaignCertification,
} from '../../bin/lib/campaign-certification.mjs';

const root = path.resolve(__dirname, '..', '..');
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

const REGISTRY_FILE = 'config/campaign-certification.v1.json';
const registry = () => readJson(REGISTRY_FILE);
const gate = () => readJson('config/quality-gate.v1.json');

function realInput(overrides: Record<string, unknown> = {}) {
  const reg = registry();
  const lanes = new Map<string, unknown>();
  for (const lane of reg.lanes) lanes.set(lane, readJson(lane));
  return {
    registry: reg,
    gate: gate(),
    lanes,
    campaignTasks: fs.readdirSync(path.join(root, '.agent', 'tasks'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
    suiteExists: (suite: string) => fs.existsSync(path.join(root, suite)),
    ...overrides,
  } as Parameters<typeof validateCampaignCertification>[0];
}

// A minimal self-consistent world, so a negative probe changes exactly one
// thing and the resulting error is attributable to that one thing.
function syntheticInput(overrides: Record<string, unknown> = {}) {
  return {
    registry: {
      schemaVersion: CAMPAIGN_CERTIFICATION_SCHEMA_VERSION,
      campaignTaskRoot: '.agent/tasks',
      campaignTaskPattern: '-(c|r)[0-9]+[a-z]*-v[0-9]+$',
      lanes: ['config/synthetic-campaign.v1.json'],
      campaigns: [{ id: 'C-99', task: 'demo-c99-v1', suites: ['tests/unit/demo.test.ts'] }],
    },
    gate: { groups: [{ commandKey: 'SYNTHETIC_CAMPAIGN', required: true }] },
    lanes: new Map([['config/synthetic-campaign.v1.json', { files: ['tests/unit/demo.test.ts'] }]]),
    campaignTasks: ['demo-c99-v1', 'phase-99-not-a-campaign'],
    suiteExists: () => true,
    ...overrides,
  } as Parameters<typeof validateCampaignCertification>[0];
}

test.describe('R-12 — the real repository satisfies the three conjuncts', () => {
  test('the live registry validates with zero violations', () => {
    expect(validateCampaignCertification(realInput())).toEqual([]);
  });

  test('the synthetic baseline itself is clean, so every probe below is attributable', () => {
    expect(validateCampaignCertification(syntheticInput())).toEqual([]);
  });

  test('every campaign task directory in the ledger is declared', () => {
    const reg = registry();
    const pattern = new RegExp(reg.campaignTaskPattern);
    const ledger = fs.readdirSync(path.join(root, '.agent', 'tasks'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && pattern.test(entry.name))
      .map((entry) => entry.name);
    expect(ledger.length).toBeGreaterThanOrEqual(11);
    const declared = new Set(reg.campaigns.map((campaign: { task: string }) => campaign.task));
    expect(ledger.filter((task) => !declared.has(task))).toEqual([]);
  });

  test('every declared suite exists on disk', () => {
    const missing = registry().campaigns
      .flatMap((campaign: { suites: string[] }) => campaign.suites)
      .filter((suite: string) => !fs.existsSync(path.join(root, suite)));
    expect(missing).toEqual([]);
  });

  test('every declared suite is registered in a lane a REQUIRED gate group runs', () => {
    const reg = registry();
    const required = new Set(
      gate().groups.filter((group: { required: boolean }) => group.required === true)
        .map((group: { commandKey: string }) => group.commandKey),
    );
    const registered = new Set<string>();
    for (const lane of reg.lanes) {
      expect(LANE_GATE_COMMANDS[lane as keyof typeof LANE_GATE_COMMANDS]).toBeTruthy();
      expect(required.has(LANE_GATE_COMMANDS[lane as keyof typeof LANE_GATE_COMMANDS])).toBe(true);
      for (const suite of laneSuites(readJson(lane))) registered.add(suite);
    }
    const unregistered = reg.campaigns
      .flatMap((campaign: { suites: string[] }) => campaign.suites)
      .filter((suite: string) => !registered.has(suite));
    expect(unregistered).toEqual([]);
  });

  test('no suite and no campaign is declared twice', () => {
    const reg = registry();
    const suites = reg.campaigns.flatMap((campaign: { suites: string[] }) => campaign.suites);
    expect(new Set(suites).size).toBe(suites.length);
    const ids = reg.campaigns.map((campaign: { id: string }) => campaign.id);
    expect(new Set(ids).size).toBe(ids.length);
    const tasks = reg.campaigns.map((campaign: { task: string }) => campaign.task);
    expect(new Set(tasks).size).toBe(tasks.length);
  });
});

test.describe('R-12 — the exact historical debt, named', () => {
  // These six are the suites the gate had never run. Naming them individually
  // means a future de-registration is reported as the specific regression it
  // is, not as an anonymous count that changed.
  const historicallyUnregistered = [
    'tests/unit/sourceOperationCompleteness.test.ts',
    'tests/unit/sourceInventoryCompleteness.test.ts',
    'tests/unit/cacheCurrentness.test.ts',
    'tests/unit/callScopedSourceRead.test.ts',
    'tests/unit/c02aOpenApiAdmission.test.ts',
    'tests/unit/c06PhpReadOnlyProof.test.ts',
  ];

  for (const suite of historicallyUnregistered) {
    test(`${suite} is declared and gate-registered`, () => {
      const reg = registry();
      expect(reg.campaigns.flatMap((campaign: { suites: string[] }) => campaign.suites)).toContain(suite);
      const registered = new Set(reg.lanes.flatMap((lane: string) => laneSuites(readJson(lane))));
      expect(registered.has(suite)).toBe(true);
    });
  }

  test('the campaigns whose loops were retired keep their coverage exactly', () => {
    // Retiring the six hand-written loops must not lose a single suite they
    // guarded, so each retired loop's suite list is asserted here verbatim.
    const declared = new Map<string, string[]>(
      registry().campaigns.map((campaign: { id: string; suites: string[] }) => [campaign.id, campaign.suites]),
    );
    expect(declared.get('C-02b')).toEqual([
      'tests/unit/c02bProtoLexer.test.ts',
      'tests/unit/c02bProtoSurface.test.ts',
      'tests/unit/c02bProtoCorroboration.test.ts',
    ]);
    expect(declared.get('C-03')).toEqual([
      'tests/unit/c03GoRegistration.test.ts',
      'tests/unit/c03GrpcTopology.test.ts',
    ]);
    expect(declared.get('C-04')).toEqual([
      'tests/unit/c04FrontendConsumer.test.ts',
      'tests/unit/c04FrontendGraph.test.ts',
    ]);
    expect(declared.get('C-11')).toEqual([
      'tests/unit/c11ProdObserveKernel.test.ts',
      'tests/unit/c11ProdObserveEvidence.test.ts',
    ]);
    expect(declared.get('C-15b')).toEqual([
      'tests/unit/c15bSystemMap.test.ts',
      'tests/unit/c15bControlCenterAuthority.test.ts',
    ]);
    expect(declared.get('R-11')).toEqual([
      'tests/unit/phase23PortLease.test.ts',
      'tests/unit/phase24ProxyLifecycle.test.ts',
      'tests/unit/proxyPortLeaseDeterminism.test.ts',
      'tests/unit/proxyPortLeaseStress.test.ts',
      'tests/unit/gateReceiptPersistence.test.ts',
    ]);
  });
});

test.describe('R-12 — every failure path bites', () => {
  const detects = (overrides: Record<string, unknown>, fragment: string) => {
    const violations = validateCampaignCertification(syntheticInput(overrides));
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.join('\n')).toContain(fragment);
  };

  test('a de-registered suite is detected', () => {
    detects({ lanes: new Map([['config/synthetic-campaign.v1.json', { files: [] }]]) },
      'is not registered in any authoritative quality-gate lane');
  });

  test('a suite deleted from disk is detected', () => {
    detects({ suiteExists: () => false }, 'is declared but does not exist on disk');
  });

  test('a campaign dropped from the registry is detected', () => {
    const reg = syntheticInput().registry as { campaigns: unknown[] };
    detects({ registry: { ...reg, campaigns: [{ id: 'C-98', task: 'other-c98-v1', suites: [] as string[], reason: 'declared' }] } },
      'is in the task ledger but declares no certification suites');
  });

  test('an empty suite set without a reason is detected', () => {
    const reg = syntheticInput().registry as Record<string, unknown>;
    detects({ registry: { ...reg, campaigns: [{ id: 'C-99', task: 'demo-c99-v1', suites: [] }] } },
      'declares no certification suite and no reason');
  });

  test('an empty suite set WITH a reason is admissible', () => {
    const reg = syntheticInput().registry as Record<string, unknown>;
    expect(validateCampaignCertification(syntheticInput({
      registry: { ...reg, campaigns: [{ id: 'C-99', task: 'demo-c99-v1', suites: [], reason: 'certifies through C-98' }] },
    }))).toEqual([]);
  });

  test('a lane that is not an authoritative manifest is detected', () => {
    const reg = syntheticInput().registry as Record<string, unknown>;
    detects({ registry: { ...reg, lanes: ['config/made-up.json'] } },
      'is not an authoritative gate manifest');
  });

  test('a lane whose gate group is not REQUIRED is detected', () => {
    detects({ gate: { groups: [{ commandKey: 'SYNTHETIC_CAMPAIGN', required: false }] } },
      'which is not a REQUIRED gate group');
  });

  test('a lane that cannot be parsed is detected, not skipped', () => {
    detects({ lanes: new Map() }, 'could not be read as JSON');
  });

  test('a wrong schema version fails closed before anything else', () => {
    const reg = syntheticInput().registry as Record<string, unknown>;
    detects({ registry: { ...reg, schemaVersion: 'nightwatch.campaign-certification.v2' } },
      `must declare schemaVersion ${CAMPAIGN_CERTIFICATION_SCHEMA_VERSION}`);
  });

  test('a duplicate campaign id is detected', () => {
    const reg = syntheticInput().registry as Record<string, unknown>;
    detects({
      registry: {
        ...reg,
        campaigns: [
          { id: 'C-99', task: 'demo-c99-v1', suites: ['tests/unit/demo.test.ts'] },
          { id: 'C-99', task: 'other-c99-v1', suites: [] as string[], reason: 'x' },
        ],
      },
    }, 'declares campaign C-99 more than once');
  });

  test('one suite claimed by two campaigns is detected', () => {
    const reg = syntheticInput().registry as Record<string, unknown>;
    detects({
      registry: {
        ...reg,
        campaigns: [
          { id: 'C-99', task: 'demo-c99-v1', suites: ['tests/unit/demo.test.ts'] },
          { id: 'C-98', task: 'demo-c98-v1', suites: ['tests/unit/demo.test.ts'] },
        ],
      },
      campaignTasks: ['demo-c99-v1', 'demo-c98-v1'],
    }, 'is declared by more than one campaign');
  });

  test('a malformed suite path is detected', () => {
    const reg = syntheticInput().registry as Record<string, unknown>;
    detects({ registry: { ...reg, campaigns: [{ id: 'C-99', task: 'demo-c99-v1', suites: ['src/core/thing.ts'] }] } },
      'declares a malformed certification suite path');
  });

  test('an empty campaign ledger is a failure, never a vacuous pass', () => {
    detects({ campaignTasks: ['phase-99-not-a-campaign'] },
      'the totality rule would be vacuous');
  });

  test('a malformed campaignTaskPattern fails closed', () => {
    const reg = syntheticInput().registry as Record<string, unknown>;
    detects({ registry: { ...reg, campaignTaskPattern: '([' } },
      'must be a valid regular expression');
  });

  test('an entry missing its id, task or suites is detected', () => {
    const reg = syntheticInput().registry as Record<string, unknown>;
    detects({ registry: { ...reg, campaigns: [{ task: 'demo-c99-v1', suites: [] as string[] }] } },
      'must carry a non-empty string id');
  });

  test('a non-object or empty registry fails closed rather than passing empty', () => {
    expect(validateCampaignCertification(syntheticInput({ registry: null })).join('\n'))
      .toContain('must be a JSON object');
    const reg = syntheticInput().registry as Record<string, unknown>;
    expect(validateCampaignCertification(syntheticInput({ registry: { ...reg, campaigns: [] } })).join('\n'))
      .toContain('non-empty campaigns array');
    expect(validateCampaignCertification(syntheticInput({ registry: { ...reg, lanes: [] } })).join('\n'))
      .toContain('non-empty lanes array');
  });
});

test.describe('R-12 — laneSuites reads both manifest shapes', () => {
  test('phaseSuites, supportFiles and files are all collected', () => {
    expect(laneSuites({
      phaseSuites: [{ phase: 9, files: ['tests/unit/a.test.ts'] }],
      supportFiles: ['tests/unit/b.test.ts'],
      files: ['tests/unit/c.test.ts'],
    })).toEqual(['tests/unit/a.test.ts', 'tests/unit/b.test.ts', 'tests/unit/c.test.ts']);
  });

  test('a malformed manifest yields no suites rather than throwing', () => {
    expect(laneSuites(null)).toEqual([]);
    expect(laneSuites({ phaseSuites: 'nope', supportFiles: 3, files: null })).toEqual([]);
  });

  test('both real lane manifests are non-empty, so neither conjunct is vacuous', () => {
    for (const lane of Object.keys(LANE_GATE_COMMANDS)) {
      expect(laneSuites(readJson(lane)).length).toBeGreaterThan(0);
    }
  });
});
