import { useEffect, useState } from "react";
import { env } from "../../shared/config/env";
import {
  grantAnalyticsConsent,
  denyAnalyticsConsent,
} from "../../shared/analytics";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  readAnalyticsConsent,
  type AnalyticsConsentRecord,
} from "../../shared/analytics/consent";

const hasAnalyticsConfig = () =>
  env.analyticsEnabled && Boolean(env.ga4MeasurementId || env.clarityProjectId);

export function AnalyticsConsentBanner() {
  const [consent, setConsent] = useState<AnalyticsConsentRecord | null>(() =>
    readAnalyticsConsent()
  );
  const [isOpen, setIsOpen] = useState(() => !readAnalyticsConsent());

  useEffect(() => {
    const syncConsent = () => {
      const nextConsent = readAnalyticsConsent();
      setConsent(nextConsent);
      setIsOpen(!nextConsent);
    };

    window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncConsent);
    window.addEventListener("storage", syncConsent);

    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  if (!hasAnalyticsConfig()) return null;

  const statusLabel = consent?.status === "granted" ? "ON" : "OFF";

  if (!isOpen && consent) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-3 right-3 z-[10001] border border-cyan-300/30 bg-black/70 px-3 py-2 font-system-overlay text-[9px] tracking-[0.2em] text-cyan-100/70 shadow-[0_0_14px_rgba(34,211,238,0.14)] backdrop-blur-sm transition-colors hover:border-cyan-200/70 hover:text-cyan-50"
        title="Analytics consent settings"
      >
        ANALYTICS {statusLabel}
      </button>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[10001] flex justify-center pointer-events-none">
      <section className="pointer-events-auto w-full max-w-[620px] border border-cyan-200/25 bg-black/88 px-4 py-4 text-white shadow-[0_20px_70px_rgba(0,0,0,0.55),0_0_24px_rgba(34,211,238,0.15)] backdrop-blur-md sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-system-overlay text-[9px] uppercase tracking-[0.34em] text-cyan-200/70">
              Analytics Consent
            </p>
            <p className="mt-2 font-desktop-ui text-sm leading-6 text-white/78">
              개발 테스트용으로 GA4와 Clarity 분석 수집을 허용할까요? 선택은 이 브라우저에 저장됩니다.
            </p>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                denyAnalyticsConsent();
                setConsent(readAnalyticsConsent());
                setIsOpen(false);
              }}
              className="border border-white/18 bg-white/[0.03] px-4 py-2 font-system-overlay text-[10px] uppercase tracking-[0.22em] text-white/64 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              Deny
            </button>
            <button
              type="button"
              onClick={() => {
                grantAnalyticsConsent();
                setConsent(readAnalyticsConsent());
                setIsOpen(false);
              }}
              className="border border-[#a3e635] bg-[#a3e635]/12 px-4 py-2 font-system-overlay text-[10px] uppercase tracking-[0.22em] text-[#d9ff8a] shadow-[0_0_14px_rgba(163,230,53,0.18)] transition-colors hover:bg-[#a3e635] hover:text-black"
            >
              Allow
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
