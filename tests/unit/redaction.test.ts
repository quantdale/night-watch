// ---------------------------------------------------------------------------
// Nightwatch — RedactionLayer unit tests.
// ---------------------------------------------------------------------------

import { test, expect } from '@playwright/test';
import { createRedactionLayer } from '../../src/core/safety/redaction';

test.describe('RedactionLayer', () => {
  test('sensitive headers are redacted; benign headers pass through; input is not mutated', () => {
    const layer = createRedactionLayer();
    const headers: Record<string, string> = {
      authorization: 'Bearer sekrit123',
      cookie: 'session=abc123',
      'x-user': 'alice@example.com',
      'x-api-key': 'k-12345',
      'content-type': 'application/json',
      'x-request-id': 'req-1',
      'user-agent': 'Nightwatch/0.1',
    };
    const out = layer.redactHeaders(headers);

    expect(out).not.toBe(headers); // new object
    expect(out.authorization).toBe('[REDACTED]');
    expect(out.cookie).toBe('[REDACTED]');
    expect(out['x-user']).toBe('[REDACTED]');
    expect(out['x-api-key']).toBe('[REDACTED]');
    expect(out['content-type']).toBe('application/json');
    expect(out['x-request-id']).toBe('req-1');
    expect(out['user-agent']).toBe('Nightwatch/0.1');

    // Original object must not be mutated.
    expect(headers.authorization).toBe('Bearer sekrit123');
    expect(headers.cookie).toBe('session=abc123');
    expect(headers['x-api-key']).toBe('k-12345');
  });

  test('redactHeaderEntries redacts sensitive entries and leaves the input array intact', () => {
    const layer = createRedactionLayer();
    const entries: Array<{ name: string; value: string }> = [
      { name: 'authorization', value: 'Bearer xyz' },
      { name: 'content-type', value: 'application/json' },
    ];
    const out = layer.redactHeaderEntries(entries);
    expect(out).toEqual([
      { name: 'authorization', value: '[REDACTED]' },
      { name: 'content-type', value: 'application/json' },
    ]);
    expect(entries[0]).toEqual({ name: 'authorization', value: 'Bearer xyz' });
  });

  test('URL query secrets are redacted; benign params pass through', () => {
    const layer = createRedactionLayer();
    // The URL API re-serialization percent-encodes the placeholder, which
    // redaction.ts restores to the readable [REDACTED] form.
    const out = layer.redactUrl('https://api.example.com/v1/data?token=abc&api_key=x&code=yyy&page=2&limit=10');
    expect(out).toBe(
      'https://api.example.com/v1/data?token=[REDACTED]&api_key=[REDACTED]&code=[REDACTED]&page=2&limit=10'
    );
    expect(out).not.toContain('token=abc');
    expect(out).not.toContain('api_key=x');
    expect(out).not.toContain('code=yyy');
    expect(out).not.toContain('%5BREDACTED%5D');
  });

  test('URL userinfo credentials are redacted', () => {
    const layer = createRedactionLayer();
    // No sensitive query params -> the string-level userinfo replacement is
    // preserved as-is.
    expect(layer.redactUrl('https://user:pass@host.example/path')).toBe(
      'https://[REDACTED]@host.example/path'
    );
    // With a sensitive query param the URL is re-serialized; the placeholder
    // is restored to the readable form in both userinfo and query.
    expect(layer.redactUrl('https://user:pass@host.example/path?token=abc')).toBe(
      'https://[REDACTED]@host.example/path?token=[REDACTED]'
    );
    expect(layer.redactUrl('https://user:pass@host.example/path')).not.toContain('user:pass');
  });

  test('secret shapes are redacted in bodies', () => {
    const layer = createRedactionLayer();
    // Bearer token
    expect(layer.redactText('Authorization: Bearer abcDEF123-_~')).toBe(
      'Authorization: Bearer [REDACTED]'
    );
    // JWT (three base64url segments)
    expect(
      layer.redactText('id_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signaturehere')
    ).toBe('id_token=[REDACTED]:jwt');
    // AWS access key id
    expect(layer.redactText('access key AKIAABCDEFGHIJKLMNOP here')).toBe(
      'access key [REDACTED]:aws-key here'
    );
    // JSON secret field
    expect(layer.redactText('{"access_token":"secretvalue"}')).toBe(
      '{"access_token":"[REDACTED]"}'
    );
    // PEM private key block (multiline)
    const pem = [
      '-----BEGIN PRIVATE KEY-----',
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ',
      '-----END PRIVATE KEY-----',
    ].join('\n');
    expect(layer.redactText(pem)).toBe('[REDACTED]:private-key');
  });

  test('registered secrets are scrubbed everywhere; short values are never registered', () => {
    const layer = createRedactionLayer();
    layer.addSecret('SUPERSECRETTOKEN123');
    expect(layer.secretCount).toBe(1);

    expect(layer.redactText('prefix SUPERSECRETTOKEN123 suffix')).toBe(
      'prefix [REDACTED] suffix'
    );
    expect(layer.redactText('no secret here')).toBe('no secret here');

    const url = layer.redactUrl('https://host.example/path?foo=SUPERSECRETTOKEN123');
    expect(url).not.toContain('SUPERSECRETTOKEN123');
    expect(url).toContain('[REDACTED]');

    expect(layer.redactHeaders({ 'x-custom': 'SUPERSECRETTOKEN123' })['x-custom']).toBe(
      '[REDACTED]'
    );
    expect(layer.redactHeaders({ authorization: 'SUPERSECRETTOKEN123' }).authorization).toBe(
      '[REDACTED]'
    );

    // Short (<4 chars) and blank values must NOT be registered.
    const layer2 = createRedactionLayer();
    layer2.addSecret('abc');
    layer2.addSecret('');
    layer2.addSecret('   ');
    expect(layer2.secretCount).toBe(0);
    expect(layer2.redactText('abc')).toBe('abc');
  });
});
