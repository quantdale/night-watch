// ---------------------------------------------------------------------------
// C-08b — bounded manifest reader and deployment-fact derivation.
//
// The reader is the only route from `mochi` ingress text to a DEPLOYMENT_FACT.
// These cases exercise it ONLY against synthetic fixtures: the property under
// test is fail-closed behaviour on provenance, ambiguity and templates, plus a
// deterministic `ev:sha256` digest bound to `repo @ SHA : path`.
//
// No real manifest, no real source, no network, no credentials.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';

import {
  DEPLOYMENT_FACT_REBIND_REFUSED,
  DEPLOYMENT_MANIFEST_READER_VERSION,
  DEPLOYMENT_MANIFEST_REFUSAL_CODES,
  DEPLOYMENT_MANIFEST_UNKNOWN_CODES,
  assertDeploymentFactCurrent,
  deploymentFactIsCurrent,
  deploymentManifestPath,
  deploymentManifestProvenanceIdentity,
  readDeploymentManifest,
  type DeploymentManifestReadResult,
} from '../../src/core/source/deploymentManifestReader';

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const PROD_APP = { repoId: 'mochi', sourceSha: SHA_A, path: 'services/prod/appproxy/ingress.yaml', environment: 'prod', proxy: 'appproxy' };

function manifest(rules: string): string {
  return ['apiVersion: networking.k8s.io/v1', 'kind: Ingress', 'metadata:', '  name: synthetic-ingress', '  annotations:', '    synthetic: true', 'spec:', '  rules:', rules].join('\n');
}

const VALID_RULES = [
  '    - host: api.example.invalid',
  '      http:',
  '        paths:',
  '          - path: /m/ripple',
  '            pathType: Prefix',
  '            backend:',
  '              service:',
  '                name: ripple-api',
  '                port:',
  '                  number: 8080',
  '    - host: api2.example.invalid',
  '      http:',
  '        paths:',
  '          - path: /m/other',
  '            backend:',
  '              service:',
  '                name: other-api',
  '                port:',
  '                  name: http',
].join('\n');

function read(text: string, provenance = PROD_APP): DeploymentManifestReadResult {
  return readDeploymentManifest({ provenance, text });
}

function ok(result: DeploymentManifestReadResult): Extract<DeploymentManifestReadResult, { ok: true }> {
  if (!result.ok) throw new Error(`MANIFEST_FIXTURE_REFUSED:${result.refusalCode}`);
  return result;
}

