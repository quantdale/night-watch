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

/** Default real-data posture: no external datastore command is reachable. */
export class GatedReadToolInvoker implements ReadToolInvoker {
  async invoke(_request: CompiledToolRequest): Promise<RawDataResult> {
    // The owner freeze is the first and permanent boundary. This intentionally
    // throws before any future external command/connector can be added here.
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
 */
export class SyntheticReadToolInvoker implements ReadToolInvoker {
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
