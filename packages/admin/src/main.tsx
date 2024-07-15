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
import { AuditLog } from "./pages/AuditLog/auditlog.tsx";
import { ToastWrapper } from "./components/ToastWrapper.tsx";

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
        {
          path: "/audit",
          element: <AuditLog />,
        },
      ],
    },
  ],
  {
    basename: __APP_ROOT__,
  }
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NextUIProvider>
      <ThemeProvider defaultTheme="system">
        <RouterProvider router={router} />

        <ToastWrapper />
      </ThemeProvider>
    </NextUIProvider>
  </React.StrictMode>
);
