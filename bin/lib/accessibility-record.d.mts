export declare const ACCESSIBILITY_RECORD_SCHEMA: 'nightwatch.accessibility-certification.v1';
export declare const ACCESSIBILITY_RECORD_PATH: string;
export declare const ACCESSIBILITY_RECORD_SECTIONS: readonly string[];
export declare const ACCESSIBILITY_FOCUS_INDICATOR_MINIMUM: number;
export declare function parseAccessibilityCertificationRecord(raw: unknown): {
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly summary: {
    readonly sha: string;
    readonly updatedAt: string | null;
    readonly measuredFocusIndicators: number;
    readonly minimumFocusContrast: number;
  } | null;
};
