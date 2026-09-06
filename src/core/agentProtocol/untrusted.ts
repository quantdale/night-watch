// ---------------------------------------------------------------------------
// Every product/source/evidence byte the reasoner inspects is untrusted.
// Instructions found inside it have zero authority.
// Pure data.
// ---------------------------------------------------------------------------

import { UNTRUSTED_ENVELOPE_VERSION } from './versions';

export { UNTRUSTED_ENVELOPE_VERSION };

export const UNTRUSTED_SOURCES = [
  'SOURCE_CODE',
  'HTML',
  'DOM_TEXT',
  'LOG',
  'API_RESPONSE',
  'HISTORICAL_RECORD',
  'DOCUMENTATION',
] as const;
export type UntrustedSource = (typeof UNTRUSTED_SOURCES)[number];

export const UNTRUSTED_BYTE_CAP = 16_384 as const;

export interface UntrustedEnvelope {
  readonly schemaVersion: typeof UNTRUSTED_ENVELOPE_VERSION;
  readonly trust: 'UNTRUSTED';
  readonly source: UntrustedSource;
  readonly digest: string;
  readonly bytes: string;
}

const INJECTION_RE =
  /ignore(?:\s+|_)previous(?:\s+|_)instructions|run this command|upload credentials|shell:\s*true/i;

export function untrustedLooksLikeInjection(bytes: string): boolean {
  return INJECTION_RE.test(bytes);
}
