const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";
const rawGa4MeasurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim() ?? "";
const rawClarityProjectId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim() ?? "";

const readBooleanEnv = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  return defaultValue;
};

const resolveApiBaseUrl = () => {
  if (!rawApiBaseUrl || typeof window === 'undefined') {
    return rawApiBaseUrl;
  }

  try {
    if (new URL(rawApiBaseUrl).origin === window.location.origin) {
      return "";
    }
  } catch {
    return rawApiBaseUrl.replace(/\/+$/, "");
  }

  return rawApiBaseUrl.replace(/\/+$/, "");
};

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  cdnUrl: import.meta.env.VITE_CDN_URL ?? "https://djbod0nv85jx9.cloudfront.net",
  ga4MeasurementId: rawGa4MeasurementId,
  clarityProjectId: rawClarityProjectId,
  analyticsEnabled: readBooleanEnv(
    import.meta.env.VITE_ANALYTICS_ENABLED,
    Boolean(rawGa4MeasurementId || rawClarityProjectId)
  ),
  devMode: readBooleanEnv(import.meta.env.VITE_DEV_MODE, import.meta.env.DEV),
};
