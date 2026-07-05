"use client";

import { useEffect } from "react";

/**
 * Minimal PWA service-worker registration.
 * Registers /sw.js (served statically from /public) after the window loads.
 * No-ops when the browser lacks service-worker support or in dev without HTTPS.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal for the app shell.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
