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
      'GATE_DEFINITION', 'STATIC', 'HARDENING', 'HANDOFF_TRUTH', 'PROJECT_TRUTH', 'AGENT_CONTINUITY',
      'SEMANTIC_COMPATIBILITY', 'OWNER_PROVENANCE', 'SYNTHETIC_CAMPAIGN', 'PATCH_INTEGRITY',
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
    expect(handoff?.dependsOn).toEqual(['HARDENING']);
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
