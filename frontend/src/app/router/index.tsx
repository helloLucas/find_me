import { createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import HomePage from "../../pages/Home";
import LobbyPage from "../../pages/lobby";
import PlayPage from "../../pages/play";
import EndingPage from "../../pages/ending";
import OAuthCallbackPage from "../../pages/auth/oauth-callback";
import SetupNicknamePage from "../../pages/auth/setup-nickname";
import AppShell from "../../widgets/layout/app-shell";

function withShell(element: ReactNode) {
  return <AppShell>{element}</AppShell>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: withShell(<HomePage />),
  },

  {
    path: "/lobby",
    element: withShell(<LobbyPage />),
  },
  {
    path: "/play/:chapterCode",
    element: withShell(<PlayPage />),
  },
  {
    path: "/ending",
    element: withShell(<EndingPage />),
  },
  {
    path: "/oauth/callback",
    element: <OAuthCallbackPage />,
  },
  {
    path: "/setup-nickname",
    element: withShell(<SetupNicknamePage />),
  },
]);
