export type AnalyticsConsentStatus = "granted" | "denied";

export interface AnalyticsConsentRecord {
  status: AnalyticsConsentStatus;
  updatedAt: string;
  version: 1;
}

export const ANALYTICS_CONSENT_STORAGE_KEY = "lucas.analyticsConsent.v1";
export const ANALYTICS_CONSENT_CHANGED_EVENT = "lucas:analytics-consent-changed";

const isConsentStatus = (value: unknown): value is AnalyticsConsentStatus =>
  value === "granted" || value === "denied";

export function readAnalyticsConsent(): AnalyticsConsentRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as Partial<AnalyticsConsentRecord>;
    if (!isConsentStatus(parsed.status)) return null;

    return {
      status: parsed.status,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      version: 1,
    };
  } catch {
    return null;
  }
}

export function writeAnalyticsConsent(
  status: AnalyticsConsentStatus
): AnalyticsConsentRecord | null {
  if (typeof window === "undefined") return null;

  const record: AnalyticsConsentRecord = {
    status,
    updatedAt: new Date().toISOString(),
    version: 1,
  };

  try {
    window.localStorage.setItem(
      ANALYTICS_CONSENT_STORAGE_KEY,
      JSON.stringify(record)
    );
    window.dispatchEvent(
      new CustomEvent(ANALYTICS_CONSENT_CHANGED_EVENT, { detail: record })
    );
    return record;
  } catch {
    return null;
  }
}

export function clearAnalyticsConsent() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent(ANALYTICS_CONSENT_CHANGED_EVENT, { detail: null })
    );
  } catch {
    // Ignore storage errors. The UI will ask again next time it can read storage.
  }
}
