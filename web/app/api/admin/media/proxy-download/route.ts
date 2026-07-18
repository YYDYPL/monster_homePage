import { NextRequest, NextResponse } from "next/server";

/**
 * 代理下载远程图片，解决客户端 CORS 限制。
 * GET /api/admin/media/proxy-download?url=<encoded-url>
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 });
  }

  // 仅允许 http/https
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return NextResponse.json({ error: "仅支持 http/https URL" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Monster-HomePage/1.0",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `远程图片下载失败 (${response.status})` }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "远程图片下载超时或网络错误" }, { status: 502 });
  }
}
