// ---------------------------------------------------------------------------
// NW-05 — one abortable deadline per relay operation.
//
// The relay used a per-attempt `Promise.race` timeout:
//
//   - `fetch` received no `AbortSignal`, so the losing race branch REJECTED
//     while the DNS lookup, socket, header read and body stream all kept
//     running. The caller was told the operation had timed out while owned
//     work continued;
//   - the timer wrapped one attempt, so a redirect received another full
//     budget — a 15 s "timeout" bounded a 30 s operation;
//   - auth-header acquisition happened before the timer existed, so a hung
//     credential fetch was unbounded entirely.
//
// A deadline is therefore created ONCE at the operation boundary and owns
// everything: auth, connection, headers, redirect and body. `remainingMs()`
// is what each stage gets, so the stages share one budget instead of each
// taking a fresh one. Cancellation composes: a caller's signal aborts the
// operation's signal, and the operation's signal is what reaches `fetch`, so
// aborting actually stops the transport rather than abandoning it.
//
// The taxonomy is frozen here rather than inferred at the catch site, because
// "the deadline expired" and "the transport failed" are different operator
// facts and the previous code reported both as a network failure.
//
// Uses a monotonic clock: wall-clock adjustment during an operation must not
// extend or collapse its budget.
// ---------------------------------------------------------------------------

export const RELAY_FAILURE_CLASSES = [
  'DEADLINE_EXCEEDED',
  'CALLER_ABORTED',
  'TRANSPORT_FAILED',
] as const;
export type RelayFailureClass = (typeof RELAY_FAILURE_CLASSES)[number];

export class RelayOperationError extends Error {
  readonly code: RelayFailureClass;
  /** Which stage owned the budget when it ran out. Never a payload. */
  readonly stage: string;

  constructor(code: RelayFailureClass, stage: string) {
    super(`${code}: ${stage}`);
    this.code = code;
    this.stage = stage;
    this.name = 'RelayOperationError';
  }
}

export interface RelayDeadline {
  /** Passed to `fetch` and to every cancellable stage. */
  readonly signal: AbortSignal;
  /** Milliseconds left, never negative. */
  remainingMs(): number;
  /** True once the budget is gone or the caller aborted. */
  readonly settled: boolean;
  /** Why it settled, or null while it is still open. */
  reason(): RelayFailureClass | null;
  /** Idempotent. Clears the timer and detaches the caller listener. */
  dispose(): void;
}

export interface RelayDeadlineOptions {
  /** A caller's cancellation, composed into this operation's signal. */
  readonly callerSignal?: AbortSignal;
  /** Injectable monotonic clock, so tests need no wall-clock sleeps. */
  readonly monotonicNow?: () => number;
  /** Injectable timer, so a test can fire the deadline deterministically. */
  readonly setTimer?: (fn: () => void, ms: number) => unknown;
  readonly clearTimer?: (handle: unknown) => void;
}

export function createRelayDeadline(totalMs: number, options: RelayDeadlineOptions = {}): RelayDeadline {
  if (!Number.isFinite(totalMs) || totalMs <= 0) throw new RelayOperationError('DEADLINE_EXCEEDED', 'budget');
  const now = options.monotonicNow ?? (() => Number(process.hrtime.bigint() / 1_000_000n));
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as NodeJS.Timeout));
  const started = now();
  const controller = new AbortController();
  let cause: RelayFailureClass | null = null;
  let disposed = false;

  const settle = (reason: RelayFailureClass): void => {
    if (cause !== null) return;
    cause = reason;
    // Abort BEFORE the caller sees a rejection, so no stage can observe a
    // terminal outcome while its transport is still live.
    if (!controller.signal.aborted) controller.abort(new RelayOperationError(reason, 'operation'));
  };

  const handle = setTimer(() => settle('DEADLINE_EXCEEDED'), totalMs);
  const onCallerAbort = (): void => settle('CALLER_ABORTED');
  if (options.callerSignal !== undefined) {
    if (options.callerSignal.aborted) settle('CALLER_ABORTED');
    else options.callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  }

  return {
    signal: controller.signal,
    remainingMs(): number {
      const left = totalMs - (now() - started);
      return left > 0 ? left : 0;
    },
    get settled(): boolean {
      return cause !== null;
    },
    reason(): RelayFailureClass | null {
      return cause;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      clearTimer(handle);
      options.callerSignal?.removeEventListener('abort', onCallerAbort);
    },
  };
}

/**
 * Run one stage under the operation's deadline. On expiry the deadline has
 * already aborted, so the stage's own transport is stopping; this only decides
 * what the caller is told, and it says which stage owned the budget.
 */
export async function withDeadline<T>(stage: string, deadline: RelayDeadline, work: Promise<T>): Promise<T> {
  const existing = deadline.reason();
  if (existing !== null) throw new RelayOperationError(existing, stage);
  return await Promise.race([
    work,
    new Promise<never>((_, rejectStage) => {
      if (deadline.signal.aborted) {
        rejectStage(new RelayOperationError(deadline.reason() ?? 'DEADLINE_EXCEEDED', stage));
        return;
      }
      deadline.signal.addEventListener(
        'abort',
        () => rejectStage(new RelayOperationError(deadline.reason() ?? 'DEADLINE_EXCEEDED', stage)),
        { once: true },
      );
    }),
  ]);
}

/** Classify a thrown value for the observation, preserving the distinction. */
export function classifyRelayFailure(error: unknown): RelayFailureClass {
  if (error instanceof RelayOperationError) return error.code;
  const name = (error as { name?: unknown } | null)?.name;
  if (name === 'AbortError') return 'CALLER_ABORTED';
  return 'TRANSPORT_FAILED';
}
