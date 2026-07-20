"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Reset route changes immediately so a long article never animates from the old scroll position. */
export function RouteScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
