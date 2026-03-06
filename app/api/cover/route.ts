import { NextRequest, NextResponse } from 'next/server'

// ─── Strategy 1: Infobox parsing ──────────────────────────────────────────────
// Read the Wikipedia article's infobox wikitext and extract the exact box art
// filename — this is the most reliable method since it finds the image that the
// article editors explicitly designated as the cover art.

function extractInfoboxImage(wikitext: string): string | null {
  // Match: | image = filename.jpg  OR  | image = [[File:filename.jpg|...]]
  const patterns = [
    /\|\s*image\s*=\s*\[\[(?:File:|Image:)?([^\|\]\n}]+)/i,
    /\|\s*image\s*=\s*(?:File:|Image:)?([^\|\]\n}{]+\.(jpe?g|png|gif|webp|svg))/i,
    /\|\s*image\s*=\s*([^\|\]\n}]+\.(jpe?g|png|gif|webp|svg))/i,
  ]
  for (const pattern of patterns) {
    const match = wikitext.match(pattern)
    if (match) {
      const filename = match[1].trim()
      if (filename && filename.length > 3) return filename
    }
  }
  return null
}

async function fetchInfoboxImage(articleTitle: string): Promise<string | null> {
  const encoded = encodeURIComponent(articleTitle.replace(/ /g, '_'))
  try {
    // Fetch only section 0 (lead section which contains the infobox)
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encoded}&prop=revisions&rvprop=content&rvsection=0&rvslots=main&format=json&origin=*`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const pages = data?.query?.pages
    if (!pages) return null
    const page = Object.values(pages)[0] as Record<string, unknown>
    if ((page as { missing?: string }).missing !== undefined) return null

    // Handle both old API format ('*') and new slots format
    const revisions = (page as { revisions?: Array<Record<string, unknown>> }).revisions
    const content: string =
      (revisions?.[0]?.slots as Record<string, Record<string, string>>)?.main?.['*']
      ?? (revisions?.[0]?.['*'] as string)
      ?? ''

    const filename = extractInfoboxImage(content)
    if (!filename) return null

    return await getWikimediaFileUrl(filename)
  } catch {
    return null
  }
}

// ─── Strategy 2: pageimages API ──────────────────────────────────────────────
// Returns the article's Wikidata-designated "page image". Good for modern games
// but can return promo art instead of box art for some titles.

async function fetchPageImage(articleTitle: string): Promise<string | null> {
  const encoded = encodeURIComponent(articleTitle.replace(/ /g, '_'))
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encoded}&prop=pageimages&piprop=original|thumbnail&pithumbsize=600&format=json&origin=*`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const pages = data?.query?.pages
    if (!pages) return null
    const page = Object.values(pages)[0] as Record<string, unknown>
    if ((page as { missing?: string }).missing !== undefined) return null
    const img = page as {
      original?: { source: string; width: number; height: number }
      thumbnail?: { source: string }
    }
    return img.original?.source ?? img.thumbnail?.source ?? null
  } catch {
    return null
  }
}

// ─── Helper: resolve file URL via imageinfo ───────────────────────────────────
async function getWikimediaFileUrl(filename: string, width = 600): Promise<string | null> {
  const normalized = filename.startsWith('File:') || filename.startsWith('Image:')
    ? filename
    : `File:${filename}`
  const encoded = encodeURIComponent(normalized.replace(/ /g, '_'))
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encoded}&prop=imageinfo&iiprop=url&iiurlwidth=${width}&format=json&origin=*`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const pages = data?.query?.pages
    if (!pages) return null
    const page = Object.values(pages)[0] as Record<string, unknown>
    const imageinfo = (page as { imageinfo?: Array<{ thumburl?: string; url?: string }> }).imageinfo
    return imageinfo?.[0]?.thumburl ?? imageinfo?.[0]?.url ?? null
  } catch {
    return null
  }
}

// ─── Main cover lookup ────────────────────────────────────────────────────────
async function fetchWikipediaCover(title: string, year: number): Promise<string | null> {
  const candidates = [
    title,
    `${title} (video game)`,
    `${title} (${year} video game)`,
    `${title} (${year - 1} video game)`,
    `${title} (${year + 1} video game)`,
  ]

  for (const candidate of candidates) {
    // Strategy 1: parse infobox — finds exact box art filename
    const infoboxImg = await fetchInfoboxImage(candidate)
    if (infoboxImg) return infoboxImg

    // Strategy 2: pageimages — Wikidata-designated image
    const pageImg = await fetchPageImage(candidate)
    if (pageImg) return pageImg
  }

  return null
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title')
  const year = parseInt(request.nextUrl.searchParams.get('year') ?? '2000')

  if (!title) {
    return NextResponse.json({ url: null })
  }

  const url = await fetchWikipediaCover(title, year)

  return NextResponse.json(
    { url },
    { headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } }
  )
}
