import { compileValidatedReadPlan } from './compiler';
import { assertOwnerPolicyAllows } from '../../core/policy/ownerScope';
import type {
  CompiledToolRequest,
  RawDataResult,
  RuntimeDataScope,
  ValidatedReadPlan,
} from './types';

export interface ReadToolInvoker {
  invoke(request: CompiledToolRequest): Promise<RawDataResult>;
}

/**
 * NW-AUD-032 — the module-private synthetic-seam capability.
 *
 * It is a `unique symbol`, so no caller can name it, forge it, or relabel an
 * object with it. Only `SyntheticReadToolInvoker` declares it, and the shared
 * authority below additionally requires the invoker's `invoke` to be exactly
 * this module's own implementation, so a subclass override or a replaced
 * method — the two shapes a relabelled foreign invoker would take — is refused.
 */
const SYNTHETIC_SEAM_CAPABILITY = Symbol('nightwatch-phase6-synthetic-read-seam-capability');

function carriesSyntheticSeamCapability(invoker: ReadToolInvoker): boolean {
  const capability = (invoker as unknown as Partial<Record<symbol, unknown>>)[SYNTHETIC_SEAM_CAPABILITY];
  if (capability !== true) return false;
  return invoker.invoke === SyntheticReadToolInvoker.prototype.invoke;
}

/**
 * NW-AUD-032 — the SINGLE shared authority every gated Phase-6 read passes
 * through.
 *
 * The owner freeze used to live only inside the DEFAULT
 * `GatedReadToolInvoker`, so any caller that injected its own
 * `ReadToolInvoker` reached a datastore seam with no owner decision at all.
 * The decision now happens at the adapter seam itself, BEFORE any invoker —
 * default, synthetic, or caller-supplied — is reached.
 *
 * The only exemption is the declared synthetic seam. Everything else is a
 * real datastore invocation, and under the permanent owner scope freeze every
 * Phase-6 datastore operation class is blocked, so a foreign invoker fails
 * closed rather than reaching a datastore.
 */
export function assertGatedReadAllowed(datastore: string, invoker: ReadToolInvoker): void {
  if (carriesSyntheticSeamCapability(invoker)) return;
  assertOwnerPolicyAllows(`${datastore}_DATA_ORACLE`);
}

/** Default real-data posture: no external datastore command is reachable. */
export class GatedReadToolInvoker implements ReadToolInvoker {
  async invoke(_request: CompiledToolRequest): Promise<RawDataResult> {
    // The owner freeze is the first and permanent boundary. This intentionally
    // throws before any future external command/connector can be added here.
    // Defense in depth: the adapter seam already refused everything that is
    // not the synthetic seam, so this can only ever be a second refusal.
    assertOwnerPolicyAllows(`${_request.datastore}_DATA_ORACLE`);
    throw new Error('REAL_DATA_GATE_BLOCKED: environment, scope, auth, and privacy gates are not confirmed');
  }
}

function assertValidated(plan: ValidatedReadPlan): void {
  if (plan.__validatedReadPlan !== true) throw new Error('READ_PLAN_NOT_VALIDATED');
}

abstract class BaseReadAdapter {
  protected constructor(protected readonly invoker: ReadToolInvoker) {}

  protected async executeValidated(plan: ValidatedReadPlan, scope: RuntimeDataScope, datastore: ValidatedReadPlan['plan']['datastore']): Promise<RawDataResult> {
    assertValidated(plan);
    if (plan.plan.datastore !== datastore) throw new Error('ADAPTER_DATASTORE_MISMATCH');
    // NW-AUD-032: the owner freeze is enforced HERE, at the one seam every
    // adapter execution passes through, before the invoker is reached. This is
    // what makes the gate independent of invoker implementation.
    assertGatedReadAllowed(datastore, this.invoker);
    return this.invoker.invoke(compileValidatedReadPlan(plan, scope));
  }
}

export class DynamoReadAdapter extends BaseReadAdapter {
  constructor(invoker: ReadToolInvoker) { super(invoker); }

  execute(plan: ValidatedReadPlan, scope: RuntimeDataScope): Promise<RawDataResult> {
    return this.executeValidated(plan, scope, 'DYNAMODB');
  }
}

export class BigQueryReadAdapter extends BaseReadAdapter {
  constructor(invoker: ReadToolInvoker) { super(invoker); }

  execute(plan: ValidatedReadPlan, scope: RuntimeDataScope): Promise<RawDataResult> {
    return this.executeValidated(plan, scope, 'BIGQUERY');
  }
}

export class SpannerReadAdapter extends BaseReadAdapter {
  constructor(invoker: ReadToolInvoker) { super(invoker); }

  execute(plan: ValidatedReadPlan, scope: RuntimeDataScope): Promise<RawDataResult> {
    return this.executeValidated(plan, scope, 'SPANNER');
  }
}

export interface SyntheticResponse {
  readonly rows: readonly unknown[];
  readonly bytes?: number;
  readonly durationMs?: number;
}

/**
 * Synthetic invoker used by Phase 6 tests. It records only plan/tool metadata;
 * response rows are returned to the in-memory normalizer and never recorded.
 *
 * NW-AUD-032: the `[SYNTHETIC_SEAM_CAPABILITY]` member is what lets the shared
 * authority recognise the declared synthetic seam. It is a module-private
 * unique symbol, so no caller can attach it to a different object.
 */export class SyntheticReadToolInvoker implements ReadToolInvoker {
  readonly [SYNTHETIC_SEAM_CAPABILITY] = true;
  private readonly responses = new Map<string, SyntheticResponse>();
  private readonly calls: Array<{ planFingerprint: string; tool: string }> = [];

  setResponse(planFingerprint: string, response: SyntheticResponse): void {
    this.responses.set(planFingerprint, response);
  }

  async invoke(request: CompiledToolRequest): Promise<RawDataResult> {
    this.calls.push({ planFingerprint: request.queryFingerprint, tool: request.tool });
    const response = this.responses.get(request.queryFingerprint) ?? { rows: [] };
    return {
      rows: response.rows,
      bytes: response.bytes ?? 0,
      durationMs: response.durationMs ?? 1,
      source: 'SYNTHETIC',
    };
  }

  invocationCount(): number {
    return this.calls.length;
  }

  invocationMetadata(): readonly { planFingerprint: string; tool: string }[] {
    return this.calls;
  }
}
