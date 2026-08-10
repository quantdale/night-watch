// Synthetic protocol-oracle applicability tests. These inputs are local fake
// responses only; no browser, Alphaus host, response body, or credentials are
// involved.

import { test, expect } from '@playwright/test';
import { checkJsonBody, checkNdjsonBody } from '../../src/oracles/protocol/passiveChecks';

const URL = 'https://api.synthetic.invalid/m/blue/cost/v1/<ID>';

test('valid application/json has no anomaly', () => {
  expect(checkJsonBody('{"ok":true}', URL, 'application/json', 200)).toBeNull();
});

test('invalid application/json records a malformed-json anomaly without content', () => {
  const issue = checkJsonBody('{"ok":', URL, 'application/json', 200);
  expect(issue).toMatchObject({
    type: 'malformed-json',
    oracleSeverity: 'anomaly',
    protocolExpected: 'json',
    protocolObserved: 'invalid-json',
  });
  expect(issue?.message).toBe(`malformed-json: ${URL}`);
  expect(issue?.message).not.toContain('ok');
});

test('HTML login response is not applicable to the JSON oracle', () => {
  expect(checkJsonBody('<!doctype html><html>login</html>', URL, 'text/html', 200)).toBeNull();
});

test('NDJSON uses the streaming oracle instead of plain JSON', () => {
  const body = '{"item":1}\nnot-json\n';
  expect(checkJsonBody(body, URL, 'application/x-ndjson', 200)).toBeNull();
  expect(checkNdjsonBody(body, URL, 'application/x-ndjson', 200)).toMatchObject({
    type: 'malformed-ndjson',
    oracleSeverity: 'anomaly',
    protocolExpected: 'ndjson',
    protocolObserved: 'invalid-ndjson',
  });
});

test('204 and empty successful responses are not malformed JSON', () => {
  expect(checkJsonBody('', URL, 'application/json', 204)).toBeNull();
  expect(checkJsonBody('', URL, 'application/json', 200)).toBeNull();
  expect(checkNdjsonBody('', URL, 'application/x-ndjson', 204)).toBeNull();
});

test('redirect responses are not parsed as application JSON', () => {
  expect(checkJsonBody('not-json', URL, 'application/json', 302)).toBeNull();
  expect(checkNdjsonBody('not-json', URL, 'application/x-ndjson', 302)).toBeNull();
});

test('incomplete observer capture is not reported as malformed application JSON', () => {
  expect(checkJsonBody('{"truncated":', URL, 'application/json', 200, false)).toBeNull();
  expect(checkNdjsonBody('{"truncated":', URL, 'application/x-ndjson', 200, false)).toBeNull();
});
