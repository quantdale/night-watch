export declare const CERTIFICATION_DEMOTION_RELATIONS: readonly string[];
export declare function classifyCertificationDemotion(input: {
  readonly advanceClaimed: boolean;
  readonly certifiedCheckpointSha: string | null;
  readonly liveHeadSha: string | null;
  readonly isAncestor?: boolean | null;
  readonly changedFiles?: readonly string[] | null;
  readonly substantivePaths?: readonly string[] | null;
}): {
  readonly relation: string;
  readonly attention: readonly string[];
  readonly detail: string;
};
