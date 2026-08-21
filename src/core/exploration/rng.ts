import { createHash } from 'node:crypto';
import { RNG_ALGORITHM, RNG_VERSION } from './types';

const MASK_64 = 0xffff_ffff_ffff_ffffn;
const INCREMENT = 0x9e3779b97f4a7c15n;

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
type CanonicalSeed = `0x${string}`;

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
function parseCanonicalSeed(value: string): bigint {
  if (!/^0x[0-9a-f]{16}$/.test(value)) {
    throw new Error('seed must be canonical lowercase 0x-prefixed 16-hex uint64');
  }
  return BigInt(value);
}

export function formatCanonicalSeed(value: bigint): CanonicalSeed {
  return `0x${(value & MASK_64).toString(16).padStart(16, '0')}`;
}

export function deriveSeed(masterSeed: string, modelId: string, envelopeId: string, runOrdinal: number): CanonicalSeed {
  const master = parseCanonicalSeed(masterSeed);
  if (!Number.isSafeInteger(runOrdinal) || runOrdinal < 0) throw new Error('run ordinal must be a non-negative safe integer');
  const digest = createHash('sha256')
    .update(`${RNG_ALGORITHM}:${RNG_VERSION}|${formatCanonicalSeed(master)}|${modelId}|${envelopeId}|${runOrdinal}`, 'utf8')
    .digest('hex');
  return `0x${digest.slice(0, 16)}`;
}

function mix(value: bigint): bigint {
  let z = value & MASK_64;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK_64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK_64;
  return (z ^ (z >> 31n)) & MASK_64;
}

export class SplitMix64 {
  readonly algorithm = RNG_ALGORITHM;
  readonly version = RNG_VERSION;
  readonly seed: CanonicalSeed;
  private state: bigint;
  private index = 0;

  constructor(seed: string) {
    const parsed = parseCanonicalSeed(seed);
    this.seed = formatCanonicalSeed(parsed);
    this.state = parsed;
  }

  drawIndex(): number {
    return this.index;
  }

  nextUint64(): bigint {
    this.state = (this.state + INCREMENT) & MASK_64;
    const value = mix(this.state);
    this.index += 1;
    return value;
  }

  nextInt(exclusiveUpperBound: number): { value: number; drawIndex: number; draw: string } {
    if (!Number.isSafeInteger(exclusiveUpperBound) || exclusiveUpperBound <= 0) {
      throw new Error('RNG upper bound must be a positive safe integer');
    }
    const drawIndex = this.index;
    const raw = this.nextUint64();
    return {
      value: Number(raw % BigInt(exclusiveUpperBound)),
      drawIndex,
      draw: formatCanonicalSeed(raw),
    };
  }
}
