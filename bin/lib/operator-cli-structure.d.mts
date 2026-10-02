// Types for the operator-CLI structure analysis (`bin/lib/operator-cli-structure.mjs`).
export interface OperatorCliStructure {
  callsDefine: boolean;
  passesOwnMetadata: boolean;
  stopGated: boolean;
  declarationOnly: boolean;
}
export function analyzeOperatorCliStructure(code: string, fileName?: string): OperatorCliStructure;
