export const SHARD_CHILD_ENVIRONMENT_IDS: readonly string[];

export function shardTempRoot(runRoot: string, shardId: string): string;

export function buildShardChildEnvironment(
  parentEnvironment: NodeJS.ProcessEnv,
  input: {
    readonly lane: string;
    readonly receiptPath: string;
    readonly shardId: string;
    readonly runRoot: string;
  },
): NodeJS.ProcessEnv;
