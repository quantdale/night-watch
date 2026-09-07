export const PROGRAMME_SCHEMA_VERSION: 'nightwatch.autonomous-programme-state.v1';

export interface ProgrammeStateValidationResult {
  readonly ok: boolean;
  readonly errors: string[];
}

export function validateProgrammeState(rawText: unknown): ProgrammeStateValidationResult;