test.describe('C-08b the reader derives facts only from the approved bound path', () => {
  test('a valid synthetic manifest yields exactly the proven route → service facts', () => {
    const result = ok(read(manifest(VALID_RULES)));
    expect(result.provenanceIdentity).toBe(`mochi@${SHA_A}:services/prod/appproxy/ingress.yaml`);
    expect(result.facts).toHaveLength(2);
    const [first, second] = [...result.facts].sort((left, right) => left.host.localeCompare(right.host));
    expect(first).toMatchObject({
      factCategory: 'DEPLOYMENT_FACT',
      hop: 'HOST_TO_SERVICE',
      environment: 'prod',
      proxy: 'appproxy',
      host: 'api.example.invalid',
      routePath: '/m/ripple',
      service: 'ripple-api',
      servicePort: '8080',
      provenanceIdentity: `mochi@${SHA_A}:services/prod/appproxy/ingress.yaml`,
    });
    expect(second).toMatchObject({ host: 'api2.example.invalid', routePath: '/m/other', service: 'other-api', servicePort: 'http' });
    for (const fact of result.facts) {
      expect(fact.readerVersion).toBe(DEPLOYMENT_MANIFEST_READER_VERSION);
      expect(fact.evidenceDigest).toMatch(/^ev:sha256:[0-9a-f]{24}$/);
      expect(fact.evidenceDigest).toBe(result.evidenceDigest);
    }
  });

  test('a leading document marker is inert; a second one is refused', () => {
    const withMarker = ok(read(`---\n${manifest(VALID_RULES)}`));
    expect(withMarker.facts).toHaveLength(2);
    const multi = read(`---\n${manifest(VALID_RULES)}\n---\n${manifest(VALID_RULES)}`);
    expect(multi.ok).toBe(false);
    if (!multi.ok) expect(multi.refusalCode).toBe('MANIFEST_MULTI_DOCUMENT');
  });

  test('the path helper is the only accepted spelling', () => {
    expect(deploymentManifestPath('prod', 'appproxy')).toBe('services/prod/appproxy/ingress.yaml');
    expect(deploymentManifestPath('dev', 'serviceproxy')).toBe('services/dev/serviceproxy/ingress.yaml');
  });

  test('a workaround from any other repository is refused and produces no fact', () => {
    const result = read(manifest(VALID_RULES), { ...PROD_APP, repoId: 'other-repo' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.refusalCode).toBe('MANIFEST_SOURCE_NOT_APPROVED');
  });

  test('any path other than the exact bounded manifest path is refused', () => {
    for (const path of [
      'services/prod/appproxy/other.yaml',
      'services/prod/appproxy/ingress.yml',
      'services/prod/ingress.yaml',
      'services/prod/appproxy/nested/ingress.yaml',
      'config/environments/production.json',
    ]) {
      const result = read(manifest(VALID_RULES), { ...PROD_APP, path });
      expect(result.ok, path).toBe(false);
      if (!result.ok) expect(result.refusalCode).toBe('MANIFEST_PATH_NOT_ALLOWED');
    }
  });

  test('unknown environment/proxy and malformed SHA are refused before parsing', () => {
    expect((read(manifest(VALID_RULES), { ...PROD_APP, environment: 'staging' }) as { refusalCode?: string }).refusalCode).toBe('MANIFEST_ENVIRONMENT_UNKNOWN');
    expect((read(manifest(VALID_RULES), { ...PROD_APP, proxy: 'frontproxy' }) as { refusalCode?: string }).refusalCode).toBe('MANIFEST_PROXY_UNKNOWN');
    expect((read(manifest(VALID_RULES), { ...PROD_APP, sourceSha: 'zz' }) as { refusalCode?: string }).refusalCode).toBe('MANIFEST_SHA_INVALID');
  });

  test('a non-Ingress document is refused', () => {
    const result = read(manifest(VALID_RULES).replace('kind: Ingress', 'kind: Service'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.refusalCode).toBe('MANIFEST_KIND_UNSUPPORTED');
  });

  test('templates and anchors are refused', () => {
    expect((read(manifest('    - host: "{{ .Values.host }}"')) as { refusalCode?: string }).refusalCode).toBe('MANIFEST_TEMPLATED');
    expect((read(manifest('    - host: api.example.invalid\n      x-anchor: &base {}')) as { refusalCode?: string }).refusalCode).toBe('MANIFEST_UNPARSEABLE');
  });

  test('the refusal vocabulary names the bounded access requirement', () => {
    expect([...DEPLOYMENT_MANIFEST_REFUSAL_CODES]).toContain('MANIFEST_SOURCE_NOT_APPROVED');
    expect([...DEPLOYMENT_MANIFEST_REFUSAL_CODES]).toContain('MANIFEST_PATH_NOT_ALLOWED');
    expect([...DEPLOYMENT_MANIFEST_UNKNOWN_CODES]).toContain('SERVICE_BACKEND_AMBIGUOUS');
  });
});

test.describe('C-08b ambiguity and templating yield explicit unknowns, never a fact', () => {
  test('two backends for one host and path produce an ambiguous unknown and no fact', () => {
    const rules = [
      '    - host: api.example.invalid',
      '      http:',
      '        paths:',
      '          - path: /m/ripple',
      '            backend:',
      '              service:',
      '                name: service-a',
      '          - path: /m/ripple',
      '            backend:',
      '              service:',
      '                name: service-b',
    ].join('\n');
    const result = ok(read(manifest(rules)));
    expect(result.facts).toEqual([]);
    expect(result.unknowns.map((entry) => entry.code)).toEqual(['SERVICE_BACKEND_AMBIGUOUS']);
  });

  test('a repeated identical entry is one fact, not an ambiguity', () => {
    const single = [
      '    - host: api.example.invalid',
      '      http:',
      '        paths:',
      '          - path: /m/ripple',
      '            backend:',
      '              service:',
      '                name: service-a',
    ].join('\n');
    const result = ok(read(manifest(`${single}\n${single}`)));
    expect(result.facts).toHaveLength(1);
    expect(result.unknowns).toEqual([]);
  });

  test('a rule with no host is an explicit HOST_UNSPECIFIED unknown', () => {
    const rules = [
      '    - http:',
      '        paths:',
      '          - path: /m/ripple',
      '            backend:',
      '              service:',
      '                name: service-a',
    ].join('\n');
    const result = ok(read(manifest(rules)));
    expect(result.facts).toEqual([]);
    expect(result.unknowns.map((entry) => entry.code)).toEqual(['HOST_UNSPECIFIED']);
  });

  test('a templated route is an explicit unknown when it survives the pre-scan', () => {
    const rules = [
      '    - host: api.example.invalid',
      '      http:',
      '        paths:',
      '          - path: /m/{tenant}/ripple',
      '            backend:',
      '              service:',
      '                name: service-a',
    ].join('\n');
    const result = ok(read(manifest(rules)));
    expect(result.facts).toEqual([]);
    expect(result.unknowns.map((entry) => entry.code)).toEqual(['ROUTE_TEMPLATED']);
  });

  test('both a port name and a port number is an ambiguity, not a pick', () => {
    const rules = [
      '    - host: api.example.invalid',
      '      http:',
      '        paths:',
      '          - path: /m/ripple',
      '            backend:',
      '              service:',
      '                name: service-a',
      '                port:',
      '                  name: http',
      '                  number: 8080',
    ].join('\n');
    const result = ok(read(manifest(rules)));
    expect(result.facts).toEqual([]);
    expect(result.unknowns.map((entry) => entry.code)).toEqual(['PORT_AMBIGUOUS']);
  });

  test('a missing backend is an explicit unknown', () => {
    const rules = ['    - host: api.example.invalid', '      http:', '        paths:', '          - path: /m/ripple'].join('\n');
    const result = ok(read(manifest(rules)));
    expect(result.facts).toEqual([]);
    expect(result.unknowns.map((entry) => entry.code)).toEqual(['SERVICE_BACKEND_MISSING']);
  });
});

test.describe('C-08b the digest is normalized and provenance-bound', () => {
  test('the same structure reformatted produces the same digest', () => {
    const reformatted = `\n\n${manifest(VALID_RULES).replace(/\n/g, '\n\n')}\n# trailing comment\n`;
    const first = ok(read(manifest(VALID_RULES)));
    const second = ok(read(reformatted));
    expect(second.evidenceDigest).toBe(first.evidenceDigest);
    expect(second.provenanceIdentity).toBe(first.provenanceIdentity);
  });

  test('a semantic change changes the digest', () => {
    const first = ok(read(manifest(VALID_RULES)));
    const changed = ok(read(manifest(VALID_RULES.replace('ripple-api', 'ripple-api-v2'))));
    expect(changed.evidenceDigest).not.toBe(first.evidenceDigest);
  });

  test('the same structure at a different SHA is a different provenance', () => {
    const first = ok(read(manifest(VALID_RULES)));
    const moved = ok(read(manifest(VALID_RULES), { ...PROD_APP, sourceSha: SHA_B }));
    expect(moved.evidenceDigest).not.toBe(first.evidenceDigest);
    expect(moved.provenanceIdentity).toBe(`mochi@${SHA_B}:services/prod/appproxy/ingress.yaml`);
  });

  test('a recorded fact is stale at a new SHA and is never re-bound', () => {
    const fact = ok(read(manifest(VALID_RULES))).facts[0]!;
    const current = ok(read(manifest(VALID_RULES), { ...PROD_APP, sourceSha: SHA_B }));
    expect(deploymentFactIsCurrent(fact, { provenanceIdentity: current.provenanceIdentity, evidenceDigest: current.evidenceDigest })).toBe(false);
    expect(() => assertDeploymentFactCurrent(fact, { provenanceIdentity: current.provenanceIdentity, evidenceDigest: current.evidenceDigest }))
      .toThrow(DEPLOYMENT_FACT_REBIND_REFUSED);
  });

  test('provenance identity is exactly repo @ SHA : path', () => {
    const identity = deploymentManifestProvenanceIdentity({ repoId: 'mochi', sourceSha: SHA_A, path: 'services/dev/serviceproxy/ingress.yaml', environment: 'dev', proxy: 'serviceproxy' });
    expect(identity).toBe(`mochi@${SHA_A}:services/dev/serviceproxy/ingress.yaml`);
  });
});
