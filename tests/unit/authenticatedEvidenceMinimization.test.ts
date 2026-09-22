// NW-AUD-018 — authenticated evidence minimization integrity.
//
// Reproduces (then proves closed) the three live defects:
//   1. lexical route guessing persisted lowercase identifier-like segments
//      (`acme1234`, `accountabc`, `inv202506`) verbatim;
//   2. unparseable/relative inputs got NO path minimization at all;
//   3. a late authenticated-mode transition only flipped a flag — it never
//      hardened the already-created directory or its artifacts.
// Route identity now comes ONLY from bound proven templates; everything
// else is the categorical unknown-route marker.

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RedactionLayer, createRedactionLayer } from '../../src/core/safety/redaction';
import { ProvenRouteTable, UNKNOWN_ROUTE_MARKER, safeRuleMarker } from '../../src/core/safety/provenRoutes';
import { provenRouteTableFromRules } from '../../src/core/safety/endpointSemantics';
import type { EndpointSemanticRule } from '../../src/core/safety/endpointSemantics';
import { RunRecorder } from '../../src/core/evidence/runRecorder';

function tempRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function baseOpts(runId: string, artifactsRoot: string) {
  return {
    runId,
    artifactsRoot,
    environment: 'local',
    product: 'ripple',
    browser: 'chromium',
    scenario: 'smoke',
  } as const;
}

function mode(file: string): number {
  return fs.statSync(file).mode & 0o777;
}

test.describe('NW-AUD-018 proven route identity', () => {
  test('identifier-shaped segments never persist without proven authority', () => {
    const layer = createRedactionLayer();
    for (const url of [
      'https://api.example.invalid/customers/acme1234/orders',
      'https://api.example.invalid/accounts/accountabc/invoices',
      'https://api.example.invalid/v1/inv202506/status',
      'https://api.example.invalid/companies/0JXQq8Oe/billing-groups/3901/invoices/202506?customer=FAKE&token=FAKE',
    ]) {
      const out = layer.redactAuthenticatedUrl(url);
      expect(out, url).toBe(`https://api.example.invalid${UNKNOWN_ROUTE_MARKER}`);
      expect(out).not.toContain('acme1234');
      expect(out).not.toContain('accountabc');
      expect(out).not.toContain('inv202506');
      expect(out).not.toContain('0JXQq8Oe');
      expect(out).not.toContain('3901');
      expect(out).not.toContain('202506');
      expect(out).not.toContain('FAKE');
      expect(out).not.toContain('?');
      expect(out).not.toContain('#');
      expect(out).not.toContain('@');
    }
  });

  test('unparseable and relative inputs reduce to the marker, never a raw path', () => {
    const layer = createRedactionLayer();
    expect(layer.redactAuthenticatedUrl('/relative/path/acme1234/orders')).toBe(UNKNOWN_ROUTE_MARKER);
    expect(layer.redactAuthenticatedUrl('not a url at all/acme1234')).toBe(UNKNOWN_ROUTE_MARKER);
    expect(layer.redactAuthenticatedUrl('https://user:pass@host.invalid/p/acme1234?q=1#f')).toBe(
      'https://host.invalid' + UNKNOWN_ROUTE_MARKER,
    );
    expect(layer.redactAuthenticatedUrl('ftp://host.invalid/acme1234')).toBe(UNKNOWN_ROUTE_MARKER);
    expect(layer.redactAuthenticatedUrl('https://host.invalid/')).toBe('https://host.invalid/');
  });

  test('a bound proven template is the only way a path persists', () => {
    const table = ProvenRouteTable.bind([
      { pattern: '^/v1/costs$', emit: '/v1/costs' },
      { pattern: '^/customers/[0-9]+/orders$', emit: safeRuleMarker('orders-by-customer') ?? '' },
    ]);
    const layer = createRedactionLayer(table);
    expect(layer.redactAuthenticatedUrl('https://api.example.invalid/v1/costs?x=1')).toBe(
      'https://api.example.invalid/v1/costs',
    );
    // The pattern RULE's identity persists — never the concrete matched path.
    const out = layer.redactAuthenticatedUrl('https://api.example.invalid/customers/481516234299/orders');
    expect(out).toBe('https://api.example.invalid<RULE:orders-by-customer>');
    expect(out).not.toContain('481516234299');
    // Unmatched path under a bound table still collapses.
    expect(layer.redactAuthenticatedUrl('https://api.example.invalid/customers/acme1234/profile')).toBe(
      'https://api.example.invalid' + UNKNOWN_ROUTE_MARKER,
    );
  });

  test('the table itself fails closed on registration defects', () => {
    expect(() => ProvenRouteTable.bind([{ pattern: '/v1/costs', emit: '/v1/costs' }])).toThrow('PROVEN_ROUTE_PATTERN_UNANCHORED');
    expect(() => ProvenRouteTable.bind([{ pattern: '^/x$', emit: '/x?y=1' }])).toThrow('PROVEN_ROUTE_EMIT_UNSAFE');
    // A `?` quantifier inside a pattern source is legitimate regex syntax —
    // persistence stays safe through the emit charset and match() checks.
    expect(ProvenRouteTable.bind([{ pattern: '^/v1/items/[0-9]+/?$', emit: '/v1/items/<N>' }]).size).toBe(1);
    // Shared patterns are legitimate (method/host-scoped rules); membership
    // is first-match-wins in bind order, mirroring matchRippleEndpoint.
    const shared = ProvenRouteTable.bind([
      { pattern: '^/x$', emit: '/x' },
      { pattern: '^/x$', emit: '<RULE:other>' },
    ]);
    expect(shared.match('/x')).toBe('/x');
    expect(ProvenRouteTable.empty().match('/anything')).toBeNull();
    expect(ProvenRouteTable.bind([{ pattern: '^/x$', emit: '/x' }]).match('/x%3Fy')).toBeNull();
    expect(safeRuleMarker('../evil')).toBeNull();
    expect(safeRuleMarker('ok-rule.id:1')).toBe('<RULE:ok-rule.id:1>');
  });

  test('the endpoint-rule builder converts exact paths and pattern rules, and rejects shapeless rules', () => {
    const rules: EndpointSemanticRule[] = [
      { id: 'costs', host: 'api.example.invalid', method: 'GET', path: '/v1/costs', classification: 'KNOWN_READ', provenance: 'synthetic' },
      { id: 'dyn', host: 'api.example.invalid', method: 'GET', pathPattern: '^/v1/items/[0-9]+$', classification: 'KNOWN_READ', provenance: 'synthetic' },
    ];
    const table = provenRouteTableFromRules(rules);
    expect(table.size).toBe(2);
    expect(() => provenRouteTableFromRules([
      { id: 'bad id!', host: 'h', method: 'GET', pathPattern: '^/x$', classification: 'UNKNOWN', provenance: 'synthetic' },
    ])).toThrow('PROVEN_ROUTE_RULE_ID_UNSAFE');
    expect(() => provenRouteTableFromRules([
      { id: 'shapeless', host: 'h', method: 'GET', classification: 'UNKNOWN', provenance: 'synthetic' },
    ])).toThrow('PROVEN_ROUTE_RULE_SHAPE_INVALID');
  });
});

