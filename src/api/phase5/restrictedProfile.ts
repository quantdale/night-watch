import crypto from 'node:crypto';
import {
  OOPS_PROFILE_VERSION,
  type RestrictedOopsDocument,
  type RestrictedOopsHttp,
} from './types';

const ROOT_KEYS = new Set(['maintainers', 'tags', 'run']);
const HTTP_KEYS = new Set(['method', 'url', 'headers', 'query_params', 'asserts']);
const ASSERT_KEYS = new Set(['status_code']);
const FORBIDDEN_KEY_RE = /(?:^|[_-])(script|shell|command|prepare|check|preprocess|pre-process|response|file|form|payload|exec|notify|slack|github|pubsub|sns|sqs|spanner|secret|aws|credential|token|cookie)(?:$|[_-])/i;
const FORBIDDEN_VALUE_RE = /#!|\b(?:bash|sh|zsh|powershell|cmd|python|node)\b|(?:AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|GOOGLE_APPLICATION_CREDENTIALS|GITHUB_TOKEN|SLACK_WEBHOOK|Authorization:|Bearer\s+)/i;
const OPERATION_ID_RE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/;

export class RestrictedScenarioError extends Error {
  readonly code: string;

  constructor(code: string, message = code) {
    super(message);
    this.name = 'RestrictedScenarioError';
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertSafeKey(key: string): void {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    throw new RestrictedScenarioError('FORBIDDEN_KEY');
  }
  if (FORBIDDEN_KEY_RE.test(key)) throw new RestrictedScenarioError('FORBIDDEN_KEY');
}

function inspectTree(value: unknown): void {
  if (typeof value === 'string') {
    if (FORBIDDEN_VALUE_RE.test(value)) throw new RestrictedScenarioError('FORBIDDEN_VALUE');
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) inspectTree(item);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    assertSafeKey(key);
    inspectTree(child);
  }
}

function exactKeys(record: Record<string, unknown>, allowed: ReadonlySet<string>, required: ReadonlySet<string>): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) throw new RestrictedScenarioError('UNSUPPORTED_OOPS_FEATURE');
  }
  for (const key of required) {
    if (!(key in record)) throw new RestrictedScenarioError('MISSING_REQUIRED_KEY');
  }
}

function validateHttp(value: unknown, expectedOperationId?: string): RestrictedOopsHttp {
  if (!isRecord(value)) throw new RestrictedScenarioError('HTTP_NOT_OBJECT');
  exactKeys(value, HTTP_KEYS, new Set(['method', 'url', 'headers', 'query_params', 'asserts']));
  if (value['method'] !== 'GET') throw new RestrictedScenarioError('METHOD_NOT_READ');
  if (typeof value['url'] !== 'string') throw new RestrictedScenarioError('URL_NOT_STRING');
  const match = /^http:\/\/127\.0\.0\.1:(?:0|[1-9][0-9]{0,4})\/v1\/operations\/([a-z][a-z0-9]*(?:[._-][a-z0-9]+)+)$/.exec(value['url']);
  if (!match || !OPERATION_ID_RE.test(match[1] ?? '')) throw new RestrictedScenarioError('URL_NOT_RELAY_PLACEHOLDER');
  const port = Number(new URL(value['url']).port || '0');
  if (port !== 0 && (port < 1024 || port > 65535)) throw new RestrictedScenarioError('RELAY_PORT_UNSAFE');
  const operationId = match[1] as string;
  if (expectedOperationId !== undefined && operationId !== expectedOperationId) throw new RestrictedScenarioError('OPERATION_MISMATCH');

  if (!isRecord(value['headers'])) throw new RestrictedScenarioError('HEADERS_NOT_OBJECT');
  const headers = value['headers'];
  const headerKeys = Object.keys(headers).sort();
  if (headerKeys.join('|') !== 'Accept|X-Nightwatch-Operation-Id') throw new RestrictedScenarioError('UNSAFE_HEADERS');
  if (headers['Accept'] !== 'application/json' || headers['X-Nightwatch-Operation-Id'] !== operationId) {
    throw new RestrictedScenarioError('HEADER_OPERATION_MISMATCH');
  }
  if (!isRecord(value['query_params']) || Object.keys(value['query_params']).length !== 0) {
    throw new RestrictedScenarioError('QUERY_PARAMETERS_NOT_EMPTY');
  }
  if (!isRecord(value['asserts'])) throw new RestrictedScenarioError('ASSERTS_NOT_OBJECT');
  exactKeys(value['asserts'], ASSERT_KEYS, new Set(['status_code']));
  if (value['asserts']['status_code'] !== 200) throw new RestrictedScenarioError('STATUS_ASSERTION_NOT_200');
  return value as unknown as RestrictedOopsHttp;
}

export function parseRestrictedOopsScenario(text: string, expectedOperationId?: string): RestrictedOopsDocument {
  if (text.length === 0 || text.length > 64 * 1024) throw new RestrictedScenarioError('SCENARIO_SIZE');
  if (!text.trimStart().startsWith('{')) throw new RestrictedScenarioError('YAML_DIALECT_NOT_JSON_SUBSET');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new RestrictedScenarioError('SCENARIO_PARSE_FAILURE');
  }
  inspectTree(parsed);
  if (!isRecord(parsed)) throw new RestrictedScenarioError('SCENARIO_NOT_OBJECT');
  exactKeys(parsed, ROOT_KEYS, new Set(['maintainers', 'tags', 'run']));
  if (JSON.stringify(parsed['maintainers']) !== JSON.stringify(['nightwatch'])) {
    throw new RestrictedScenarioError('MAINTAINER_NOT_NIGHTWATCH');
  }
  if (!isRecord(parsed['tags'])) throw new RestrictedScenarioError('TAGS_NOT_OBJECT');
  const tags = parsed['tags'];
  if (tags['profile'] !== OOPS_PROFILE_VERSION || typeof tags['operation_id'] !== 'string') {
    throw new RestrictedScenarioError('PROFILE_OR_OPERATION_TAG_MISSING');
  }
  if (!OPERATION_ID_RE.test(tags['operation_id'])) throw new RestrictedScenarioError('OPERATION_ID_INVALID');
  if (!Array.isArray(parsed['run']) || parsed['run'].length !== 1) throw new RestrictedScenarioError('RUN_CARDINALITY');
  const run = parsed['run'][0];
  if (!isRecord(run) || Object.keys(run).length !== 1 || !('http' in run)) {
    throw new RestrictedScenarioError('RUN_NOT_HTTP_ONLY');
  }
  validateHttp(run['http'], tags['operation_id']);
  return parsed as unknown as RestrictedOopsDocument;
}

export function canonicalScenarioHash(input: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export function assertGeneratedScenarioSafe(text: string, expectedOperationId: string): RestrictedOopsDocument {
  return parseRestrictedOopsScenario(text, expectedOperationId);
}
