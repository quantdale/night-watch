// ---------------------------------------------------------------------------
// Ripple source-defined bootstrap/auth contract.
//
// This is a structural observation contract, not a credential loader. The
// only values Nightwatch may derive from an external storage state are boolean
// presence facts for these source-proven names; cookie/storage values never
// enter evidence.
// ---------------------------------------------------------------------------

export const RIPPLE_SOURCE_BOOTSTRAP_STATE_CONTRACT = {
  auth: [
    {
      key: 'mo_access_token',
      storage: 'cookie',
      requirement: 'REQUIRED_FOR_AUTHENTICATED_ROUTE',
      source: 'src/router.js:1388-1405; src/vuex/api/auth.js:84-90',
      absentBehavior: 'router guard redirects to /login with a redirect query; loadInitialData handles Access token not found.',
    },
  ],
  environmentSelection: [
    {
      key: 'api_type',
      storage: 'cookie',
      requirement: 'OPTIONAL_FOR_DEV_BOOTSTRAP',
      source: 'src/axios.config.js:20-39; src/vuex/api/auth.js:52-61',
      absentBehavior: 'falls back to hostname-derived navigator.appEnv for DEV/Next API selection; login token exchange requires a value when navigator.appEnv is neither prod nor next.',
    },
    {
      key: 'app_type',
      storage: 'cookie',
      requirement: 'OPTIONAL_FOR_DEV_BOOTSTRAP',
      source: 'src/axios.config.js:20-39; src/vuex/api/auth.js:52-61',
      absentBehavior: 'falls back to hostname-derived navigator.appDomain for DEV/Next API selection; login token exchange requires a value when navigator.appEnv is neither prod nor next.',
    },
  ],
  optional: [
    {
      key: 'mo_language',
      storage: 'cookie',
      requirement: 'OPTIONAL',
      source: 'src/main.js:213-216; src/vuex/api/user.js:45-49',
    },
    {
      key: '__ripple_reload__',
      storage: 'sessionStorage',
      requirement: 'OPTIONAL',
      source: 'public/index.html:39-47; src/router.js:1455-1459',
    },
  ],
} as const;

export interface RippleStoragePresence {
  authRequired: { present: boolean; presentCount: number; total: number };
  environmentSelection: {
    apiTypePresent: boolean;
    appTypePresent: boolean;
    presentCount: number;
    total: number;
    fallbackAllowedForDevBootstrap: true;
  };
}

export type AuthReplayEffectiveness = 'CONFIRMED' | 'INEFFECTIVE' | 'UNRESOLVED';

export interface AuthReplayClassificationInput {
  storageStateLoadedBeforeNavigation: boolean;
  provenanceMatch: boolean;
  authRequiredStatePresent: boolean;
  authHostNavigationSeen: boolean;
  sourceDefinedUnauthenticatedBranchObserved: boolean;
  sourceDefinedAuthenticatedBootstrapBranchObserved: boolean;
}

/**
 * Classify replay effectiveness only from structural source-backed branches.
 * Loading a storage-state file is intentionally insufficient for CONFIRMED.
 */
export function classifyAuthReplayEffectiveness(
  input: AuthReplayClassificationInput,
): AuthReplayEffectiveness {
  if (
    input.storageStateLoadedBeforeNavigation &&
    input.provenanceMatch &&
    input.authRequiredStatePresent &&
    input.sourceDefinedAuthenticatedBootstrapBranchObserved &&
    !input.sourceDefinedUnauthenticatedBranchObserved &&
    !input.authHostNavigationSeen
  ) {
    return 'CONFIRMED';
  }

  if (
    input.storageStateLoadedBeforeNavigation &&
    input.provenanceMatch &&
    input.sourceDefinedUnauthenticatedBranchObserved &&
    (!input.authRequiredStatePresent || input.authHostNavigationSeen)
  ) {
    return 'INEFFECTIVE';
  }

  return 'UNRESOLVED';
}