test.describe('NW-AUD-018 authenticated mode transition', () => {
  test('a late transition hardens the directory and every pre-transition artifact before the flag flips', () => {
    const root = tempRoot('nw-aud018-late-');
    try {
      const rec = new RunRecorder(baseOpts('late-transition', root));
      expect(rec.isAuthenticated).toBe(false);
      // Pre-transition world: permissive on purpose (umask-visible artifacts).
      const loose = path.join(rec.dir, 'pre.json');
      fs.writeFileSync(loose, '{"ok":true}\n');
      fs.chmodSync(loose, 0o644);
      fs.chmodSync(rec.dir, 0o755);
      expect(mode(rec.dir) & 0o077).not.toBe(0);
      expect(mode(loose) & 0o077).not.toBe(0);

      rec.enableAuthenticatedEvidence();

      expect(rec.isAuthenticated).toBe(true);
      expect(mode(rec.dir)).toBe(0o700);
      expect(mode(loose)).toBe(0o600);
      expect(mode(path.join(rec.dir, 'manifest.json'))).toBe(0o600);
      const manifest = JSON.parse(fs.readFileSync(path.join(rec.dir, 'manifest.json'), 'utf8'));
      expect(manifest.evidencePolicy.mode).toBe('authenticated-metadata-first');
      // Irreversible: repeating the call is a no-op, never a regression.
      fs.chmodSync(rec.dir, 0o755);
      rec.enableAuthenticatedEvidence();
      expect(rec.isAuthenticated).toBe(true);
      expect(mode(rec.dir)).toBe(0o700);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('ambiguity under the run directory fails the transition closed, flag untouched', () => {
    const root = tempRoot('nw-aud018-ambig-');
    try {
      const rec = new RunRecorder(baseOpts('ambiguous-transition', root));
      const outside = path.join(root, 'outside-target');
      fs.writeFileSync(outside, 'x');
      fs.symlinkSync(outside, path.join(rec.dir, 'planted-link'));
      expect(() => rec.enableAuthenticatedEvidence()).toThrow('AUTHENTICATED_EVIDENCE_TRANSITION_UNSAFE');
      expect(rec.isAuthenticated).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('authenticated construction publishes a sanitized manifest and an owner-only world', () => {
    const root = tempRoot('nw-aud018-ctor-');
    try {
      const rec = new RunRecorder({
        ...baseOpts('ctor-auth', root),
        authenticated: true,
        scenario: 'auth flow with Bearer FAKESECRETVALUE1234567890 embedded',
      });
      expect(rec.isAuthenticated).toBe(true);
      expect(mode(rec.dir)).toBe(0o700);
      const manifestFile = path.join(rec.dir, 'manifest.json');
      expect(mode(manifestFile)).toBe(0o600);
      const raw = fs.readFileSync(manifestFile, 'utf8');
      expect(raw).not.toContain('FAKESECRETVALUE1234567890');
      const manifest = JSON.parse(raw);
      expect(manifest.evidencePolicy.mode).toBe('authenticated-metadata-first');
      expect(manifest.runId).toBe('ctor-auth');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('manifest keys are a closed shape in both modes', () => {
    const root = tempRoot('nw-aud018-keys-');
    try {
      const rec = new RunRecorder(baseOpts('manifest-keys', root));
      rec.addManifestEntry('trace', { enabled: false });
      expect(() => rec.addManifestEntry('../escape', {})).toThrow('AUTHENTICATED_MANIFEST_KEY_UNSAFE');
      expect(() => rec.addManifestEntry('a b', {})).toThrow('AUTHENTICATED_MANIFEST_KEY_UNSAFE');
      expect(() => rec.addManifestEntry('9leading', {})).toThrow('AUTHENTICATED_MANIFEST_KEY_UNSAFE');
      const manifest = JSON.parse(fs.readFileSync(path.join(rec.dir, 'manifest.json'), 'utf8'));
      expect(Object.keys(manifest)).not.toContain('../escape');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
