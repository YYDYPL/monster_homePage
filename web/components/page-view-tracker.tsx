"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const VISITOR_ID_KEY = "monster-analytics-visitor-id";

type ConnectionInformation = {
  effectiveType?: string;
  type?: string;
};

type NavigatorWithConnection = Navigator & { connection?: ConnectionInformation };

function visitorId() {
  try {
    const existing = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const generated = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_ID_KEY, generated);
    return generated;
  } catch {
    return undefined;
  }
}

function networkType() {
  const connection = (navigator as NavigatorWithConnection).connection;
  return connection?.effectiveType || connection?.type || undefined;
}

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    fetch("/api/analytics/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        visitorId: visitorId(),
        networkType: networkType(),
        locale: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
