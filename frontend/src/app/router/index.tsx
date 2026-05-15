import { createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import HomePage from "../../pages/Home";
import LobbyPage from "../../pages/lobby";
import PlayPage from "../../pages/play";
import EndingPage from "../../pages/ending";
import OAuthCallbackPage from "../../pages/auth/oauth-callback";
import SetupNicknamePage from "../../pages/auth/setup-nickname";
import NotFoundPage from "../../pages/not-found";
import LucasSurvivalMinigamePage from "../../pages/minigames/lucas-survival";
import AdminPage from "../../pages/admin";
import MinigameSelectionPage from "../../pages/minigames/MinigameSelectionPage";
import { PacmanArcadePage, StarforceArcadePage, PacketDashArcadePage, LucasSurvivalArcadePage, LucasRouteArcadePage } from "../../pages/minigames/ArcadeMinigamePages";
import AppShell from "../../widgets/layout/app-shell";
import TestCreditsPage from "../../pages/test/credits";

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
  {
    path: "/minigames",
    element: withShell(<MinigameSelectionPage />),
  },
  {
    path: "/minigames/pacman",
    element: <PacmanArcadePage />,
  },
  {
    path: "/minigames/starforce",
    element: <StarforceArcadePage />,
  },
  {
    path: "/minigames/packet-dash",
    element: <PacketDashArcadePage />,
  },
  {
    path: "/minigames/lucas-survival",
    element: <LucasSurvivalArcadePage />,
  },
  {
    path: "/minigames/lucas-route",
    element: <LucasRouteArcadePage />,
  },
  {
    path: "/admin",
    element: withShell(<AdminPage />),
  },
  {
    path: "/test/credits",
    element: <TestCreditsPage />,
  },
  {
    path: "*",
    element: withShell(<NotFoundPage />),
  },
]);
