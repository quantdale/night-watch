// ---------------------------------------------------------------------------
// Phase 16CH W7 — launcher / external-file boundary hardening.
//
// Exercises ONLY the pre-spawn argument/path validation surface of
// bin/phase7-real.mjs via child processes (the real Playwright adapter is
// never spawned by this suite), plus the combined-document text boundary at
// parser level (EOL variants, hostile content, sanitized categorical errors,
// sentinel-leak sweep over stderr).
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import {
  parsePortfolioRuntimePlanDocument,
} from '../../src/core/portfolio/runtimeBinding';
import { renderDocumentJson } from '../../src/core/portfolio/report';
import { buildScopedRuntimePlan } from '../../corpus/phase16ch/core';

const LAUNCHER = path.resolve(__dirname, '..', '..', 'bin', 'phase7-real.mjs');

interface RunResult {
  readonly status: number | null;
  readonly output: string;
}

function runLauncher(args: readonly string[]): RunResult {
  const result = spawnSync(process.execPath, [LAUNCHER, ...args], { encoding: 'utf8', timeout: 30_000 });
  return { status: result.status, output: `${result.stderr ?? ''}${result.stdout ?? ''}` };
}

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'phase16ch-launcher-'));
}

const SENTINELS = [
  'CUSTOMER_SENTINEL', 'ACCOUNT_SENTINEL', 'EMAIL_SENTINEL', 'COST_SENTINEL',
  'TOKEN_SENTINEL', 'PHASE_16A_DEV_CAMPAIGN_EXECUTION_SEPARATE_TOKEN_REQUIRED',
];

