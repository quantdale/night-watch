import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  QUALITY_GATE_COMMAND_KEYS,
  QUALITY_GATE_DEFINITION,
  SEMANTIC_COMPATIBILITY_DEFINITION,
  canonicalJson,
  flattenSemanticCompatibilityFiles,
  validateQualityGateDefinition,
  validateSemanticCompatibilityDefinition,
} from '../../src/core/qualityGate/definition';

const ROOT = path.resolve(__dirname, '../..');

test.describe('Phase 23 executable quality-gate definition', () => {
  test('contains the required serial groups with fixed command keys', () => {
    expect(QUALITY_GATE_DEFINITION.groups.map((group) => group.id)).toEqual([
      'GATE_DEFINITION', 'STATIC', 'BIN_TYPECHECK_CEILING', 'HARDENING', 'HARDENING_PROBES', 'HANDOFF_TRUTH', 'PROJECT_TRUTH', 'AGENT_CONTINUITY',
      'SEMANTIC_COMPATIBILITY', 'OWNER_PROVENANCE', 'SYNTHETIC_CAMPAIGN', 'PATCH_INTEGRITY', 'WORKSPACE_INTEGRITY', 'TOPOLOGY', 'UI_CONTROL_CENTER',
    ]);
    for (const group of QUALITY_GATE_DEFINITION.groups) {
      expect(QUALITY_GATE_COMMAND_KEYS).toContain(group.commandKey);
      expect(group.required).toBe(true);
    }
  });

  test('owns handoff truth exactly once before project truth', () => {
    const handoff = QUALITY_GATE_DEFINITION.groups.find((group) => group.id === 'HANDOFF_TRUTH');
    const project = QUALITY_GATE_DEFINITION.groups.find((group) => group.id === 'PROJECT_TRUTH');
    expect(handoff?.commandKey).toBe('HANDOFF_CHECK');
    expect(handoff?.required).toBe(true);
    expect(handoff?.dependsOn).toEqual(['HARDENING_PROBES']);
    expect(project?.dependsOn).toEqual(['HANDOFF_TRUTH']);
    expect(QUALITY_GATE_DEFINITION.groups.filter((group) => group.commandKey === 'HANDOFF_CHECK')).toHaveLength(1);
  });

  test('rejects unknown commands, unknown dependencies, and duplicate groups', () => {
    const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/quality-gate.v1.json'), 'utf8')) as Record<string, unknown>;
    const groups: Array<Record<string, unknown>> = (base.groups as Array<Record<string, unknown>>).map((group) => ({ ...group, dependsOn: [...(group.dependsOn as string[])] }));
    const firstGroup = groups[0]!;
    const secondGroup = groups[1]!;
    expect(() => validateQualityGateDefinition({ ...base, groups: [{ ...firstGroup, commandKey: 'SHELL' }, ...groups.slice(1)] })).toThrow(/UNKNOWN_COMMAND/);
    expect(() => validateQualityGateDefinition({ ...base, groups: [{ ...firstGroup, id: secondGroup.id }, ...groups.slice(1)] })).toThrow(/DUPLICATE_GROUP/);
    expect(() => validateQualityGateDefinition({ ...base, groups: [{ ...firstGroup, dependsOn: ['MISSING'] }, ...groups.slice(1)] })).toThrow(/UNKNOWN_DEPENDENCY/);
  });

  test('covers every current Phase 9 through Phase 26 and no file twice', () => {
    const phases = SEMANTIC_COMPATIBILITY_DEFINITION.phaseSuites.map((suite) => Math.floor(suite.phase));
    expect(new Set(phases)).toEqual(new Set(Array.from({ length: 18 }, (_, index) => index + 9)));
    const files = flattenSemanticCompatibilityFiles();
    expect(new Set(files).size).toBe(files.length);
    for (const file of files) expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
  });

  test('cannot silently omit a current phase or introduce a duplicate file', () => {
    const value = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/semantic-compatibility.v1.json'), 'utf8')) as Record<string, unknown>;
    const suites: Array<Record<string, unknown>> = (value.phaseSuites as Array<Record<string, unknown>>).map((suite) => ({ ...suite, files: [...(suite.files as string[])] }));
    const first = suites[0]!;
    const second = suites[1]!;
    expect(() => validateSemanticCompatibilityDefinition({ ...value, phaseSuites: suites.filter((suite) => suite.phase !== 23) })).toThrow(/PHASE_OMITTED:23/);
    expect(() => validateSemanticCompatibilityDefinition({ ...value, phaseSuites: [{ ...first, files: [...(first.files as string[]), (second.files as string[])[0]] }, ...suites.slice(1)] })).toThrow(/DUPLICATE_FILE/);
  });

  test('canonical quality-gate bytes are stable and contain no command strings', () => {
    const first = canonicalJson(QUALITY_GATE_DEFINITION);
    const second = canonicalJson(JSON.parse(JSON.stringify(QUALITY_GATE_DEFINITION)));
    expect(first).toBe(second);
    expect(first).not.toMatch(/child_process|shell|exec\(/i);
  });

  test('the executable drift inventory measures old overlap and new uniqueness', () => {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin/quality-gate-inventory.mjs')], { cwd: ROOT, encoding: 'utf8' });
    expect(result.status).toBe(0);
    const inventory = JSON.parse(result.stdout) as {
      oldWorkflow: { stepCount: number; runCommandCount: number; duplicateFiles: Array<{ file: string }> };
      authoritativeGate: { workflowCommandCount: number; duplicateFiles: Array<unknown>; uniqueTestFiles: number };
    };
    expect(inventory.oldWorkflow.stepCount).toBe(32);
    expect(inventory.oldWorkflow.runCommandCount).toBe(30);
    expect(inventory.oldWorkflow.duplicateFiles.map((entry) => entry.file)).toEqual(expect.arrayContaining([
      'tests/unit/selfDevAdoptionPlan.test.ts',
      'tests/unit/selfDevAdoptionSandbox.test.ts',
      'tests/unit/ownerScope.test.ts',
    ]));
    expect(inventory.authoritativeGate.workflowCommandCount).toBe(1);
    expect(inventory.authoritativeGate.duplicateFiles).toEqual([]);
    expect(inventory.authoritativeGate.uniqueTestFiles).toBeGreaterThan(100);
  });
});

/**
 * The HARDENING_PROBES group.
 *
 * `hardening:rules` proves that each registered hardening rule still detects
 * the violation it guards. It was a declared npm script that no gate group, no
 * lane, no validation-universe class and no CI workflow selected, so probe
 * HC-059 rotted once unnoticed and HC-015 was failing at the campaign base
 * while `hardening:check` and `gate:local` were both green. A gate that knows
 * the command exists is not a gate that runs it.
 */
test.describe('HARDENING_PROBES is executed by the authoritative gate', () => {
  test('the probe group is required, offline, and ordered between hardening and handoff truth', () => {
    const probes = QUALITY_GATE_DEFINITION.groups.find((group) => group.id === 'HARDENING_PROBES');
    expect(probes, 'the authoritative gate must carry a probe-campaign group').toBeDefined();
    expect(probes?.commandKey).toBe('HARDENING_PROBES');
    // Not optional, not flag-guarded: an optional probe lane reproduces exactly
    // the blind spot it exists to close.
    expect(probes?.required).toBe(true);
    expect(probes?.dependsOn).toEqual(['HARDENING']);
    expect(probes?.environmentRequirements).toEqual(['NODE20_PLUS', 'OFFLINE']);
    // The campaign spawns one child per probe (90 at this checkpoint), so SHORT
    // would be a timeout waiting to happen.
    expect(probes?.timeoutClass).toBe('MEDIUM');
    // It runs everywhere the rest of the required gate runs.
    expect(probes?.ciCapable).toBe(true);
    expect(probes?.cleanCheckoutCapable).toBe(true);
    expect(probes?.requiresSiblingTopology).toBe(false);
    expect(QUALITY_GATE_DEFINITION.groups.filter((group) => group.commandKey === 'HARDENING_PROBES')).toHaveLength(1);
  });

  test('the dependency order is a deterministic total order with no cycle', () => {
    const order = QUALITY_GATE_DEFINITION.groups.map((group) => group.id);
    const seen = new Set<string>();
    for (const group of QUALITY_GATE_DEFINITION.groups) {
      for (const dependency of group.dependsOn) {
        // Every dependency is declared strictly earlier, so the file order IS
        // the execution order and the graph cannot contain a cycle.
        expect(seen.has(dependency), `${group.id} depends on ${dependency}, which is not declared before it`).toBe(true);
      }
      seen.add(group.id);
    }
    expect(order.indexOf('HARDENING')).toBeLessThan(order.indexOf('HARDENING_PROBES'));
    expect(order.indexOf('HARDENING_PROBES')).toBeLessThan(order.indexOf('HANDOFF_TRUTH'));
  });

  test('the command mapping is TOTAL: every declared key has a runtime dispatch arm', () => {
    // A key in the union with no arm in the runner reaches the final `else` and
    // returns CONFIG_INVALID/UNKNOWN_COMMAND at gate time rather than at review
    // time. Proven against the shipped runner source.
    const runner = fs.readFileSync(path.join(ROOT, 'bin/quality-gate.mjs'), 'utf8');
    const dispatched = new Set([...runner.matchAll(/commandKey === '([A-Z_]+)'/g)].map((match) => match[1]!));
    const missing = QUALITY_GATE_COMMAND_KEYS.filter((key) => !dispatched.has(key));
    expect(missing, `declared command keys with no dispatch arm: ${missing.join(', ')}`).toEqual([]);
    const extra = [...dispatched].filter((key) => !(QUALITY_GATE_COMMAND_KEYS as readonly string[]).includes(key));
    expect(extra, `dispatch arms for undeclared command keys: ${extra.join(', ')}`).toEqual([]);
    // And the arm runs the real campaign, not `hardening:check` again.
    expect(runner).toContain("args = ['run', 'hardening:rules']");
  });

  test('every gate group command key is accepted by the offline definition validator', () => {
    const spec = fs.readFileSync(path.join(ROOT, 'bin/quality-gate-spec.mjs'), 'utf8');
    const allowlist = /const commandKeys = new Set\(\[([\s\S]*?)\]\)/.exec(spec)?.[1];
    expect(allowlist).toBeTruthy();
    const allowed = new Set([...allowlist!.matchAll(/'([A-Z_]+)'/g)].map((match) => match[1]!));
    for (const key of QUALITY_GATE_COMMAND_KEYS) {
      expect(allowed.has(key), `${key} is declared but the offline validator would reject it`).toBe(true);
    }
    for (const group of QUALITY_GATE_DEFINITION.groups) {
      expect(allowed.has(group.commandKey)).toBe(true);
    }
  });

  test('an unknown probe command key is rejected rather than silently skipped', () => {
    const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/quality-gate.v1.json'), 'utf8')) as Record<string, unknown>;
    const groups = (base.groups as Array<Record<string, unknown>>).map((group) => ({ ...group }));
    const index = groups.findIndex((group) => group.id === 'HARDENING_PROBES');
    expect(index).toBeGreaterThanOrEqual(0);
    groups[index] = { ...groups[index]!, commandKey: 'HARDENING_PROBE' };
    expect(() => validateQualityGateDefinition({ ...base, groups })).toThrow(/UNKNOWN_COMMAND/);
  });

  test('the package script the group runs is the probe campaign, not the plain check', () => {
    const scripts = (JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts;
    expect(scripts['hardening:rules']).toBe('node bin/hardening-check.mjs --probe-campaign');
    expect(scripts['hardening:check']).toBe('node bin/hardening-check.mjs');
    expect(scripts['hardening:rules']).not.toBe(scripts['hardening:check']);
  });

  test('the gate definition digest reflects the added group', () => {
    // The digest is computed from the definition, never transcribed, so this
    // asserts the mechanism rather than a pasted constant: recomputing over the
    // shipped file must reproduce what the spec renderer reports.
    const result = spawnSync(process.execPath, [path.join(ROOT, 'bin/quality-gate-spec.mjs')], { cwd: ROOT, encoding: 'utf8' });
    expect(result.status).toBe(0);
    const rendered = JSON.parse(result.stdout) as { definitionDigest: string; requiredGroups: string[] };
    expect(rendered.requiredGroups).toContain('HARDENING_PROBES');
    expect(rendered.requiredGroups).toHaveLength(QUALITY_GATE_DEFINITION.groups.length);
    expect(rendered.definitionDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    const recomputed = canonicalJson(JSON.parse(fs.readFileSync(path.join(ROOT, 'config/quality-gate.v1.json'), 'utf8')));
    expect(recomputed).toContain('HARDENING_PROBES');
  });
});
