import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/api";
import type { AdminUser } from "@/lib/admin-api";

const apiBase = process.env.API_INTERNAL_URL || process.env.BACKEND_URL || "http://localhost:8080";

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = "/admin/login";
  url.search = "";
  url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();

  const cookie = request.headers.get("cookie");
  if (!cookie) return loginRedirect(request);

  try {
    const response = await fetch(`${apiBase}/api/auth/me`, {
      headers: { accept: "application/json", cookie },
      cache: "no-store",
    });
    if (!response.ok) return loginRedirect(request);
    const payload = await response.json() as ApiResponse<AdminUser>;
    if (!payload.success || !payload.data.authenticated) return loginRedirect(request);
    return NextResponse.next();
  } catch {
    return loginRedirect(request);
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