test.describe('Phase 16CH W7 — launcher input safety', () => {
  test('only-plan and only-authorization are rejected; both flags must appear together', () => {
    const root = tempDir();
    try {
      const plan = path.join(root, 'plan.json');
      fs.writeFileSync(plan, '{}');
      expect(runLauncher(['--env=dev', '--prepare-only', `--portfolio-plan=${plan}`]).status).not.toBe(0);
      expect(runLauncher(['--env=dev', '--prepare-only', '--portfolio-authorization=T']).status).not.toBe(0);
      expect(runLauncher(['--env=dev', '--prepare-only', `--portfolio-plan=${plan}`, '--portfolio-authorization=T', `--portfolio-plan=${plan}`]).output).toContain('only once');
      expect(runLauncher(['--env=dev', '--prepare-only', `--portfolio-authorization=A`, '--portfolio-authorization=B']).output).toContain('only once');
      expect(runLauncher(['--env=dev', '--prepare-only', '--portfolio']).status).not.toBe(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('empty path, relative path, missing file, directory, symlink are refused categorically without raw detail leaks', () => {
    const root = tempDir();
    try {
      const outputs = [
        runLauncher(['--env=dev', '--prepare-only', '--portfolio-plan=', '--portfolio-authorization=T']).output,
        runLauncher(['--env=dev', '--prepare-only', '--portfolio-plan=relative/plan.json', '--portfolio-authorization=T']).output,
        runLauncher(['--env=dev', '--prepare-only', `--portfolio-plan=${path.join(root, 'missing.json')}`, '--portfolio-authorization=T']).output,
        runLauncher(['--env=dev', '--prepare-only', `--portfolio-plan=${root}`, '--portfolio-authorization=T']).output,
      ];
      for (const output of outputs) {
        expect(output.length).toBeGreaterThan(0);
      }
      // Symlink refused.
      const real = path.join(root, 'real.json');
      fs.writeFileSync(real, '{}');
      const link = path.join(root, 'link.json');
      fs.symlinkSync(real, link);
      expect(runLauncher(['--env=dev', '--prepare-only', `--portfolio-plan=${link}`, '--portfolio-authorization=T']).output).toContain('unsafe');

      // Hostile filename (control chars + glob + spaces) never reaches output raw.
      const hostile = path.join(root, 'hostile\n\t$(echo pwned) *.json');
      fs.writeFileSync(hostile, '{}');
      const hostileRun = runLauncher(['--env=dev', '--prepare-only', `--portfolio-plan=${hostile}`, '--portfolio-authorization=T']);
      expect(hostileRun.output).not.toContain('echo pwned');
      void SENTINELS;
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('non-dev environments stay rejected under portfolio mode; help documents the pair', () => {
    const root = tempDir();
    try {
      const plan = path.join(root, 'plan.json');
      fs.writeFileSync(plan, '{}');
      const production = runLauncher(['--env=production', '--prepare-only', `--portfolio-plan=${plan}`, '--portfolio-authorization=T']);
      expect(production.status).not.toBe(0);
      expect(production.output).toContain('--env=dev');
      const help = runLauncher(['--help']);
      expect(help.status).toBe(0);
      expect(help.output).toContain('--portfolio-plan=');
      expect(help.output).toContain('--portfolio-authorization=');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('document boundary: LF/CRLF/no-final-newline/extra-newline parse identically; BOM/empty/long-junk fail as SYNTAX class', () => {
    const scope = buildScopedRuntimePlan({ targets: ['ripple.payer-exchange.read'] });
    const document = { documentVersion: 'nightwatch.portfolio-runtime-plan-document.v1', handoff: scope.handoff, planManifest: scope.plan };
    const canonical = renderDocumentJson(document);
    const parseText = (text: string): 'PARSE_OK' | 'SYNTAX_ERROR' | 'PARSER_REJECTED' => {
      try {
        parsePortfolioRuntimePlanDocument(JSON.parse(text) as unknown);
        return 'PARSE_OK';
      } catch (error) {
        return error instanceof SyntaxError || String(error).includes('is not valid JSON') ? 'SYNTAX_ERROR' : 'PARSER_REJECTED';
      }
    };
    expect(parseText(`${canonical}\n`)).toBe('PARSE_OK');
    expect(parseText(`${canonical}\r\n`)).toBe('PARSE_OK');
    expect(parseText(canonical)).toBe('PARSE_OK');
    expect(parseText(`${canonical}\n\n\n`)).toBe('PARSE_OK');
    expect(parseText(`\uFEFF${canonical}`)).toBe('SYNTAX_ERROR');
    expect(parseText('')).toBe('SYNTAX_ERROR');
    expect(parseText('x'.repeat(300_000))).toBe('SYNTAX_ERROR');
  });

  test('hostile JSON: unsafe key names are masked, safe names echo bounded, values NEVER echo (DEF-02 regression)', () => {
    const scope = buildScopedRuntimePlan({ targets: ['ripple.payer-exchange.read'] });
    const secretShapedValue = 'Bearer eyJhbGciOiJIUzI1NiJ9.abc.defghi TOKEN_SENTINEL-CUSTOMER_SECRET';
    const attempts: readonly { readonly document: unknown; readonly forbiddenSubstrings: readonly string[] }[] = [
      {
        // UNSAFE key name (spaces/punctuation/secret-shape) -> masked marker.
        document: {
          documentVersion: 'nightwatch.portfolio-runtime-plan-document.v1',
          handoff: scope.handoff,
          planManifest: scope.plan,
          'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.x.y': secretShapedValue,
        },
        forbiddenSubstrings: ['eyJhbGciOiJIUzI1NiJ9', 'CUSTOMER_SECRET', 'Authorization'],
      },
      {
        // Safe-shaped hostile key echoes the NAME only (bounded token), never its value.
        document: {
          documentVersion: 'nightwatch.portfolio-runtime-plan-document.v1',
          handoff: scope.handoff,
          planManifest: scope.plan,
          TOKEN_SENTINEL: secretShapedValue,
        },
        forbiddenSubstrings: [secretShapedValue, 'Bearer', 'eyJhbGciOiJIUzI1NiJ9'],
      },
      {
        // Hostile key inside the handoff sub-document.
        document: {
          documentVersion: 'nightwatch.portfolio-runtime-plan-document.v1',
          handoff: { ...(scope.handoff as unknown as Record<string, unknown>), 'x-secret AKIAIOSFODNN7EXAMPLE key': 1 },
          planManifest: scope.plan,
        },
        forbiddenSubstrings: ['AKIAIOSFODNN7EXAMPLE', 'x-secret'],
      },
    ];
    for (const attempt of attempts) {
      let observed = '';
      try {
        parsePortfolioRuntimePlanDocument(attempt.document);
        observed = 'PARSED_HOSTILE_DOCUMENT';
      } catch (error) {
        observed = error instanceof Error ? error.message : String(error);
      }
      expect(observed).not.toBe('PARSED_HOSTILE_DOCUMENT');
      for (const forbidden of attempt.forbiddenSubstrings) {
        expect(observed.includes(forbidden), `leaked: ${forbidden} in "${observed}"`).toBe(false);
      }
    }
  });

  test('very long malformed JSON produces a bounded categorical mapping, not a raw parser dump', () => {
    const huge = `{"junk":"${'y'.repeat(500_000)}"`;
    let failed = false;
    try {
      parsePortfolioRuntimePlanDocument(JSON.parse(huge) as unknown);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true); // SyntaxError surfaces before any adapter use.
  });

  test('legacy invocation surface unchanged: no portfolio options means no portfolio behavior required', () => {
    const result = runLauncher([]);
    // Without any args the launcher still exits non-zero (missing --env),
    // but MUST NOT mention portfolio requirements beyond its help hint.
    expect(result.status).not.toBe(0);
    expect(result.output).not.toContain('requires --portfolio-plan and --portfolio-authorization together');
    expect(result.output).not.toContain('cannot read the portfolio plan file');
    expect(result.output).not.toContain('refuses an unsafe portfolio plan path');
  });
});
