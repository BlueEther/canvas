import React from "react";
import { createRoot } from "react-dom/client";
import { NextUIProvider } from "@nextui-org/react";
import App from "./components/App";

import Bugsnag from "@bugsnag/js";
import BugsnagPluginReact from "@bugsnag/plugin-react";
import BugsnagPerformance from "@bugsnag/browser-performance";

let ErrorBoundary: any = ({ children }: React.PropsWithChildren) => (
  <>{children}</>
);

if (import.meta.env.VITE_BUGSNAG_KEY) {
  Bugsnag.start({
    apiKey: import.meta.env.VITE_BUGSNAG_KEY,
    plugins: [new BugsnagPluginReact()],
  });
  BugsnagPerformance.start({ apiKey: import.meta.env.VITE_BUGSNAG_KEY });

  ErrorBoundary = Bugsnag.getPlugin("react")!.createErrorBoundary(React);
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <NextUIProvider>
        <App />
      </NextUIProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
