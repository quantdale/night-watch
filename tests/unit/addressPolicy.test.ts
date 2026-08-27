// ---------------------------------------------------------------------------
// Nightwatch — pure resolved-address parser/classifier and whole-set policy.
// ---------------------------------------------------------------------------

import { expect, test } from '@playwright/test';
import {
  admitResolvedAddressSet,
  classifyResolvedAddress,
  MAX_RESOLVED_ADDRESS_COUNT,
  normalizeResolvedAddress,
} from '../../src/proxy/addressPolicy';

function answer(address: string, family: 4 | 6) {
  return { address, family } as const;
}

test.describe('resolved address classification', () => {
  test('classifies IPv4 boundaries without textual-prefix shortcuts', () => {
    const cases: Array<[string, string]> = [
      ['0.0.0.0', 'unspecified'],
      ['0.255.255.255', 'unspecified'],
      ['127.0.0.1', 'loopback'],
      ['127.255.255.255', 'loopback'],
      ['10.0.0.0', 'private'],
      ['10.255.255.255', 'private'],
      ['11.0.0.0', 'global-unicast'],
      ['172.16.0.0', 'private'],
      ['172.31.255.255', 'private'],
      ['172.32.0.0', 'global-unicast'],
      ['192.168.0.0', 'private'],
      ['192.168.255.255', 'private'],
      ['192.169.0.0', 'global-unicast'],
      ['169.254.0.0', 'link-local'],
      ['169.254.255.255', 'link-local'],
      ['100.64.0.0', 'shared'],
      ['100.127.255.255', 'shared'],
      ['100.128.0.0', 'global-unicast'],
      ['192.0.0.0', 'special-use'],
      ['192.0.0.255', 'special-use'],
      ['192.0.1.0', 'global-unicast'],
      ['192.0.2.0', 'documentation'],
      ['192.0.2.255', 'documentation'],
      ['192.0.3.0', 'global-unicast'],
      ['192.31.196.0', 'special-use'],
      ['192.31.196.255', 'special-use'],
      ['192.31.197.0', 'global-unicast'],
      ['192.52.193.0', 'special-use'],
      ['192.52.193.255', 'special-use'],
      ['192.52.194.0', 'global-unicast'],
      ['192.88.99.0', 'special-use'],
      ['192.88.99.255', 'special-use'],
      ['192.88.100.0', 'global-unicast'],
      ['198.18.0.0', 'benchmark'],
      ['198.19.255.255', 'benchmark'],
      ['198.20.0.0', 'global-unicast'],
      ['203.0.113.0', 'documentation'],
      ['203.0.113.255', 'documentation'],
      ['223.255.255.255', 'global-unicast'],
      ['224.0.0.0', 'multicast'],
      ['239.255.255.255', 'multicast'],
      ['240.0.0.0', 'reserved'],
      ['254.255.255.255', 'reserved'],
      ['255.255.255.255', 'broadcast'],
    ];
    for (const [address, expected] of cases) {
      expect(classifyResolvedAddress(address, 4), address).toMatchObject({
        valid: true,
        family: 4,
        addressClass: expected,
        canonicalAddress: address,
      });
    }
  });

  test('classifies IPv6 boundaries and canonicalizes equivalent spellings', () => {
    const cases: Array<[string, string]> = [
      ['::', 'unspecified'],
      ['::1', 'loopback'],
      ['::2', 'reserved'],
      ['fe80::', 'link-local'],
      ['febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 'link-local'],
      ['fec0::', 'reserved'],
      ['fc00::', 'unique-local'],
      ['fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 'unique-local'],
      ['fe00::', 'reserved'],
      ['ff00::', 'multicast'],
      ['ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 'multicast'],
      ['2001:db8::', 'documentation'],
      ['2001:db8:ffff:ffff:ffff:ffff:ffff:ffff', 'documentation'],
      ['2001:2::', 'benchmark'],
      ['2001:2:0:ffff:ffff:ffff:ffff:ffff', 'benchmark'],
      ['64:ff9b::', 'special-use'],
      ['64:ff9b::ffff:ffff', 'special-use'],
      ['64:ff9b::1:0:0', 'reserved'],
      ['64:ff9b:1::', 'special-use'],
      ['64:ff9b:1:ffff:ffff:ffff:ffff:ffff', 'special-use'],
      ['64:ff9b:2::', 'reserved'],
      ['100::', 'special-use'],
      ['100:0:0:ffff:ffff:ffff:ffff:ffff', 'reserved'],
      ['100:0:1::', 'reserved'],
      ['2001::', 'special-use'],
      ['2001:0:ffff:ffff:ffff:ffff:ffff:ffff', 'special-use'],
      ['2001:1:0:ffff:ffff:ffff:ffff:ffff', 'special-use'],
      ['2001:1:1::', 'special-use'],
      ['2001:3::', 'special-use'],
      ['2001:3:0:ffff:ffff:ffff:ffff:ffff', 'special-use'],
      ['2001:3:1::', 'special-use'],
      ['2001:10::', 'special-use'],
      ['2001:1f:ffff:ffff:ffff:ffff:ffff:ffff', 'special-use'],
      ['2001:20::', 'special-use'],
      ['2001:2f:ffff:ffff:ffff:ffff:ffff:ffff', 'special-use'],
      ['2001:30::', 'global-unicast'],
      ['2002::', 'special-use'],
      ['2002:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 'special-use'],
      ['2003::', 'global-unicast'],
      ['2001:1::', 'special-use'],
      ['2000::', 'global-unicast'],
      ['3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 'global-unicast'],
      ['4000::', 'reserved'],
    ];
    for (const [address, expected] of cases) {
      expect(classifyResolvedAddress(address, 6), address).toMatchObject({
        valid: true,
        family: 6,
        addressClass: expected,
      });
    }
    expect(normalizeResolvedAddress('2001:0DB8:0:0:0:0:0:1', 6)).toBe('2001:db8::1');
    expect(normalizeResolvedAddress('0:0:0:0:0:0:0:1', 6)).toBe('::1');
    expect(normalizeResolvedAddress('::ffff:192.0.2.1', 6)).toBe('::ffff:c000:201');
  });

  test('normalizes and classifies IPv4-mapped IPv6 variants', () => {
    expect(classifyResolvedAddress('::ffff:127.0.0.1', 6)).toMatchObject({
      valid: true,
      addressClass: 'loopback',
      mapped: true,
      mappedIpv4: '127.0.0.1',
    });
    expect(classifyResolvedAddress('::ffff:192.168.1.1', 6)).toMatchObject({
      valid: true,
      addressClass: 'private',
      mapped: true,
      mappedIpv4: '192.168.1.1',
    });
    expect(classifyResolvedAddress('::ffff:8.8.8.8', 6)).toMatchObject({
      valid: true,
      addressClass: 'global-unicast',
      mapped: true,
      mappedIpv4: '8.8.8.8',
    });
  });

  test('rejects ambiguous text and family/address mismatches', () => {
    for (const [address, family] of [
      ['01.2.3.4', 4],
      ['1.2.3.999', 4],
      ['1.2.3', 4],
      [' 127.0.0.1', 4],
      ['127.0.0.1 ', 4],
      ['[::1]', 6],
      ['fe80::1%lo0', 6],
      ['1:2:3:4:5:6:7', 6],
      ['1:2:3:4:5:6:7:8:9', 6],
      ['1::2::3', 6],
      ['192.0.2.1::', 6],
      ['127.0.0.1', 6],
      ['::1', 4],
    ] as const) {
      expect(classifyResolvedAddress(address, family), `${address}/${family}`).toMatchObject({
        valid: false,
        addressClass: 'invalid',
        family: null,
      });
    }
  });
});

test.describe('whole resolved-address answer-set policy', () => {
  test('local admits only exact canonical loopback and deduplicates forms', () => {
    const result = admitResolvedAddressSet('local', [
      answer('0:0:0:0:0:0:0:1', 6),
      answer('127.0.0.1', 4),
      answer('::1', 6),
      answer('127.0.0.1', 4),
    ]);
    expect(result).toMatchObject({ outcome: 'admitted', reason: 'ADDRESS_SET_ACCEPTED', answerCount: 4 });
    if (result.outcome !== 'admitted') throw new Error('expected admitted result');
    expect(result.addresses).toEqual([
      { address: '127.0.0.1', family: 4, addressClass: 'loopback', mapped: false },
      { address: '::1', family: 6, addressClass: 'loopback', mapped: false },
    ]);
    expect(result.selected).toEqual(result.addresses[0]);
  });

  test('external environments admit only globally routable unicast answers', () => {
    expect(admitResolvedAddressSet('dev', [answer('8.8.8.8', 4)])).toMatchObject({ outcome: 'admitted' });
    expect(admitResolvedAddressSet('next', [answer('2001:4860:4860::8888', 6)])).toMatchObject({ outcome: 'admitted' });
    for (const item of [
      answer('10.0.0.1', 4),
      answer('169.254.1.1', 4),
      answer('100.64.0.1', 4),
      answer('192.0.2.1', 4),
      answer('198.18.0.1', 4),
      answer('224.0.0.1', 4),
      answer('240.0.0.1', 4),
      answer('fc00::1', 6),
      answer('fe80::1', 6),
      answer('2001:db8::1', 6),
      answer('::ffff:8.8.8.8', 6),
    ]) {
      expect(admitResolvedAddressSet('dev', [item]), item.address).toMatchObject({
        outcome: 'denied',
        selected: null,
      });
    }
  });

  test('mixed, malformed, empty, duplicate, and oversized sets fail closed', () => {
    const mixed = admitResolvedAddressSet('dev', [answer('8.8.8.8', 4), answer('10.0.0.1', 4)]);
    expect(mixed).toMatchObject({ outcome: 'denied', reason: 'MIXED_ANSWER_SET' });
    expect(admitResolvedAddressSet('local', [answer('127.0.0.1', 4), answer('127.0.0.2', 4)])).toMatchObject({
      outcome: 'denied',
      reason: 'MIXED_ANSWER_SET',
    });
    expect(admitResolvedAddressSet('local', [answer('127.0.0.2', 4)])).toMatchObject({
      outcome: 'denied',
      reason: 'LOCAL_ADDRESS_NOT_EXACT',
    });
    expect(admitResolvedAddressSet('local', [{ address: '127.0.0.1', family: 6 }])).toMatchObject({
      outcome: 'failed',
      reason: 'ADDRESS_FAMILY_MISMATCH',
    });
    expect(admitResolvedAddressSet('local', [{ address: 'not-an-address', family: 4 }])).toMatchObject({
      outcome: 'failed',
      reason: 'MALFORMED_ADDRESS',
    });
    expect(admitResolvedAddressSet('local', [])).toMatchObject({ outcome: 'failed', reason: 'EMPTY_ANSWER' });
    expect(admitResolvedAddressSet('local', Array.from({ length: MAX_RESOLVED_ADDRESS_COUNT + 1 }, () => answer('127.0.0.1', 4)))).toMatchObject({
      outcome: 'failed',
      reason: 'ANSWER_SET_OVERSIZED',
    });
  });

  test('admitted result is invariant under answer order', () => {
    const first = admitResolvedAddressSet('dev', [answer('2001:4860:4860::8888', 6), answer('8.8.8.8', 4)]);
    const second = admitResolvedAddressSet('dev', [answer('8.8.8.8', 4), answer('2001:4860:4860::8888', 6)]);
    expect(second).toEqual(first);
  });

  test('fails closed for every mixed or malformed answer permutation', () => {
    const cases: readonly (readonly { readonly address: string; readonly family: 4 | 6 }[])[] = [
      [answer('8.8.8.8', 4), answer('10.0.0.1', 4)],
      [answer('8.8.8.8', 4), answer('not-an-address', 4)],
      [answer('127.0.0.1', 4), answer('127.0.0.2', 4)],
      [answer('127.0.0.1', 4), answer('::2', 6)],
      [answer('2001:4860:4860::8888', 6), answer('fc00::1', 6)],
    ];
    for (const values of cases) {
      const reverse = [...values].reverse();
      const first = admitResolvedAddressSet('dev', values);
      const second = admitResolvedAddressSet('dev', reverse);
      expect(first.outcome).not.toBe('admitted');
      expect(second).toEqual(first);
    }
  });
});
