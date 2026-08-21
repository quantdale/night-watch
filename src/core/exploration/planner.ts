import { SplitMix64 } from './rng';
import type {
  ExplorationBudget,
  ExplorationEnvelope,
  ExplorationState,
  PlannerDecision,
  PlannerExclusion,
  SafeAction,
} from './types';
import { PLANNER_VERSION } from './types';

function mapMatches(actual: Readonly<Record<string, string | number | boolean>>, expected: Readonly<Record<string, string | number | boolean>> | undefined): boolean {
  if (expected === undefined) return true;
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

function hasForbiddenMatch(actual: Readonly<Record<string, string | number | boolean>>, forbidden: Readonly<Record<string, string | number | boolean>> | undefined): boolean {
  if (forbidden === undefined) return false;
  return Object.entries(forbidden).some(([key, value]) => actual[key] === value);
}

function visitKey(stateId: string, actionId: string): string {
  return `${stateId}|${actionId}`;
}

// Phase 15P A15 convergence: de-exported (module-private, zero external callers).
interface PlannerSelection {
  readonly decision: PlannerDecision;
  readonly action: SafeAction | null;
}

export class SeededFrontierPlanner {
  readonly version = PLANNER_VERSION;
  readonly rng: SplitMix64;
  private readonly visits = new Map<string, number>();
  private readonly stateVisits = new Map<string, number>();
  private readonly transitionVisits = new Map<string, number>();

  constructor(seed: string) {
    this.rng = new SplitMix64(seed);
  }

  stateVisitCount(stateId: string): number {
    return this.stateVisits.get(stateId) ?? 0;
  }

  transitionVisitCount(stateId: string, actionId: string): number {
    return this.transitionVisits.get(visitKey(stateId, actionId)) ?? 0;
  }

  noteState(stateId: string): void {
    this.stateVisits.set(stateId, this.stateVisitCount(stateId) + 1);
  }

  noteAttempt(stateId: string, actionId: string): void {
    const key = visitKey(stateId, actionId);
    this.transitionVisits.set(key, this.transitionVisitCount(stateId, actionId) + 1);
    this.visits.set(actionId, (this.visits.get(actionId) ?? 0) + 1);
  }

  select(
    state: ExplorationState,
    catalog: readonly SafeAction[],
    envelope: ExplorationEnvelope,
    budget: ExplorationBudget,
    actionIndex: number,
  ): PlannerSelection {
    const envelopeIds = new Set(envelope.allowedActionIds);
    const catalogById = new Map(catalog.map((action) => [action.actionId, action]));
    const candidates = [...envelopeIds]
      .map((id) => catalogById.get(id))
      .filter((action): action is SafeAction => action !== undefined)
      .sort((a, b) => a.actionId.localeCompare(b.actionId));
    const excludedActions: PlannerExclusion[] = [];
    const eligible: SafeAction[] = [];

    for (const action of candidates) {
      if (action.status !== 'APPROVED') {
        excludedActions.push({ actionId: action.actionId, reason: 'STALE_SOURCE' });
        continue;
      }
      if (action.semanticClass !== 'KNOWN_READ' && action.semanticClass !== 'LOCAL_ONLY') {
        excludedActions.push({ actionId: action.actionId, reason: 'SEMANTIC_POLICY_BLOCK' });
        continue;
      }
      if (!action.preconditions.routeClasses.includes(state.routeClass)) {
        excludedActions.push({ actionId: action.actionId, reason: 'ROUTE_NOT_APPROVED' });
        continue;
      }
      if (!mapMatches(state.structuralFlags, action.preconditions.requiredStructuralFlags)) {
        excludedActions.push({ actionId: action.actionId, reason: 'PRECONDITION_FALSE' });
        continue;
      }
      if (!mapMatches(state.safeViewState, action.preconditions.requiredSafeViewState) ||
        hasForbiddenMatch(state.safeViewState, action.preconditions.forbiddenSafeViewState)) {
        excludedActions.push({ actionId: action.actionId, reason: 'PRECONDITION_FALSE' });
        continue;
      }
      if (!state.availableActionIds.includes(action.actionId)) {
        excludedActions.push({ actionId: action.actionId, reason: 'RUNTIME_CONTROL_ABSENT' });
        continue;
      }
      const visits = this.transitionVisitCount(state.stateId, action.actionId);
      if (visits >= envelope.maxTransitionVisits) {
        excludedActions.push({ actionId: action.actionId, reason: 'MAX_VISITS_REACHED' });
        continue;
      }
      if (this.stateVisitCount(state.stateId) > envelope.maxStateVisits) {
        excludedActions.push({ actionId: action.actionId, reason: 'ACTION_ALREADY_EXHAUSTED' });
        continue;
      }
      if (actionIndex >= Math.min(budget.maxActionsPerSequence, envelope.maxActionsPerSequence) ||
        actionIndex >= Math.min(budget.maxDepth, envelope.maxDepth)) {
        excludedActions.push({ actionId: action.actionId, reason: 'BUDGET_LIMIT' });
        continue;
      }
      eligible.push(action);
    }

    const leastVisits = eligible.length === 0
      ? 0
      : Math.min(...eligible.map((action) => this.transitionVisitCount(state.stateId, action.actionId)));
    const frontier = eligible.filter((action) => this.transitionVisitCount(state.stateId, action.actionId) === leastVisits);
    const draw = frontier.length > 0 ? this.rng.nextInt(frontier.length) : { value: 0, drawIndex: this.rng.drawIndex(), draw: '0x0000000000000000' };
    const action = frontier[draw.value] ?? null;
    const decision: PlannerDecision = {
      index: actionIndex,
      stateId: state.stateId,
      eligibleActions: eligible.map((candidate) => candidate.actionId),
      excludedActions,
      rngDrawIndex: draw.drawIndex,
      rngDraw: draw.draw,
      chosenAction: action?.actionId ?? null,
      budgetRemaining: Math.max(0, Math.min(budget.maxActionsPerSequence, envelope.maxActionsPerSequence) - actionIndex),
    };
    return { decision, action };
  }
}
