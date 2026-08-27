// ---------------------------------------------------------------------------
// Nightwatch — bounded resolver/admission boundary tests.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import { resolveAndAdmitTarget, type ProxyResolver } from '../../src/proxy/resolver';

function resolverFor(records: readonly { address: string; family: 4 | 6 }[], calls: string[]): ProxyResolver {
  return {
    resolve: async (hostname) => {
      calls.push(hostname);
      return records;
    },
  };
}

test.describe('bounded resolver admission', () => {
  test('resolves only non-literal names and admits the complete safe set', async () => {
    const calls: string[] = [];
    const resolver = resolverFor([
      { address: '8.8.8.8', family: 4 },
      { address: '2001:4860:4860::8888', family: 6 },
    ], calls);
    const result = await resolveAndAdmitTarget('Allowed.Synthetic.Test', 'dev', resolver);
    expect(result).toMatchObject({ outcome: 'admitted', reason: 'ADDRESS_SET_ACCEPTED', answerCount: 2 });
    expect(calls).toEqual(['allowed.synthetic.test']);

    const literal = await resolveAndAdmitTarget('127.0.0.1', 'local', resolver);
    expect(literal).toMatchObject({ outcome: 'admitted', reason: 'LITERAL_ADDRESS', answerCount: 1 });
    expect(calls).toEqual(['allowed.synthetic.test']);

    const localhost = await resolveAndAdmitTarget('localhost', 'local', resolver);
    expect(localhost).toMatchObject({ outcome: 'admitted', reason: 'LOCALHOST_CANONICALIZED' });
    expect(calls).toEqual(['allowed.synthetic.test']);
  });

  test('distinguishes policy denial, resolver errors, malformed answers, and timeout', async () => {
    const calls: string[] = [];
    const unsafe = resolverFor([{ address: '127.0.0.2', family: 4 }], calls);
    expect(await resolveAndAdmitTarget('local.synthetic.test', 'local', unsafe)).toMatchObject({
      outcome: 'denied',
      reason: 'LOCAL_ADDRESS_NOT_EXACT',
    });

    const errorResolver: ProxyResolver = { resolve: async () => { throw new Error('SYNTHETIC_RAW_ERROR'); } };
    expect(await resolveAndAdmitTarget('error.synthetic.test', 'dev', errorResolver)).toMatchObject({
      outcome: 'failed',
      reason: 'RESOLVER_ERROR',
    });
    const malformed = resolverFor([{ address: 'not-an-address', family: 4 }], calls);
    expect(await resolveAndAdmitTarget('malformed.synthetic.test', 'dev', malformed)).toMatchObject({
      outcome: 'failed',
      reason: 'MALFORMED_ADDRESS',
    });
    const mismatch = resolverFor([{ address: '127.0.0.1', family: 6 }], calls);
    expect(await resolveAndAdmitTarget('mismatch.synthetic.test', 'local', mismatch)).toMatchObject({
      outcome: 'failed',
      reason: 'ADDRESS_FAMILY_MISMATCH',
    });

    let release: (() => void) | undefined;
    const lateResolver: ProxyResolver = {
      resolve: async () => await new Promise<readonly { address: string; family: 4 }[]>((resolve) => { release = () => resolve([{ address: '8.8.8.8', family: 4 }]); }),
    };
    const timedOut = await resolveAndAdmitTarget('late.synthetic.test', 'dev', lateResolver, { timeoutMs: 10 });
    expect(timedOut).toMatchObject({ outcome: 'failed', reason: 'RESOLUTION_TIMEOUT' });
    release?.();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(timedOut.selected).toBeNull();
  });

  test('rejects mixed and oversized resolver answers before selection', async () => {
    const mixed: ProxyResolver = {
      resolve: async () => [
        { address: '8.8.8.8', family: 4 },
        { address: '10.0.0.1', family: 4 },
      ],
    };
    expect(await resolveAndAdmitTarget('mixed.synthetic.test', 'dev', mixed)).toMatchObject({
      outcome: 'denied',
      reason: 'MIXED_ANSWER_SET',
      selected: null,
    });
    const oversized: ProxyResolver = {
      resolve: async () => Array.from({ length: 9 }, () => ({ address: '8.8.8.8', family: 4 })),
    };
    expect(await resolveAndAdmitTarget('many.synthetic.test', 'dev', oversized)).toMatchObject({
      outcome: 'failed',
      reason: 'ANSWER_SET_OVERSIZED',
    });

    const injectedSocketAuthority = {
      resolve: async () => [{ address: '8.8.8.8', family: 4, socket: 'SYNTHETIC_SOCKET' }],
    } as unknown as ProxyResolver;
    expect(await resolveAndAdmitTarget('authority.synthetic.test', 'dev', injectedSocketAuthority)).toMatchObject({
      outcome: 'failed',
      reason: 'MALFORMED_ADDRESS',
      selected: null,
    });
  });
});
