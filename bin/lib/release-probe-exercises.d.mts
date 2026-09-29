export declare const MALFORMED_SAMPLE_BY_SHAPE: Readonly<Record<string, string>>;
export declare function exerciseConfigurationContract(
  surface: unknown,
  parsed: unknown,
): {
  readonly failures: string[];
  readonly rendered: number;
  readonly secretRows: number;
  readonly refused: number;
  readonly required: number;
  readonly unrejectable: number;
};
export declare function exercisePreflightRefusal(lifecycle: unknown): {
  readonly failures: string[];
  readonly refused: number;
  readonly states: string[];
};
