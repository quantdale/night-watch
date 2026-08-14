import http from 'node:http';
import { test, expect } from '@playwright/test';
import {
  AI_REVIEW_INPUT_SCHEMA_VERSION,
  LoopbackAiReviewProvider,
  PASS_AI_PRIVACY,
  AiReviewSession,
  ZERO_AI_SAFETY,
  digest,
  validateAiBugReviewInput,
  validateLoopbackEndpoint,
  type AiBugReviewInput,
} from '../../src/core/aiReview';

function inputFixture(): AiBugReviewInput {
  const base: Record<string, unknown> = {
    schemaVersion: AI_REVIEW_INPUT_SCHEMA_VERSION,
    kind: 'BUG_CANDIDATE',
    inputPackageId: null,
    inputPackageDigest: null,
    dossierVersion: 'nightwatch.bug-dossier.private.v1',
    upstreamPackage: {
      schemaVersion: 'nightwatch.ai-ready-evidence.private.v1',
      deterministic: true,
      evidence: {
        candidateId: 'candidate:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
        title: 'Synthetic bounded application candidate',
        routeClass: '/ripple/exchange',
        apiOperationFamily: 'payer-exchange',
        oracleFingerprint: 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb',
        minimalSequence: ['read.exchange'],
        confidence: 'MEDIUM',
        faultBoundary: 'UI_COMPONENT',
        sourceCandidateCount: 0,
      },
      allowedUses: ['SUMMARIZE', 'RANK', 'HYPOTHESIZE', 'SUGGEST_SOURCE_LOCATIONS'],
      oracleAuthority: 'DETERMINISTIC_NIGHTWATCH_ONLY',
      prohibitedUses: ['DECIDE_FAILURE', 'OVERRIDE_SAFETY', 'OVERRIDE_ORACLE', 'INVENT_RESULTS', 'TRIGGER_EXTERNAL_ACCESS'],
    },
    facts: {
      candidateId: 'candidate:sha256:aaaaaaaaaaaaaaaaaaaaaaaa',
      evidenceLevel: 'L3',
      routeClass: '/ripple/exchange',
      apiOperationFamily: 'payer-exchange',
      oracleFingerprint: 'fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb',
      sourceRelevance: 'NO_CURRENT_CHANGE_RELEVANCE',
      deploymentStatus: 'DEPLOYMENT_STATUS_UNRESOLVED',
      technicalSeverity: 'MEDIUM',
      triagePriority: 'P1',
      browserApiStatus: 'NOT_AVAILABLE',
      deterministicFaultBoundary: 'UI_COMPONENT',
    },
    evidenceRefs: ['candidate:candidate:sha256:aaaaaaaaaaaaaaaaaaaaaaaa', 'fingerprint:fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb'],
    sourceRefs: [],
    sourceSnapshotRefs: [],
    availableEvidenceRefs: ['candidate:candidate:sha256:aaaaaaaaaaaaaaaaaaaaaaaa', 'fingerprint:fp:sha256:bbbbbbbbbbbbbbbbbbbbbbbb'],
    availableSourceRefs: [],
    structuralEvidence: {
      title: 'Synthetic bounded application candidate',
      minimalActionIds: ['read.exchange'],
      routeClass: '/ripple/exchange',
      apiOperationFamily: 'payer-exchange',
      browserApiStatus: 'NOT_AVAILABLE',
      sourceRelevance: 'NO_CURRENT_CHANGE_RELEVANCE',
      uncertaintyClasses: ['deployment-unresolved'],
    },
    privacy: PASS_AI_PRIVACY,
    safety: ZERO_AI_SAFETY,
  };
  const inputDigest = digest(base);
  return validateAiBugReviewInput({ ...base, inputPackageId: `ai-input:${inputDigest}`, inputPackageDigest: inputDigest });
}

async function listen(handler: http.RequestListener): Promise<{ readonly server: http.Server; readonly endpoint: string }> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('fixture listen failed');
  return { server, endpoint: `http://127.0.0.1:${address.port}/v1/chat/completions` };
}

