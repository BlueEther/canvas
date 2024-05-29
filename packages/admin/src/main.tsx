import React from "react";
import ReactDOM from "react-dom/client";
import "./index.scss";
import { NextUIProvider } from "@nextui-org/react";
import { ThemeProvider } from "next-themes";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Root } from "./Root.tsx";
import { HomePage } from "./pages/Home/page.tsx";
import { AccountsPage } from "./pages/Accounts/Accounts/page.tsx";
import { ServiceSettingsPage } from "./pages/Service/settings.tsx";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Root />,
      children: [
        {
          path: "/",
          element: <HomePage />,
        },
        {
          path: "/accounts",
          element: <AccountsPage />,
        },
        {
          path: "/service/settings",
          element: <ServiceSettingsPage />,
        },
      ],
    },
  ],
  {
    basename: import.meta.env.VITE_APP_ROOT,
  }
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NextUIProvider>
      <ThemeProvider defaultTheme="system">
        <RouterProvider router={router} />
      </ThemeProvider>
    </NextUIProvider>
  </React.StrictMode>
);
