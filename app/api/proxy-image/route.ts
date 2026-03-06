import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) return new NextResponse("Missing url", { status: 400 })

  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
    if (!res.ok) return new NextResponse("Upstream error", { status: 502 })
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get("content-type") || "image/jpeg"
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch {
    return new NextResponse("Failed to fetch image", { status: 500 })
  }
}
