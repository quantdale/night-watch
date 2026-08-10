// ---------------------------------------------------------------------------
// Nightwatch — proxy destination parser and policy adapter.
//
// Parsing is deliberately stricter than a permissive HTTP server. A malformed
// authority is rejected before OutboundProxyServer can call DNS or open a
// socket. Once parsed, classification is delegated to OutboundPolicy; this
// file does not carry host lists or alternate allow rules.
// ---------------------------------------------------------------------------

import { OutboundPolicy } from '../core/safety/outboundPolicy';
import type { OutboundDecision } from '../core/safety/types';
import type { ProxyProtocol } from './types';

export interface ProxyTarget {
  url: URL;
  protocol: ProxyProtocol;
  hostname: string;
  port: number;
  path: string;
}

export interface ProxyClassification {
  target: ProxyTarget | null;
  decision: OutboundDecision;
  ruleId: string;
}

function ruleId(decision: OutboundDecision): string {
  if (decision.reason.includes('unparsable')) return 'parse-failure';
  if (decision.reason.includes('embedded credentials')) return 'embedded-credentials';
  if (decision.reason.includes('allowlisted')) return 'environment-allowlist';
  if (decision.reason.includes('static asset')) return 'static-assets';
  if (decision.classification === 'BROWSER_BACKGROUND_GOOGLE') return 'browser-background-google';
  if (decision.classification === 'BROWSER_BACKGROUND_UPDATE') return 'browser-background-update';
  if (decision.classification === 'BROWSER_BACKGROUND_DOWNLOAD') return 'browser-background-download';
  if (decision.reason.includes('optional third-party support')) return 'optional-third-party-support';
  if (decision.reason.includes('telemetry')) return 'telemetry';
  if (decision.reason.includes('known Alphaus production')) return 'known-production';
  if (decision.reason.includes('Cloud Run')) return 'cloud-run-production';
  if (decision.reason.includes('unknown Alphaus')) return 'unknown-alphaus';
  if (decision.reason.includes('legacy Alphaus')) return 'legacy-alphaus';
  if (decision.reason.includes('localhost')) return 'localhost';
  return 'external-default-deny';
}

function reject(policy: OutboundPolicy): ProxyClassification {
  // Keep the semantic result fail-closed even for parser-only failures. This
  // string is intentionally not a URL and therefore reaches OutboundPolicy's
  // unparsable-URL deny rule.
  const decision = policy.decide('not a valid Nightwatch URL');
  return { target: null, decision, ruleId: 'parse-failure' };
}

function hostnameForSocket(hostname: string): string {
  return hostname.replace(/^\[/, '').replace(/\]$/, '');
}

function portFor(url: URL, protocol: string): number {
  if (url.port !== '') return Number(url.port);
  return protocol === 'http:' || protocol === 'ws:' ? 80 : 443;
}

function makeTarget(url: URL, protocol: ProxyProtocol): ProxyTarget {
  const socketProtocol = url.protocol;
  return {
    url,
    protocol,
    hostname: hostnameForSocket(url.hostname.toLowerCase()),
    port: portFor(url, socketProtocol),
    path: `${url.pathname || '/'}${url.search}`,
  };
}

/** Classify an absolute HTTP/WS URL, or reject it without network activity. */
export function classifyProxyUrl(
  policy: OutboundPolicy,
  rawUrl: string,
  protocolHint?: ProxyProtocol
): ProxyClassification {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return reject(policy);
  }
  if (url.username !== '' || url.password !== '') return reject(policy);

  const protocol = url.protocol.toLowerCase();
  const expected = protocolHint === 'http' ? 'http:' : protocolHint === 'ws' ? 'ws:' : undefined;
  if (expected !== undefined && protocol !== expected) return reject(policy);
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(protocol)) return reject(policy);

  const actualProtocol: ProxyProtocol =
    protocol === 'http:' ? 'http' : protocol === 'https:' ? 'https-connect' : protocol === 'ws:' ? 'ws' : 'wss';
  if (!Number.isInteger(portFor(url, protocol)) || portFor(url, protocol) < 1 || portFor(url, protocol) > 65535) {
    return reject(policy);
  }
  // Preserve the caller's raw spelling for policy normalization checks (for
  // example a trailing-dot hostname that URL canonicalization would erase).
  const decision = policy.decide(rawUrl);
  return { target: makeTarget(url, actualProtocol), decision, ruleId: ruleId(decision) };
}

/** Classify a CONNECT authority such as `host:443` before opening a socket. */
export function classifyProxyConnect(
  policy: OutboundPolicy,
  authority: string,
  protocol: 'https:' | 'wss:' = 'https:'
): ProxyClassification {
  if (authority.length === 0 || authority.trim() !== authority || /[\\/@?#\s]/.test(authority)) {
    return reject(policy);
  }
  const authorityMatch = authority.startsWith('[')
    ? /^\[([^\]]+)\]:(\d+)$/.exec(authority)
    : /^([^:]+):(\d+)$/.exec(authority);
  if (authorityMatch === null || (authorityMatch[1] ?? '').endsWith('.')) {
    return reject(policy);
  }
  const explicitPort = Number(authorityMatch[2]);
  if (!Number.isInteger(explicitPort) || explicitPort < 1 || explicitPort > 65535) {
    return reject(policy);
  }
  let url: URL;
  try {
    url = new URL(`${protocol}//${authority}/`);
  } catch {
    return reject(policy);
  }
  if (url.username !== '' || url.password !== '' || url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    return reject(policy);
  }
  const port = explicitPort;
  const decision = policy.decide(`${protocol}//${url.hostname}:${port}/`);
  const actualProtocol: ProxyProtocol = protocol === 'wss:' ? 'wss' : 'https-connect';
  return {
    target: {
      url,
      protocol: actualProtocol,
      hostname: hostnameForSocket(url.hostname.toLowerCase()),
      port,
      path: '/',
    },
    decision,
    ruleId: ruleId(decision),
  };
}

/** Parse a proxy request line, accepting absolute-form or safe origin-form. */
export function classifyForwardRequest(
  policy: OutboundPolicy,
  rawUrl: string | undefined,
  hostHeader: string | undefined
): ProxyClassification {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return reject(policy);
  let absolute = rawUrl;
  if (rawUrl.startsWith('/')) {
    if (typeof hostHeader !== 'string' || hostHeader.length === 0 || hostHeader.trim() !== hostHeader) {
      return reject(policy);
    }
    absolute = `http://${hostHeader}${rawUrl}`;
  }
  return classifyProxyUrl(policy, absolute, 'http');
}
