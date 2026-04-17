import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { AppQueryProvider } from "./app/providers/query-provider";

function App() {
  return (
    <AppQueryProvider>
      <RouterProvider router={router} />
    </AppQueryProvider>
  );
}

export default App;