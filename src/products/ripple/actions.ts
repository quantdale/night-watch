// ---------------------------------------------------------------------------
// Nightwatch — Ripple action classification.
//
// Maps Ripple UI action labels and navigation paths to the action safety
// kernel (src/core/safety/actions.ts). Label and path matching is a
// LOWERCASE SUBSTRING match against the pattern lists below — deliberately
// coarse, fail-closed: a label that could plausibly mutate state marks the
// action non-passive.
// ---------------------------------------------------------------------------

import type { ActionKind, NightwatchAction } from '../../core/safety/actions';

/**
 * Label patterns grouped by mutation category. Any group match makes the
 * action non-passive.
 */
export const RIPPLE_MUTATION_PATTERNS: Readonly<Record<string, readonly string[]>> = {
  'invoice-calculation': [
    'calculate',
    'recalculate',
    'finalize',
    'finalization',
    'run invoice',
    'invoice calculation',
    'create invoice',
    'save invoice',
    'estimate',
  ],
  'billing-group-mutation': [
    'create billing group',
    'edit billing group',
    'delete billing group',
    'add account',
    'remove account',
    'save billing group',
  ],
  settings: ['save settings', 'update settings', 'exchange rate', 'edit exchange'],
  tokens: ['generate token', 'revoke token', 'create token', 'delete token', 'regenerate'],
  commitments: ['purchase', 'apply', 'commitment plan', 'buy', 'purchase plan'],
  registration: ['register', 'sign up', 'signup'],
  'account-mutation': ['create account', 'delete account', 'edit account', 'onboard'],
};

/** Navigation path fragments that indicate a state-mutating route. */
export const RIPPLE_MUTATION_PATH_PATTERNS: readonly string[] = [
  '/calculate',
  '/finalize',
  '/settings',
  '/tokens',
  '/purchase',
  '/apply',
  '/register',
  '/estimate',
  '/create',
  '/edit',
  '/delete',
  '/save',
];

const ALL_LABEL_PATTERNS: readonly string[] = Object.values(RIPPLE_MUTATION_PATTERNS).flat();

/** True when the label (lowercased) contains any mutation pattern. */
export function isMutationLabel(label: string): boolean {
  const l = label.toLowerCase();
  return ALL_LABEL_PATTERNS.some((p) => l.includes(p));
}

/** True when the pathname (lowercased) contains any mutation path pattern. */
export function isMutationPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  return RIPPLE_MUTATION_PATH_PATTERNS.some((pat) => p.includes(pat));
}

/**
 * Classify a Ripple action as passive or not.
 * passive = !isMutationLabel(label) && (kind !== 'navigate' || !url || !isMutationPath(pathname)).
 * Fail-closed: a navigation with a present but unparsable URL is non-passive.
 */
export function classifyRippleAction(input: { id: string; kind: ActionKind; label: string; url?: string }): NightwatchAction {
  const labelMutation = isMutationLabel(input.label);
  let pathMutation = false;
  let pathname: string | undefined;

  if (input.kind === 'navigate' && input.url !== undefined) {
    try {
      pathname = new URL(input.url).pathname;
      pathMutation = isMutationPath(pathname);
    } catch {
      // Fail closed: cannot prove the target route is read-only.
      return {
        id: input.id,
        kind: input.kind,
        label: input.label,
        passive: false,
        note: `unparsable navigation URL "${input.url}" — fail closed as non-passive`,
      };
    }
  }

  const passive = !labelMutation && !pathMutation;
  let note: string | undefined;
  if (!passive) {
    const parts: string[] = [];
    if (labelMutation) parts.push(`mutation label matched: "${input.label}"`);
    if (pathMutation) parts.push(`mutation path matched: ${pathname}`);
    note = parts.join('; ');
  }
  return { id: input.id, kind: input.kind, label: input.label, passive, note };
}
