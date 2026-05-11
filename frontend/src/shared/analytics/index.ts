import { env } from "../config/env";
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsentStatus,
} from "./consent";

type ClarityFunction = ((command: string, ...args: unknown[]) => void) & {
  q?: unknown[][];
};

type DataLayerCommand = IArguments | Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerCommand[];
    gtag?: (...args: unknown[]) => void;
    clarity?: ClarityFunction;
  }
}

const GA4_SCRIPT_ID = "lucas-ga4-script";
const CLARITY_SCRIPT_ID = "lucas-clarity-script";

let analyticsBootstrapped = false;
let ga4Configured = false;
let clarityConfigured = false;
let lastPageViewSignature = "";

const isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";

const hasAnalyticsTargets = () =>
  env.analyticsEnabled && Boolean(env.ga4MeasurementId || env.clarityProjectId);

const canSendAnalytics = () => {
  if (!hasAnalyticsTargets()) return false;
  return readAnalyticsConsent()?.status === "granted";
};

const toConsentFields = (status: AnalyticsConsentStatus) => ({
  ad_storage: status,
  analytics_storage: status,
  ad_user_data: status,
  ad_personalization: status,
});

const ensureGtag = () => {
  if (!isBrowser()) return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag() {
      // gtag.js expects the command queue shape used by the official snippet.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
};

const setGoogleConsentDefault = (status: AnalyticsConsentStatus) => {
  if (!env.ga4MeasurementId || !isBrowser()) return;

  ensureGtag();
  window.gtag?.("consent", "default", toConsentFields(status));
};

const updateGoogleConsent = (status: AnalyticsConsentStatus) => {
  if (!env.ga4MeasurementId || !isBrowser()) return;

  ensureGtag();
  window.gtag?.("consent", "update", toConsentFields(status));
};

const updateClarityConsent = (status: AnalyticsConsentStatus) => {
  if (!env.clarityProjectId || !isBrowser() || !window.clarity) return;

  window.clarity("consentv2", {
    ad_Storage: status,
    analytics_Storage: status,
  });

  if (status === "denied") {
    window.clarity("consent", false);
  }
};

const appendScriptOnce = (id: string, src: string) => {
  if (!isBrowser() || document.getElementById(id)) return;

  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
};

const loadGa4 = () => {
  if (!env.ga4MeasurementId || ga4Configured || !isBrowser()) return;

  ensureGtag();
  appendScriptOnce(
    GA4_SCRIPT_ID,
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      env.ga4MeasurementId
    )}`
  );

  window.gtag?.("js", new Date());
  window.gtag?.("set", "allow_ad_personalization_signals", false);
  window.gtag?.("config", env.ga4MeasurementId, {
    send_page_view: false,
  });
  ga4Configured = true;
};

const ensureClarityQueue = () => {
  if (!isBrowser() || window.clarity) return;

  const clarityQueue: unknown[][] = [];
  const clarity = ((...args: unknown[]) => {
    clarityQueue.push(args);
  }) as ClarityFunction;
  clarity.q = clarityQueue;

  window.clarity = clarity;
};

const loadClarity = () => {
  if (!env.clarityProjectId || clarityConfigured || !isBrowser()) return;

  ensureClarityQueue();
  appendScriptOnce(
    CLARITY_SCRIPT_ID,
    `https://www.clarity.ms/tag/${encodeURIComponent(env.clarityProjectId)}`
  );
  updateClarityConsent("granted");
  clarityConfigured = true;
};

const loadAnalyticsTags = () => {
  if (!hasAnalyticsTargets() || !isBrowser()) return;

  loadGa4();
  loadClarity();
};

const getSafePagePath = () => {
  if (!isBrowser()) return "/";
  return window.location.pathname;
};

const getSafePageLocation = () => {
  if (!isBrowser()) return "";
  return `${window.location.origin}${window.location.pathname}`;
};

export function initializeAnalyticsFromStoredConsent() {
  if (!hasAnalyticsTargets() || !isBrowser() || analyticsBootstrapped) return;

  const storedConsent = readAnalyticsConsent();
  const status = storedConsent?.status ?? "denied";

  setGoogleConsentDefault(status);
  updateGoogleConsent(status);
  analyticsBootstrapped = true;

  if (status === "granted") {
    loadAnalyticsTags();
  }
}

export function grantAnalyticsConsent() {
  const record = writeAnalyticsConsent("granted");

  setGoogleConsentDefault("granted");
  updateGoogleConsent("granted");
  loadAnalyticsTags();
  updateClarityConsent("granted");
  trackCurrentPageView({ force: true });

  return record;
}

export function denyAnalyticsConsent() {
  const record = writeAnalyticsConsent("denied");

  updateGoogleConsent("denied");
  updateClarityConsent("denied");

  return record;
}

export function trackPageView(page?: {
  title?: string;
  path?: string;
  location?: string;
  force?: boolean;
}) {
  if (!canSendAnalytics() || !isBrowser()) return;

  loadAnalyticsTags();

  const pagePath = page?.path ?? getSafePagePath();
  const pageLocation = page?.location ?? getSafePageLocation();
  const pageTitle = page?.title ?? document.title;
  const signature = `${pagePath}|${pageTitle}`;

  if (!page?.force && signature === lastPageViewSignature) return;
  lastPageViewSignature = signature;

  window.gtag?.("event", "page_view", {
    page_title: pageTitle,
    page_location: pageLocation,
    page_path: pagePath,
  });
  window.clarity?.("set", "route", pagePath);
}

export function trackCurrentPageView(options: { force?: boolean } = {}) {
  trackPageView({
    title: isBrowser() ? document.title : undefined,
    path: getSafePagePath(),
    location: getSafePageLocation(),
    force: options.force,
  });
}

export function trackAnalyticsEvent(
  eventName: string,
  params: Record<string, string | number | boolean | undefined | null> = {}
) {
  if (!canSendAnalytics() || !isBrowser()) return;

  loadAnalyticsTags();

  const safeParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
  );

  window.gtag?.("event", eventName, safeParams);
  window.clarity?.("event", eventName);
}

export function setAnalyticsTag(key: string, value: string | string[]) {
  if (!canSendAnalytics() || !isBrowser() || !env.clarityProjectId) return;

  loadClarity();
  window.clarity?.("set", key, value);
}
