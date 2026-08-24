import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import {
  AI_REVIEW_BUDGET,
  AI_REVIEW_INPUT_SCHEMA_VERSION,
  LOCAL_CANARY_INPUT_VERSION,
  LocalCanaryFailureError,
  PASS_AI_PRIVACY,
  ZERO_AI_SAFETY,
  digest,
  fixedSyntheticCanaryInput,
  formatLocalCanaryPass,
  parseLocalCanaryArgs,
  runSingleLocalCanary,
  validateLoopbackEndpoint,
  type AiBugReviewInput,
} from '../../src/core/aiReview';

const ROOT = path.resolve(__dirname, '../..');
const CLI = path.join(ROOT, 'bin', 'ai-local-canary.mjs');

async function listen(handler: http.RequestListener): Promise<{ readonly server: http.Server; readonly endpoint: string }> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('fixture listen failed');
  return { server, endpoint: `http://127.0.0.1:${address.port}/v1/chat/completions` };
}

async function close(server: http.Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

function validModelContent(input: AiBugReviewInput): string {
  return JSON.stringify({
    schemaVersion: 'nightwatch.ai-bug-draft-output.private.v1',
    candidateId: input.facts.candidateId,
    inputPackageId: input.inputPackageId,
    inputPackageDigest: input.inputPackageDigest,
    evidenceLevelAtGeneration: input.facts.evidenceLevel,
    summaryDraft: 'Synthetic protocol-compatible review text for in-memory validation.',
    reproductionDraft: 'Repeat the fixed synthetic observation and compare its deterministic fingerprint.',
    observedBehaviorDraft: 'The synthetic input contains the observed structural class.',
    expectedBehaviorDraft: 'The fixed deterministic contract remains the authority.',
    impactDraft: 'No product impact is asserted by this canary.',
    hypotheses: [{
      label: 'UNVERIFIED_HYPOTHESIS',
      text: 'A protocol boundary may explain the synthetic observation; this is not causal proof.',
      supportingEvidenceRefs: input.evidenceRefs.slice(0, 2),
      contradictingEvidenceRefs: [],
      whatWouldDiscriminate: 'A separate deterministic fixture check would distinguish alternatives.',
    }],
    evidenceRefs: input.evidenceRefs,
    sourceRefs: input.sourceRefs,
    uncertainties: ['Synthetic fixture only.', 'Human review is not part of this canary.'],
  });
}

function requestBody(request: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>);
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function stringValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringValues);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(stringValues);
  return [];
}

