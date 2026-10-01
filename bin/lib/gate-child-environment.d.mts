export declare const GATE_CHILD_PUSH_BEFORE: 'NIGHTWATCH_PUSH_BEFORE';
export declare const FORBIDDEN_ENVIRONMENT_KEYS: readonly string[];
export declare function buildGateChildEnvironment(
  parentEnvironment: NodeJS.ProcessEnv,
  input: { mode: string, commandKey?: string | null },
): NodeJS.ProcessEnv;
