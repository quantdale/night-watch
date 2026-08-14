import http from 'node:http';
import { AiReviewError } from './errors';
import { renderFixedPrompt } from './prompt';
import { AI_PROVIDER_ADAPTER_VERSION, AI_REVIEW_BUDGET, type AiBugReviewInput, type AiOracleReviewInput, type AiReviewProvider } from './types';
import { assertProviderAdapterVersion, validateAiBugReviewInput, validateAiOracleReviewInput } from './validation';
import { isRecord } from './util';

const FIXED_PATH = '/v1/chat/completions';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function canonicalHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, '');
}

export function validateLoopbackEndpoint(endpoint: string): URL {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new AiReviewError('AI_PROVIDER_NOT_LOCAL');
  }
  const host = canonicalHost(url.hostname);
  const port = Number(url.port);
  if (url.protocol !== 'http:' || !LOOPBACK_HOSTS.has(host) || url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '' || url.pathname !== FIXED_PATH || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new AiReviewError('AI_PROVIDER_NOT_LOCAL');
  }
  return url;
}

interface LoopbackRequest {
  readonly kind: 'BUG_CANDIDATE' | 'ORACLE_SUGGESTION';
  readonly input: AiBugReviewInput | AiOracleReviewInput;
}

export class LoopbackAiReviewProvider implements AiReviewProvider {
  readonly providerClass = 'LOOPBACK_LOCAL' as const;
  readonly adapterVersion = AI_PROVIDER_ADAPTER_VERSION;
  readonly modelIdentifier: string;
  readonly endpoint: URL;
  readonly timeoutMs: number;

  constructor(options: { readonly endpoint: string; readonly modelIdentifier: string; readonly timeoutMs?: number }) {
    this.endpoint = validateLoopbackEndpoint(options.endpoint);
    if (!/^[A-Za-z0-9_.:/-]{1,100}$/.test(options.modelIdentifier)) throw new AiReviewError('AI_PROVIDER_NOT_LOCAL');
    this.modelIdentifier = options.modelIdentifier;
    this.timeoutMs = Math.min(options.timeoutMs ?? AI_REVIEW_BUDGET.perCallTimeoutMs, AI_REVIEW_BUDGET.perCallTimeoutMs);
    assertProviderAdapterVersion(this.adapterVersion);
  }

  reviewBugCandidate(input: AiBugReviewInput): Promise<string | Uint8Array> {
    try {
      return this.request({ kind: 'BUG_CANDIDATE', input: validateAiBugReviewInput(input) });
    } catch {
      return Promise.reject(new AiReviewError('AI_INPUT_PRIVACY_BLOCKED', { providerClass: this.providerClass }));
    }
  }

  suggestOracle(input: AiOracleReviewInput): Promise<string | Uint8Array> {
    try {
      return this.request({ kind: 'ORACLE_SUGGESTION', input: validateAiOracleReviewInput(input) });
    } catch {
      return Promise.reject(new AiReviewError('AI_INPUT_PRIVACY_BLOCKED', { providerClass: this.providerClass }));
    }
  }

  private request(request: LoopbackRequest): Promise<string | Uint8Array> {
    const body = JSON.stringify({
      model: this.modelIdentifier,
      stream: false,
      messages: [
        { role: 'system', content: renderFixedPrompt(request.input).split('\n\nEVIDENCE_DATA_JSON=')[0] },
        { role: 'user', content: JSON.stringify(request.input) },
      ],
    });
    const bodyBytes = Buffer.byteLength(body, 'utf8');
    if (bodyBytes > AI_REVIEW_BUDGET.maxInputBytes) return Promise.reject(new AiReviewError('AI_INPUT_PRIVACY_BLOCKED', { providerClass: this.providerClass, inputBytes: bodyBytes }));
    const host = canonicalHost(this.endpoint.hostname);
    const hostname = host === '::1' ? '::1' : host;
    return new Promise<string | Uint8Array>((resolve, reject) => {
      const requestHandle = http.request({
        protocol: 'http:',
        hostname,
        port: Number(this.endpoint.port),
        path: FIXED_PATH,
        method: 'POST',
        agent: false,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': String(bodyBytes),
          Connection: 'close',
        },
      }, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new AiReviewError(response.statusCode !== undefined && response.statusCode >= 300 && response.statusCode < 400 ? 'AI_PROVIDER_NOT_LOCAL' : 'AI_PROVIDER_UNAVAILABLE', { providerClass: this.providerClass }));
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on('data', (chunk: Buffer) => {
          bytes += chunk.byteLength;
          if (bytes > AI_REVIEW_BUDGET.maxOutputBytes) {
            requestHandle.destroy();
            reject(new AiReviewError('AI_PROVIDER_OUTPUT_TOO_LARGE', { providerClass: this.providerClass, outputBytes: bytes }));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => {
          try {
            const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if (!isRecord(parsed) || !Array.isArray(parsed.choices) || !isRecord(parsed.choices[0]) || !isRecord(parsed.choices[0].message) || typeof parsed.choices[0].message.content !== 'string') throw new Error('envelope');
            resolve(parsed.choices[0].message.content);
          } catch {
            reject(new AiReviewError('AI_PROVIDER_MALFORMED_OUTPUT', { providerClass: this.providerClass, outputBytes: bytes }));
          }
        });
      });
      requestHandle.setTimeout(this.timeoutMs, () => {
        requestHandle.destroy();
        reject(new AiReviewError('AI_PROVIDER_TIMEOUT', { providerClass: this.providerClass }));
      });
      requestHandle.on('error', () => reject(new AiReviewError('AI_PROVIDER_UNAVAILABLE', { providerClass: this.providerClass })));
      requestHandle.end(body);
    });
  }
}
