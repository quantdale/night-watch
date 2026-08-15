// Nightwatch Phase 8B sandbox-authority boundary.
//
// This is the ONLY module permitted to plan or execute a sandbox-confined
// source adoption. No campaign, AI review, browser, product, database,
// infrastructure, or publication code may import it. Canonical source write
// authority, Git commit/push authority, and publication authority are not
// present anywhere in this boundary.

export type {
  SelfDevAdoptionPlan,
  SelfDevAdoptionSandboxResult,
  SelfDevSandboxFailureClass,
  SelfDevSandboxProbeResult,
  SelfDevSandboxVerificationStatus,
} from './types';
export { SELFDEV_ADOPTION_PLAN_SCHEMA_VERSION, SELFDEV_ADOPTION_SANDBOX_RESULT_SCHEMA_VERSION } from './types';
export { inspectSelfDevAdoption, planAdoption, revalidatePlan, SelfDevSandboxPlannerError } from './planner';
export type { SelfDevAdoptionInspection, PlanAdoptionInput } from './planner';
export { runSandboxAdoption } from './sandboxExecutor';
export type { RunSandboxAdoptionInput } from './sandboxExecutor';
export { SelfDevAdoptionPlanStore, SelfDevAdoptionResultStore, SELFDEV_SANDBOX_NAMESPACE } from './storage';
export { validateAdoptionPlan, validateAdoptionSandboxResult, SelfDevSandboxValidationError } from './validation';
export { SELFDEV_SANDBOX_ROOT_BASE } from './sandboxMirror';
export { SelfDevSandboxLoaderBusyError } from './sandboxLoader';
