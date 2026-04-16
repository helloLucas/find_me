import { createBrowserRouter } from "react-router-dom";

const DummyPage = ({ text }: { text: string }) => {
  return <div>{text}</div>;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DummyPage text="Home" />,
  },
  {
    path: "/login",
    element: <DummyPage text="Login" />,
  },
  {
    path: "/signup",
    element: <DummyPage text="Signup" />,
  },
  {
    path: "/lobby",
    element: <DummyPage text="Lobby" />,
  },
  {
    path: "/play/:chapterCode",
    element: <DummyPage text="Play" />,
  },
  {
    path: "/ending",
    element: <DummyPage text="Ending" />,
  },
]);