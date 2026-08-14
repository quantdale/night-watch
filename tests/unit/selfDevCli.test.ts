import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const CLI = path.resolve(process.cwd(), 'bin', 'selfdev-synthetic.mjs');

test('Phase 8A synthetic CLI is a thin deterministic wrapper with no runtime authority expansion', () => {
  const source = fs.readFileSync(CLI, 'utf8');
  expect(source).toContain('parseArgs');
  expect(source).toContain('runSyntheticSelfDevSession');
  expect(source).toContain('--help');
  expect(source).not.toMatch(/node:child_process|fetch\s*\(|http\.request|https\.request|net\.connect|WebSocket/);
  expect(source).not.toMatch(/git\s+(?:add|apply|commit|push)/i);
  expect(source).not.toMatch(/AiReviewSession|LoopbackAiReviewProvider|owner-review|NIGHTWATCH_STORAGE_STATE/);
  expect(source).not.toMatch(/fs\.(?:write|append|rename|unlink|rm|copy|mkdir|link)/i);
  expect(source).not.toContain('process.env');
});
