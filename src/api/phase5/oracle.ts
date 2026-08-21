import crypto from 'node:crypto';
import type { ApiFingerprintInput, ApiOperation, ApiOracleObservation, OracleResult } from './types';

// Phase 15P A15 convergence: byte limit is module-private (no external callers).
const MAX_API_RESPONSE_BYTES = 2 * 1024 * 1024;

export function statusClass(status: number): string {
  if (!Number.isInteger(status) || status < 0) return 'invalid';
  return `${Math.floor(status / 100)}xx`;
}

export function contentTypeClass(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === '') return 'absent';
  return raw.split(';', 1)[0]?.trim().toLowerCase() || 'absent';
}

function parseJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function parseJsonChunks(value: string): boolean {
  if (parseJson(value)) return true;
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 && lines.every(parseJson);
}

function observation(operation: ApiOperation, result: OracleResult, status: number, contentType: string, parse: string, stream: string): ApiOracleObservation {
  return {
    oracleId: operation.oracleProfile ?? operation.operationId,
    result,
    statusClass: statusClass(status),
    contentTypeClass: contentType,
    parseCategory: parse,
    streamCategory: stream,
    bodyPersisted: false,
  };
}

export function evaluateApiResponse(
  operation: ApiOperation,
  status: number,
  headers: Readonly<Record<string, string | undefined>>,
  body: Uint8Array,
  complete = true,
): ApiOracleObservation {
  if (body.byteLength > MAX_API_RESPONSE_BYTES) return observation(operation, 'BODY_LIMIT_EXCEEDED', status, contentTypeClass(headers['content-type']), 'not-read', 'bounded-limit');
  if (!complete) return observation(operation, 'STREAM_INCOMPLETE', status, contentTypeClass(headers['content-type']), 'incomplete', 'incomplete');
  const type = contentTypeClass(headers['content-type']);
  const expected = operation.responseShapePolicy;
  if (expected === undefined) return observation(operation, 'NETWORK_FAILURE', status, type, 'missing-oracle', 'unknown');
  if (status < 200 || status >= 300) return observation(operation, 'STATUS_CLASS_MISMATCH', status, type, 'not-evaluated', operation.streamingType);
  if (expected.shape === 'EMPTY') {
    return body.byteLength === 0 || status === 204
      ? observation(operation, 'ORACLE_PASS', status, type, 'empty', 'empty')
      : observation(operation, 'EMPTY_BODY_UNEXPECTED', status, type, 'non-empty', 'empty');
  }
  if (type !== expected.expectedContentType) return observation(operation, 'CONTENT_TYPE_MISMATCH', status, type, 'not-evaluated', operation.streamingType);
  const text = Buffer.from(body).toString('utf8');
  if (expected.shape === 'NDJSON_LINES') {
    return parseJsonChunks(text)
      ? observation(operation, 'ORACLE_PASS', status, type, 'ndjson-valid', 'ndjson-complete')
      : observation(operation, 'NDJSON_PARSE_FAILURE', status, type, 'ndjson-invalid', 'ndjson-complete');
  }
  if (expected.shape === 'JSON_CHUNKS') {
    return parseJsonChunks(text)
      ? observation(operation, 'ORACLE_PASS', status, type, 'json-chunks-valid', 'json-chunks-complete')
      : observation(operation, 'JSON_PARSE_FAILURE', status, type, 'json-chunks-invalid', 'json-chunks-complete');
  }
  return parseJson(text)
    ? observation(operation, 'ORACLE_PASS', status, type, 'json-valid', 'single-json')
    : observation(operation, 'JSON_PARSE_FAILURE', status, type, 'json-invalid', 'single-json');
}

export function apiFingerprint(input: ApiFingerprintInput): string {
  const canonical = JSON.stringify({
    operationId: input.operationId,
    service: input.service,
    oracleId: input.oracleId,
    statusClass: input.statusClass,
    contentTypeClass: input.contentTypeClass,
    parseCategory: input.parseCategory,
    streamCategory: input.streamCategory,
    errorCategory: input.errorCategory,
    catalogVersion: input.catalogVersion,
  });
  return `fp:sha256:${crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 24)}`;
}