async function close(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

function validBugModelContent(input: AiBugReviewInput): string {
  return JSON.stringify({
    schemaVersion: 'nightwatch.ai-bug-draft-output.private.v1',
    candidateId: input.facts.candidateId,
    inputPackageId: input.inputPackageId,
    inputPackageDigest: input.inputPackageDigest,
    evidenceLevelAtGeneration: input.facts.evidenceLevel,
    summaryDraft: 'The deterministic evidence describes a bounded application behavior for owner review.',
    reproductionDraft: 'Repeat the existing approved read-only sequence and compare the same deterministic fingerprint.',
    observedBehaviorDraft: 'The input package records the observed structural/oracle class; this text is not new evidence.',
    expectedBehaviorDraft: 'The existing deterministic contract should remain satisfied for the supplied operation family.',
    impactDraft: 'Potential application impact is described for owner review only; severity and priority remain deterministic facts.',
    hypotheses: [{ label: 'UNVERIFIED_HYPOTHESIS', text: 'A client-side or protocol boundary may explain the observed class; this is not causal proof.', supportingEvidenceRefs: input.evidenceRefs.slice(0, 2), contradictingEvidenceRefs: [], whatWouldDiscriminate: 'A separate deterministic reproduction or contradiction would distinguish the alternatives.' }],
    evidenceRefs: input.evidenceRefs,
    sourceRefs: input.sourceRefs,
    uncertainties: ['Deployment identity remains unresolved.', 'Human review is required before any owner use.'],
  });
}

test.describe('Phase 7B loopback provider containment', () => {
  test('accepts only explicit loopback endpoint classes', () => {
    expect(validateLoopbackEndpoint('http://127.0.0.1:1234/v1/chat/completions').hostname).toBe('127.0.0.1');
    expect(validateLoopbackEndpoint('http://localhost:1234/v1/chat/completions').hostname).toBe('localhost');
    expect(validateLoopbackEndpoint('http://[::1]:1234/v1/chat/completions').hostname).toContain('::1');
    for (const endpoint of [
      'http://192.168.1.10:1234/v1/chat/completions',
      'http://api.alphaus.cloud:1234/v1/chat/completions',
      'https://127.0.0.1:1234/v1/chat/completions',
      'http://user:password@127.0.0.1:1234/v1/chat/completions',
      'http://127.0.0.1:1234/v1/chat/completions?token=FAKE_AI_TOKEN_123456',
      'http://127.0.0.1:1234/unsafe',
    ]) expect(() => validateLoopbackEndpoint(endpoint)).toThrow('AI_PROVIDER_NOT_LOCAL');
  });

  test('uses a bounded no-credential request and validates an OpenAI-compatible fixture response', async () => {
    const input = inputFixture();
    const content = validBugModelContent(input);
    let observedPath = '';
    let observedAuthorization = false;
    let observedCookie = false;
    const fixture = await listen((request, response) => {
      observedPath = request.url ?? '';
      observedAuthorization = request.headers.authorization !== undefined;
      observedCookie = request.headers.cookie !== undefined;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ choices: [{ message: { content } }] }));
    });
    try {
      const provider = new LoopbackAiReviewProvider({ endpoint: fixture.endpoint, modelIdentifier: 'local-fixture.v1' });
      const session = new AiReviewSession(provider, { now: () => new Date('2026-08-14T00:00:00.000Z') });
      const result = await session.reviewBugCandidate(input);
      expect(observedPath).toBe('/v1/chat/completions');
      expect(observedAuthorization).toBe(false);
      expect(observedCookie).toBe(false);
      expect(result.artifact.modelProviderClass).toBe('LOOPBACK_LOCAL');
      expect(result.artifact.status).toBe('AI_GENERATED_UNREVIEWED');
    } finally {
      await close(fixture.server);
    }
  });

  test('does not follow external redirects', async () => {
    const fixture = await listen((_request, response) => {
      response.statusCode = 302;
      response.setHeader('Location', 'https://api.alphaus.cloud/escape');
      response.end();
    });
    try {
      const provider = new LoopbackAiReviewProvider({ endpoint: fixture.endpoint, modelIdentifier: 'local-fixture.v1' });
      await expect(new AiReviewSession(provider).reviewBugCandidate(inputFixture())).rejects.toMatchObject({ code: 'AI_PROVIDER_NOT_LOCAL' });
    } finally {
      await close(fixture.server);
    }
  });

  test('rejects oversized and slow loopback responses with bounded errors', async () => {
    const oversized = await listen((_request, response) => {
      response.setHeader('Content-Type', 'application/json');
      response.end('x'.repeat(40 * 1024));
    });
    try {
      const provider = new LoopbackAiReviewProvider({ endpoint: oversized.endpoint, modelIdentifier: 'local-fixture.v1' });
      await expect(new AiReviewSession(provider).reviewBugCandidate(inputFixture())).rejects.toMatchObject({ code: 'AI_PROVIDER_OUTPUT_TOO_LARGE' });
    } finally {
      await close(oversized.server);
    }

    const slow = await listen((_request, response) => {
      setTimeout(() => response.end('{}'), 100);
    });
    try {
      const provider = new LoopbackAiReviewProvider({ endpoint: slow.endpoint, modelIdentifier: 'local-fixture.v1', timeoutMs: 20 });
      await expect(new AiReviewSession(provider).reviewBugCandidate(inputFixture())).rejects.toMatchObject({ code: 'AI_PROVIDER_TIMEOUT' });
    } finally {
      await close(slow.server);
    }
  });
});
