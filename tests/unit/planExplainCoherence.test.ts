// `plan` → `explain` cross-command coherence: the first member id
// emitted by `plan --json` must resolve in `explain <member-id>
// --json` with the matching requestedId, explanation
// PRIORITY_COMPONENTS_AND_GATES, and a non-null item. Local synthetic
// preview only; no network, no auth, no product contact.

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '..', '..');

function runCli(args: readonly string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'nightwatch-intelligence.mjs'), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 180000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return { status: result.status, stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
}

test.describe('plan to explain coherence', () => {
  test('plan-emitted member id explains positively', () => {
    const plan = runCli(['plan', '--json']);
    expect(plan.status).toBe(0);
    const planDocument = JSON.parse(plan.stdout) as { plan?: { items?: Array<{ memberId?: unknown }> } };
    const items = planDocument.plan?.items ?? [];
    expect(items.length).toBeGreaterThan(0);
    const memberId = items[0]?.memberId;
    expect(typeof memberId).toBe('string');
    const explained = runCli(['explain', memberId as string, '--json']);
    expect(explained.status).toBe(0);
    const explainedDocument = JSON.parse(explained.stdout) as {
      command?: unknown;
      requestedId?: unknown;
      item?: unknown;
      explanation?: unknown;
    };
    expect(explainedDocument.command).toBe('explain');
    expect(explainedDocument.requestedId).toBe(memberId);
    expect(explainedDocument.explanation).toBe('PRIORITY_COMPONENTS_AND_GATES');
    expect(explainedDocument.item).not.toBeNull();
  });
});