test.describe('Phase 7B.3 fixed local-canary fixture', () => {
  test('is a valid synthetic L2 input with no sensitive value content', () => {
    const input = fixedSyntheticCanaryInput();
    expect(input.schemaVersion).toBe(AI_REVIEW_INPUT_SCHEMA_VERSION);
    expect(input.kind).toBe('BUG_CANDIDATE');
    expect(input.facts.evidenceLevel).toBe('L2');
    expect(input.privacy).toEqual(PASS_AI_PRIVACY);
    expect(input.safety).toEqual(ZERO_AI_SAFETY);
    expect(input.inputPackageDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(input)).not.toContain('FAKE_');
    expect(stringValues(input).join('\n')).not.toMatch(/customer|email|account|payer|billing|cost|token|cookie|password|authorization|production|https?:\/\//i);
  });

  test('changes its digest when the fixed fixture changes', () => {
    const input = fixedSyntheticCanaryInput();
    const altered = { ...input, structuralEvidence: { ...input.structuralEvidence, title: 'Synthetic alternate fixture' }, inputPackageId: null, inputPackageDigest: null };
    expect(digest(altered)).not.toBe(input.inputPackageDigest);
    expect(LOCAL_CANARY_INPUT_VERSION).toBe('nightwatch.local-model-canary-input.private.v1');
  });
});

test.describe('Phase 7B.3 bounded canary arguments and endpoint', () => {
  test('accepts only endpoint/model and capped timeout options', () => {
    expect(parseLocalCanaryArgs(['--endpoint', 'http://127.0.0.1:1234/v1/chat/completions', '--model', 'local.fixture.v1', '--timeout-ms', '100'])).toEqual({
      endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
      modelIdentifier: 'local.fixture.v1',
      timeoutMs: 100,
    });
    expect(parseLocalCanaryArgs(['--help'])).toEqual({ help: true });
    for (const args of [
      [],
      ['--prompt', 'synthetic text'],
      ['--endpoint=http://127.0.0.1:1234/v1/chat/completions', '--model', 'local.fixture.v1'],
      ['--endpoint', 'http://127.0.0.1:1234/v1/chat/completions', '--model', 'local fixture'],
      ['--endpoint', 'http://127.0.0.1:1234/v1/chat/completions', '--model', 'local.fixture.v1', '--timeout-ms', '5001'],
      ['--endpoint', 'http://127.0.0.1:1234/v1/chat/completions', '--model', 'local.fixture.v1', '--file', 'input.json'],
    ]) expect(() => parseLocalCanaryArgs(args)).toThrow();
  });

  test('rejects every non-canonical endpoint class before network', () => {
    expect(validateLoopbackEndpoint('http://127.0.0.1:1234/v1/chat/completions').port).toBe('1234');
    for (const endpoint of [
      'https://127.0.0.1:1234/v1/chat/completions',
      'http://192.168.1.10:1234/v1/chat/completions',
      'http://0.0.0.0:1234/v1/chat/completions',
      'http://127.0.0.1/v1/chat/completions',
      'http://127.0.0.1:1234/unsafe',
      'http://user:password@127.0.0.1:1234/v1/chat/completions',
      'http://127.0.0.1:1234/v1/chat/completions?x=1',
      'http://127.0.0.1:1234/v1/chat/completions#fragment',
    ]) expect(() => validateLoopbackEndpoint(endpoint)).toThrow('AI_PROVIDER_NOT_LOCAL');
  });
});

test.describe('Phase 7B.3 one-call loopback controller', () => {
  test('sends exactly one bounded no-tool request and returns metadata only', async () => {
    const input = fixedSyntheticCanaryInput();
    const content = validModelContent(input);
    let requestCount = 0;
    let observedBody: Record<string, unknown> | null = null;
    const fixture = await listen(async (request, response) => {
      requestCount += 1;
      observedBody = await requestBody(request);
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ choices: [{ message: { content } }] }));
    });
    try {
      const result = await runSingleLocalCanary({ endpoint: fixture.endpoint, modelIdentifier: 'local.fixture.v1', timeoutMs: AI_REVIEW_BUDGET.perCallTimeoutMs });
      expect(requestCount).toBe(1);
      expect(result.resultClass).toBe('PASS');
      expect(result.providerCalls).toBe(1);
      expect(result.loopbackModelRequests).toBe(1);
      expect(result.artifactPath).toBeNull();
      expect(result.rawModelOutputPersisted).toBe(0);
      expect('artifact' in result).toBe(false);
      expect(observedBody).not.toBeNull();
      const body = observedBody as unknown as Record<string, unknown>;
      expect(body.model).toBe('local.fixture.v1');
      expect(body.stream).toBe(false);
      expect(body.tools).toBeUndefined();
      expect(body.functions).toBeUndefined();
      expect(body.tool_choice).toBeUndefined();
      expect(Buffer.byteLength(JSON.stringify(body), 'utf8')).toBeLessThanOrEqual(AI_REVIEW_BUDGET.maxInputBytes);
      const formatted = formatLocalCanaryPass(result);
      expect(formatted).toContain('CANARY=PASS');
      expect(formatted).not.toContain('Synthetic protocol-compatible review text');
      expect(formatted).not.toContain('summaryDraft');
    } finally {
      await close(fixture.server);
    }
  });

  test('classifies invalid model output with one call and no retry', async () => {
    let requestCount = 0;
    const fixture = await listen((_request, response) => {
      requestCount += 1;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ choices: [{ message: { content: '{"schemaVersion":"invalid"}' } }] }));
    });
    try {
      await expect(runSingleLocalCanary({ endpoint: fixture.endpoint, modelIdentifier: 'local.fixture.v1', timeoutMs: 100 })).rejects.toMatchObject({ resultClass: 'FAIL_SCHEMA', providerCalls: 1, loopbackModelRequests: 1 });
      expect(requestCount).toBe(1);
    } finally {
      await close(fixture.server);
    }
  });

  test('classifies provider unavailability with one call and no retry', async () => {
    let requestCount = 0;
    const fixture = await listen((_request, response) => {
      requestCount += 1;
      response.statusCode = 503;
      response.end('synthetic unavailable');
    });
    try {
      await expect(runSingleLocalCanary({ endpoint: fixture.endpoint, modelIdentifier: 'local.fixture.v1', timeoutMs: 100 })).rejects.toMatchObject({ resultClass: 'FAIL_PROVIDER_UNAVAILABLE', providerCalls: 1, loopbackModelRequests: 1 });
      expect(requestCount).toBe(1);
    } finally {
      await close(fixture.server);
    }
  });

  test('classifies a bounded timeout with one call and no retry', async () => {
    let requestCount = 0;
    const fixture = await listen((_request) => {
      requestCount += 1;
    });
    try {
      // Keep enough scheduling margin for the request to reach the loopback
      // server under the full serial compatibility cone. The server never
      // responds, so this remains a bounded timeout while avoiding a race
      // between the timer and the first event-loop turn.
      await expect(runSingleLocalCanary({ endpoint: fixture.endpoint, modelIdentifier: 'local.fixture.v1', timeoutMs: 100 })).rejects.toMatchObject({ resultClass: 'FAIL_TIMEOUT', providerCalls: 1, loopbackModelRequests: 1 });
      expect(requestCount).toBe(1);
    } finally {
      await close(fixture.server);
    }
  });

  test('CLI rejects invalid endpoint without echoing the endpoint or contacting it', () => {
    const invalid = 'https://api.alphaus.cloud:1234/v1/chat/completions';
    const result = spawnSync(process.execPath, [CLI, '--endpoint', invalid, '--model', 'local.fixture.v1'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { PATH: '/usr/bin:/bin' },
      timeout: 10_000,
      maxBuffer: 256 * 1024,
    });
    expect(result.status).toBe(2);
    expect(`${result.stdout}${result.stderr}`).toContain('LOCAL_MODEL_CANARY_NOT_RUN');
    expect(`${result.stdout}${result.stderr}`).toContain('NOT_RUN_RUNTIME_UNSAFE');
    expect(`${result.stdout}${result.stderr}`).not.toContain(invalid);
  });

  test('invalid output failures expose only sanitized classifications', () => {
    const failure = new LocalCanaryFailureError({ resultClass: 'FAIL_SCHEMA', errorCode: 'AI_OUTPUT_SCHEMA_INVALID', providerCalls: 1, loopbackModelRequests: 1 });
    expect(failure.stack).toBeTruthy();
    expect(failure.message).toBe('FAIL_SCHEMA');
    expect(failure.errorCode).toBe('AI_OUTPUT_SCHEMA_INVALID');
    expect(failure.responseDigest).toBeNull();
    expect(failure.outputBytes).toBeNull();
  });
});
