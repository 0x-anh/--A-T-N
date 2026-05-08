"use client";

import "../i18n";
import App from "../App";
import ZenithErrorBoundary from "../components/ZenithErrorBoundary";

export default function ClientShell() {
  return (
    <ZenithErrorBoundary>
      <App />
    </ZenithErrorBoundary>
  );
}
