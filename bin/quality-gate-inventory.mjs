#!/usr/bin/env node

// Deterministic CI drift/duplication inventory. It reads the workflow and
// versioned gate manifests only; it never runs a test, opens a socket, or
// contacts GitHub.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowFile = path.join(root, '.github', 'workflows', 'hardening.yml');
const gateFile = path.join(root, 'config', 'quality-gate.v1.json');
const compatibilityFile = path.join(root, 'config', 'semantic-compatibility.v1.json');
const LEGACY_WORKFLOW_SHA = 'ac3df00195eef846a8e9e42615e90b4b912877d2';
const testFilePattern = /tests\/(?:unit|smoke)\/[A-Za-z0-9._/-]+\.test\.ts/g;

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function readLegacyWorkflow() {
  const result = spawnSync('git', ['show', `${LEGACY_WORKFLOW_SHA}:.github/workflows/hardening.yml`], {
    cwd: root,
    encoding: 'utf8',
    timeout: 10_000,
    maxBuffer: 2 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0 || !result.stdout) throw new Error('LEGACY_WORKFLOW_BASELINE_UNAVAILABLE');
  return result.stdout;
}

function phaseOwnership(name) {
  const match = /Phase\s+([0-9]+(?:\.[0-9A-Za-z]+)?)/i.exec(name);
  return match ? `PHASE_${match[1].replace(/[^0-9A-Za-z]+/g, '_').toUpperCase()}` : 'CROSS_CUTTING';
}

function extractSteps(text) {
  const lines = text.split(/\r?\n/);
  const steps = [];
  let current = null;
  const flush = () => { if (current) steps.push(current); current = null; };
  for (const line of lines) {
    const name = /^\s{6}- name:\s*(.*)$/.exec(line);
    if (name) {
      flush();
      current = { identity: name[1].trim(), commandLines: [], uses: null };
      continue;
    }
    if (!current) continue;
    const uses = /^\s{8}uses:\s*(.*)$/.exec(line);
    if (uses) current.uses = uses[1].trim();
    const run = /^\s{8}run:\s?(.*)$/.exec(line);
    if (run) current.commandLines.push(run[1] === '|' ? '' : run[1].trim());
    else if (current.commandLines.length > 0 && /^\s{10,}\S/.test(line) && !/^\s{8}(?:with|env|if):/.test(line)) current.commandLines.push(line.trim());
  }
  flush();
  return steps.map((step, index) => {
    const command = step.commandLines.join('\n').trim();
    const files = [...new Set(command.match(testFilePattern) ?? [])];
    const githubSpecific = Boolean(step.uses) || /git status|github|actions|checkout|setup-node/i.test(command);
    const privacy = /owner|ai|self.?dev|artifact|campaign|storage|auth/i.test(`${step.identity} ${command}`);
    return {
      stepIdentity: `legacy-${String(index + 1).padStart(2, '0')}`,
      identity: step.identity,
      command: command || (step.uses ? `uses ${step.uses}` : '(no run command)'),
      testFiles: files,
      approximatePhaseOwnership: phaseOwnership(step.identity),
      stillAuthoritative: false,
      duplicatedElsewhere: false,
      newerCompatibilitySubsumes: files.length > 0,
      requiresGitHubSpecificEnvironment: githubSpecific,
      canRunOffline: !githubSpecific,
      dependsOnSiblingRepositories: false,
      privacySafetyImplications: privacy,
    };
  });
}

function newGateGroups() {
  const gate = JSON.parse(read(gateFile));
  const compatibility = JSON.parse(read(compatibilityFile));
  const semanticFiles = [...compatibility.phaseSuites.flatMap((suite) => suite.files), ...(compatibility.supportFiles ?? [])];
  return gate.groups.map((group) => {
    const files = group.commandKey === 'SEMANTIC_COMPATIBILITY'
      ? semanticFiles
      : group.commandKey === 'OWNER_PROVENANCE'
        ? ['tests/unit/privateArtifactAtomic.test.ts', 'tests/unit/aiOwnerReview.test.ts', 'tests/unit/aiReview.test.ts']
        : group.commandKey === 'SYNTHETIC_CAMPAIGN'
          ? ['tests/unit/campaign.test.ts', 'tests/unit/phase24SyntheticCampaign.test.ts', 'tests/unit/phase25SyntheticCampaign.test.ts', 'tests/unit/phase26SyntheticCampaign.test.ts', 'tests/unit/phase27ResponseFlow.test.ts', 'tests/unit/phase28SourceIntelligence.test.ts']
          : [];
    return {
      groupId: group.id,
      commandKey: group.commandKey,
      required: group.required,
      testFiles: files,
      intentionalDuplicateReasonCodes: [],
      ciCapable: group.ciCapable,
      cleanCheckoutCapable: group.cleanCheckoutCapable,
      requiresSiblingTopology: group.requiresSiblingTopology,
      preDevRelevant: group.preDevRelevant,
    };
  });
}

function countFiles(groups) {
  const counts = new Map();
  for (const group of groups) for (const file of group.testFiles) counts.set(file, (counts.get(file) ?? 0) + 1);
  return counts;
}

try {
  const steps = extractSteps(readLegacyWorkflow());
  const oldCounts = countFiles(steps);
  for (const step of steps) step.duplicatedElsewhere = step.testFiles.some((file) => (oldCounts.get(file) ?? 0) > 1);
  const groups = newGateGroups();
  const newCounts = countFiles(groups);
  const oldDuplicates = [...oldCounts.entries()].filter(([, count]) => count > 1).map(([file, count]) => ({ file, executions: count, reasonCode: 'HISTORICAL_MATRIX_OVERLAP' }));
  const newDuplicates = [...newCounts.entries()].filter(([, count]) => count > 1).map(([file, count]) => ({ file, executions: count, reasonCode: 'UNCLASSIFIED_DUPLICATE' }));
  const result = {
    schemaVersion: 'nightwatch.quality-gate-inventory.v1',
      workflow: '.github/workflows/hardening.yml',
      baselineSha: LEGACY_WORKFLOW_SHA,
    oldWorkflow: {
      stepCount: steps.length,
      runCommandCount: steps.filter((step) => step.command !== '(no run command)' && !step.command.startsWith('uses ')).length,
      historicalMatrixCount: steps.filter((step) => step.approximatePhaseOwnership !== 'CROSS_CUTTING').length,
      duplicatedTestFileExecutions: [...oldCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0),
      uniqueTestFiles: oldCounts.size,
      duplicateFiles: oldDuplicates,
      steps,
    },
    authoritativeGate: {
      schemaVersion: 'nightwatch.quality-gate.v1',
      workflowCommandCount: 1,
      logicalGroupCount: groups.length,
      uniqueTestFiles: newCounts.size,
      duplicateTestFileExecutions: [...newCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0),
      duplicateFiles: newDuplicates,
      groups,
    },
    drift: {
      missingModernPhases: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22].filter((phase) => !steps.some((step) => step.approximatePhaseOwnership === `PHASE_${phase}`)),
      oldWorkflowContainsHandMaintainedTestCommands: steps.some((step) => /playwright test|npm run campaign:synthetic|test:owner-provenance/.test(step.command)),
      newGateUsesFixedCommandRegistry: true,
    },
  };
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(JSON.stringify({ status: 'INVENTORY_INVALID', code: error instanceof Error ? error.message : 'INVENTORY_INVALID' }));
  process.exitCode = 1;
}
