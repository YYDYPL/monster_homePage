import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ApiResponse } from "@/lib/api";
import type { AdminUser } from "@/lib/admin-api";

const apiBase = process.env.API_INTERNAL_URL || process.env.BACKEND_URL || "http://localhost:8080";

export async function requireAdmin(nextPath = "/admin") {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  if (!cookieHeader) redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);

  try {
    const response = await fetch(`${apiBase}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
    const payload = await response.json() as ApiResponse<AdminUser>;
    if (!payload.success || !payload.data.authenticated) redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
    return payload.data;
  } catch {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
}