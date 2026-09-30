export interface ProbeBindingInput {
  readonly certifiedCheckpointSha: string | null;
  readonly headSha: string | null;
  readonly treeClean: boolean | null;
  readonly documentaryDescendant?: boolean | null;
}
export interface ProbeBinding {
  readonly atCheckpoint: boolean;
  readonly reasonCode: string | null;
  readonly certifiedCheckpointSha: string | null;
  readonly headSha: string | null;
  readonly treeClean: boolean | null;
  readonly documentaryDescendant: boolean;
}
export interface ProbeOutput {
  readonly state: string;
  readonly detail: string;
}
export declare function resolveProbeBinding(input: ProbeBindingInput): ProbeBinding;
export declare function describeProbeBinding(binding: ProbeBinding): string;
export declare function bindTreeProbe(binding: ProbeBinding, output: ProbeOutput): ProbeOutput;
export declare function receiptBindingRelation(
  certifiedCheckpointSha: string | null,
  receiptSha: unknown,
): 'BOUND' | 'BOUND_TO_OTHER' | 'CHECKPOINT_UNRESOLVED' | 'RECEIPT_SHA_INVALID';
export declare function receiptNotAtCheckpoint(
  receiptLabel: string,
  receiptSha: string,
  certifiedCheckpointSha: string | null,
): ProbeOutput;
