// ---------------------------------------------------------------------------
// Nightwatch — named policy consumers.
//
// These helpers deliberately contain no classification logic. They make the
// browser HTTP/WS decisions explicit for consistency tests while retaining
// OutboundPolicy as the one semantic source of truth.
// ---------------------------------------------------------------------------

import { OutboundPolicy } from './outboundPolicy';
import type { OutboundDecision } from './types';

export function decideBrowserHttp(policy: OutboundPolicy, rawUrl: string): OutboundDecision {
  return policy.decide(rawUrl);
}

export function decideBrowserWebSocket(policy: OutboundPolicy, rawUrl: string): OutboundDecision {
  return policy.decide(rawUrl);
}
