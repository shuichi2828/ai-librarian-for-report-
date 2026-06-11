"use client";

import { track } from "@vercel/analytics";
import { useEffect } from "react";

export function AnalyticsHealthCheck() {
  useEffect(() => {
    try {
      track("app_opened", {
        source: "layout",
        analyticsSchema: "2026-06-11"
      });
    } catch {
      // Analytics should never affect the user workflow.
    }
  }, []);

  return null;
}
