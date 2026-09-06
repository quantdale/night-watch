// ---------------------------------------------------------------------------
// Visible-only seeded discriminator. Executes the algorithm already described
// in the pre-fix snapshot against sample inputs that are also visible.
// Never reads hidden ground truth. No eval, no child process, no I/O.
// ---------------------------------------------------------------------------

export const VISIBLE_DISCRIMINATOR_KINDS = ['ROUND_THEN_SUM', 'HEALTH_OK'] as const;
export type VisibleDiscriminatorKind = (typeof VISIBLE_DISCRIMINATOR_KINDS)[number];

export type VisibleDiscriminator =
  | {
      readonly kind: 'ROUND_THEN_SUM';
      readonly amounts: readonly number[];
      readonly scale: number;
    }
  | {
      readonly kind: 'HEALTH_OK';
      readonly version: string;
    };

export interface VisibleReproObservation {
  readonly mismatch: boolean;
  readonly captured?: number;
  readonly displayed?: number;
  readonly version?: string;
}

export function parseVisibleDiscriminator(value: unknown): VisibleDiscriminator | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.kind === 'ROUND_THEN_SUM') {
    const amounts = record.amounts;
    const scale = record.scale;
    if (!Array.isArray(amounts) || amounts.length === 0 || amounts.length > 32) return null;
    if (!amounts.every((item) => typeof item === 'number' && Number.isFinite(item))) return null;
    if (typeof scale !== 'number' || !Number.isInteger(scale) || scale < 1 || scale > 10_000) return null;
    return { kind: 'ROUND_THEN_SUM', amounts: Object.freeze([...amounts]) as readonly number[], scale };
  }
  if (record.kind === 'HEALTH_OK') {
    if (typeof record.version !== 'string' || record.version.length === 0 || record.version.length > 32) return null;
    return { kind: 'HEALTH_OK', version: record.version };
  }
  return null;
}

export function runVisibleDiscriminator(discriminator: VisibleDiscriminator): VisibleReproObservation {
  if (discriminator.kind === 'HEALTH_OK') {
    return { mismatch: false, version: discriminator.version };
  }
  const round = (value: number): number => Math.round(value * discriminator.scale) / discriminator.scale;
  const captured = discriminator.amounts.reduce((sum, amount) => sum + round(amount), 0);
  const displayed = discriminator.amounts.reduce((sum, amount) => sum + amount, 0);
  return { mismatch: captured !== displayed, captured, displayed };
}

export function stringifyVisibleRepro(observation: VisibleReproObservation): string {
  return JSON.stringify(observation);
}
