export declare function evidenceArtifactExistsAtSha(root: string, sha: string, artifactPath: string): boolean;
export declare function laneArtifactDemotions(
  lanes: ReadonlyArray<{ laneId: string; reportedClass: string }>,
  bindings: ReadonlyMap<string, { evidenceSha: string | null; artifactPaths: readonly string[] } | null | undefined>,
  existsAtSha: (sha: string, artifactPath: string) => boolean,
): { demoted: Set<string>; findings: string[] };
