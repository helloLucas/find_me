import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { AppQueryProvider } from "./app/providers/query-provider";
import {
  initializeAnalyticsFromStoredConsent,
  trackPageView,
} from "./shared/analytics";
import { AnalyticsConsentBanner } from "./widgets/AnalyticsConsentBanner";

function App() {
  useEffect(() => {
    initializeAnalyticsFromStoredConsent();

    const sendRoutePageView = () => {
      const { location } = router.state;
      window.setTimeout(() => {
        trackPageView({
          title: document.title,
          path: location.pathname,
          location: `${window.location.origin}${location.pathname}`,
        });
      }, 0);
    };

    sendRoutePageView();

    const unsubscribe = router.subscribe((state) => {
      if (state.navigation.state !== "idle") return;
      sendRoutePageView();
    });

    return unsubscribe;
  }, []);

  return (
    <AppQueryProvider>
      <RouterProvider router={router} />
      <AnalyticsConsentBanner />
    </AppQueryProvider>
  );
}

export default App;
