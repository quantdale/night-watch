// ---------------------------------------------------------------------------

import {
  browserBackgroundHostClass,
  type BrowserBackgroundClassification,
} from '../../core/safety/types';
// Expected containment-effect attribution.
//
// Console errors are never ignored by substring. An error is attributable to
// optional support containment only when the exact host was already blocked by
// policy and the console message or its source location identifies that same
// host (or the Pylon integration by name). Unknown support hosts therefore
// remain ordinary fail-closed oracle failures.
// ---------------------------------------------------------------------------

// Phase 15P A15 convergence: classification constants are module-private
// (only this module consumes them; grep-proven).
const OPTIONAL_SUPPORT_HOST_CLASS = 'optional-third-party-support' as const;
const OPTIONAL_SUPPORT_HOST = 'widget.usepylon.com' as const;
export const OPTIONAL_SUPPORT_CLASSIFICATION = 'OPTIONAL_THIRD_PARTY_SUPPORT' as const;
const TELEMETRY_HOST_CLASS = 'telemetry' as const;
const TELEMETRY_CLASSIFICATION = 'TELEMETRY' as const;
export const EXPECTED_CONTAINMENT_EFFECT = 'EXPECTED_CONTAINMENT_EFFECT' as const;

function mentionsExactHost(value: string, host: string): boolean {
  try {
    return new URL(value).hostname.toLowerCase() === host;
  } catch {
    const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^a-z0-9.-])${escaped}(?=$|[^a-z0-9.-])`, 'i').test(value);
  }
}

export interface ExpectedContainmentEffect {
  host: string;
  hostClass:
    | typeof OPTIONAL_SUPPORT_HOST_CLASS
    | typeof TELEMETRY_HOST_CLASS
    | Extract<ReturnType<typeof browserBackgroundHostClass>, string>;
  classification:
    | typeof OPTIONAL_SUPPORT_CLASSIFICATION
    | typeof TELEMETRY_CLASSIFICATION
    | BrowserBackgroundClassification;
  reason: typeof EXPECTED_CONTAINMENT_EFFECT;
}

export function classifyOptionalSupportConsoleEffect(
  text: string,
  locationUrl: string | undefined,
  blockedHosts: ReadonlySet<string>
): ExpectedContainmentEffect | null {
  const normalizedText = text.toLowerCase();
  for (const rawHost of blockedHosts) {
    const host = rawHost.toLowerCase();
    if (host !== OPTIONAL_SUPPORT_HOST) continue;
    const sourceIdentifiesHost =
      mentionsExactHost(text, host) ||
      (locationUrl !== undefined && mentionsExactHost(locationUrl, host));
    const sourceIdentifiesPylon = /\b(?:pylon|usepylon)\b/i.test(normalizedText);
    if (sourceIdentifiesHost || sourceIdentifiesPylon) {
      return {
        host,
        hostClass: OPTIONAL_SUPPORT_HOST_CLASS,
        classification: OPTIONAL_SUPPORT_CLASSIFICATION,
        reason: EXPECTED_CONTAINMENT_EFFECT,
      };
    }
  }
  return null;
}

/** Attribute a console error only to an exact policy-blocked telemetry host. */
export function classifyTelemetryConsoleEffect(
  text: string,
  locationUrl: string | undefined,
  blockedHosts: ReadonlySet<string>
): ExpectedContainmentEffect | null {
  for (const rawHost of blockedHosts) {
    const host = rawHost.toLowerCase();
    if (!(mentionsExactHost(text, host) || (locationUrl !== undefined && mentionsExactHost(locationUrl, host)))) {
      continue;
    }
    return {
      host,
      hostClass: TELEMETRY_HOST_CLASS,
      classification: TELEMETRY_CLASSIFICATION,
      reason: EXPECTED_CONTAINMENT_EFFECT,
    };
  }
  return null;
}

/** Attribute a console error only to an exact blocked browser-background host. */
export function classifyBrowserBackgroundConsoleEffect(
  text: string,
  locationUrl: string | undefined,
  blockedHosts: ReadonlyMap<string, BrowserBackgroundClassification>
): ExpectedContainmentEffect | null {
  for (const [rawHost, classification] of blockedHosts.entries()) {
    const host = rawHost.toLowerCase();
    if (!(mentionsExactHost(text, host) || (locationUrl !== undefined && mentionsExactHost(locationUrl, host)))) {
      continue;
    }
    return {
      host,
      hostClass: browserBackgroundHostClass(classification),
      classification,
      reason: EXPECTED_CONTAINMENT_EFFECT,
    };
  }
  return null;
}
