import { createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import HomePage from "../../pages/home";
import LoginPage from "../../pages/auth/login-page";
import SignupPage from "../../pages/auth/signup-page";
import LobbyPage from "../../pages/lobby";
import PlayPage from "../../pages/play";
import EndingPage from "../../pages/ending";
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
    path: "/login",
    element: withShell(<LoginPage />),
  },
  {
    path: "/signup",
    element: withShell(<SignupPage />),
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
]);