// Types for the closed receipt-schema table (`bin/lib/receipt-schemas.mjs`).
export interface ReceiptSchema {
  readonly subjects: readonly string[];
  readonly cleanEmitField: string;
  readonly executed: (body: Record<string, unknown>) => string[];
}
export const RECEIPT_SCHEMAS: Readonly<Record<string, ReceiptSchema>>;
export function subjectsOfSchemas(schemas: readonly string[]): readonly string[];
export function qualityGateExecutedSubjects(body: Record<string, unknown>): string[];
export function cleanCheckoutExecutedSubjects(body: Record<string, unknown>): string[];
export function uiHarnessExecutedSubjects(body: Record<string, unknown>): string[];
export function certificationExecutedSubjects(body: Record<string, unknown>): string[];
