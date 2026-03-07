"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { BarChart2, Download, X } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import GameCard from "@/components/GameCard"
import StatsPanel from "@/components/StatsPanel"
import ConsoleIcon from "@/components/ConsoleIcon"
import Confetti from "@/components/Confetti"
import { ALL_GAMES } from "@/lib/games"

const STORAGE_KEY = "metacritic100_played"

// Tier badge definitions
const TIERS = [
  { min: 100, label: "Genuine Gaming God",              badge: "/Tier Badges/badge 11.png" },
  { min: 90,  label: "Digital Degen",                   badge: "/Tier Badges/badge 10.png" },
  { min: 80,  label: "Who Needs Sunlight?",             badge: "/Tier Badges/badge 9.png"  },
  { min: 70,  label: "Learned Gaming Scholar",          badge: "/Tier Badges/badge 8.png"  },
  { min: 60,  label: "Skipping Family Dinners",         badge: "/Tier Badges/badge 7.png"  },
  { min: 50,  label: "Zelda Is My Girlfriend",          badge: "/Tier Badges/badge 6.png"  },
  { min: 40,  label: "Certified Couch Occupant",        badge: "/Tier Badges/badge 5.png"  },
  { min: 30,  label: "Cooking With Gas",                badge: "/Tier Badges/badge 4.png"  },
  { min: 20,  label: "Not A Complete Noob",             badge: "/Tier Badges/badge 3.png"  },
  { min: 10,  label: "Dipped Your Toe In The Gaming Pool", badge: "/Tier Badges/badge 2.png" },
  { min: 0,   label: "Grass Toucher",                   badge: "/Tier Badges/badge 1.png"  },
]

function getTier(count: number) {
  return TIERS.find((t) => count >= t.min)!
}

// Returns a proxied URL for external images to avoid CORS issues during export
function proxyImageSrc(url: string): string {
  if (!url) return ""
  if (url.startsWith("/")) return url // local file, no proxy needed
  return `/api/proxy-image?url=${encodeURIComponent(url)}`
}

// Progress bar using block characters for retro feel
function BlockProgress({ pct, blocks = 40 }: { pct: number; blocks?: number }) {
  const BLOCKS = blocks
  const filled = Math.round((pct / 100) * BLOCKS)
  return (
    <span
      style={{
        fontFamily: "var(--font-vt323), monospace",
        fontSize: "18px",
        color: "#00e096",
        letterSpacing: "1px",
      }}
    >
      {Array.from({ length: BLOCKS }, (_, i) => (
        <span key={i} style={{ color: i < filled ? "#00e096" : "#1a1a40" }}>
          █
        </span>
      ))}
    </span>
  )
}

export default function Home() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  type SortField = "rank" | "year" | "completed"
  type SortDir   = "asc" | "desc"
  // Default directions per field (asc = rank 1 first / oldest first / played first)
  const DEFAULT_DIR: Record<SortField, SortDir> = { rank: "asc", year: "asc", completed: "asc" }
  const [sortField, setSortField] = useState<SortField>("rank")
  const [sortDir,   setSortDir]   = useState<SortDir>("asc")

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        // Same field — toggle direction
        setSortDir((d) => d === "asc" ? "desc" : "asc")
        return field
      }
      // New field — use its default direction
      setSortDir(DEFAULT_DIR[field])
      return field
    })
  }, [])
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set())
  const [statsOpen, setStatsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportDataUrl, setExportDataUrl] = useState<string>("")
  // Pre-loaded cover images as data URLs for export (bypasses CORS)
  const [exportImageMap, setExportImageMap] = useState<Record<string, string>>({})
  // Clipboard copy status for X share UX hint
  const [clipboardCopied, setClipboardCopied] = useState(false)
  const [tierTooltipOpen, setTierTooltipOpen] = useState(false)

  // Confetti: fires at every 10-game milestone, intensity scales 1–10
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const [confettiIntensity, setConfettiIntensity] = useState(1)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const tierBtnRef = useRef<HTMLButtonElement>(null)

  // Platform filter
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null)
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false)
  const [platformDropdownPos, setPlatformDropdownPos] = useState<{ top: number; right: number } | null>(null)
  const platformBtnRef = useRef<HTMLButtonElement>(null)

  const platformsWithCount = useMemo(() => {
    const counts = new Map<string, number>()
    ALL_GAMES.forEach((g) => counts.set(g.platform, (counts.get(g.platform) ?? 0) + 1))
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([platform, count]) => ({ platform, count }))
  }, [])

  const openPlatformDropdown = useCallback(() => {
    if (platformBtnRef.current) {
      const rect = platformBtnRef.current.getBoundingClientRect()
      setPlatformDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setPlatformDropdownOpen(true)
  }, [])

  // Keep dropdown anchored to the button while the page scrolls.
  // Recalculates position on every scroll tick; closes if button leaves viewport.
  useEffect(() => {
    if (!platformDropdownOpen) return
    const handleScroll = () => {
      if (!platformBtnRef.current) { setPlatformDropdownOpen(false); return }
      const rect = platformBtnRef.current.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        // Button scrolled off-screen — close the dropdown
        setPlatformDropdownOpen(false)
      } else {
        // Reposition to stay flush below the button
        setPlatformDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [platformDropdownOpen])

  const openTierTooltip = useCallback(() => {
    if (tierBtnRef.current) {
      const rect = tierBtnRef.current.getBoundingClientRect()
      const w = Math.min(760, window.innerWidth - 32)
      const left = Math.min(rect.left, window.innerWidth - w - 16)
      setTooltipPos({ top: rect.bottom + 8, left: Math.max(8, left), width: w })
    }
    setTierTooltipOpen(true)
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setPlayedIds(new Set(JSON.parse(stored)))
    } catch {}
  }, [])

  const togglePlayed = useCallback((id: string) => {
    setPlayedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {}
      return next
    })
  }, [])

  // Fire confetti at every 10-game milestone (going up only)
  const prevPlayedCountRef = useRef(0)
  useEffect(() => {
    const count = playedIds.size
    const prev  = prevPlayedCountRef.current
    prevPlayedCountRef.current = count
    // Only trigger when count increases across a multiple of 10
    if (count <= prev) return
    const milestone     = Math.floor(count / 10) * 10
    const prevMilestone = Math.floor(prev  / 10) * 10
    if (milestone > prevMilestone && milestone > 0) {
      // intensity 1 (at 10 games) → 10 (at 100 games)
      setConfettiIntensity(milestone / 10)
      setConfettiTrigger((t) => t + 1)
    }
  }, [playedIds])

  const filteredAndSorted = useMemo(() => {
    let games = filterPlatform
      ? ALL_GAMES.filter((g) => g.platform === filterPlatform)
      : [...ALL_GAMES]
    if (sortField === "rank") {
      games.sort((a, b) => sortDir === "asc" ? a.rank - b.rank : b.rank - a.rank)
    } else if (sortField === "year") {
      games.sort((a, b) => sortDir === "asc" ? a.year - b.year || a.rank - b.rank : b.year - a.year || a.rank - b.rank)
    } else if (sortField === "completed") {
      // asc = played first, desc = unplayed first
      games.sort((a, b) => {
        const ap = playedIds.has(a.id) ? 1 : 0
        const bp = playedIds.has(b.id) ? 1 : 0
        const playedDiff = sortDir === "asc" ? bp - ap : ap - bp
        return playedDiff || a.rank - b.rank
      })
    }
    return games
  }, [sortField, sortDir, playedIds, filterPlatform])

  // Only games the user has marked as played, in rank order
  const playedGames = useMemo(() =>
    ALL_GAMES.filter((g) => playedIds.has(g.id)),
    [playedIds]
  )

  // Year chart data for the export image
  const exportYearChart = useMemo(() => {
    const minY = Math.min(...ALL_GAMES.map((g) => g.year))
    const maxY = Math.max(...ALL_GAMES.map((g) => g.year))
    const allYears = Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i)
    const totalByYear = new Map<number, number>()
    const playedByYear = new Map<number, number>()
    ALL_GAMES.forEach((g) => totalByYear.set(g.year, (totalByYear.get(g.year) ?? 0) + 1))
    playedGames.forEach((g) => playedByYear.set(g.year, (playedByYear.get(g.year) ?? 0) + 1))
    const maxCount = Math.max(...[...totalByYear.values()])
    return { allYears, totalByYear, playedByYear, maxCount, minY, maxY }
  }, [playedGames])

  const playedCount = playedIds.size
  const pct = Math.round((playedCount / 100) * 100)
  const currentTier = getTier(playedCount)

  const handleExport = useCallback(async () => {
    setIsExporting(true) // immediately shows full-screen loading overlay, hiding any flash
    try {
      const { toPng } = await import("html-to-image")
      const grid = document.getElementById("export-grid")
      if (!grid) return

      // Step 1: Pre-fetch all played game cover images as data URLs.
      // Mirrors GameCard's two-step fallback: static coverUrl first,
      // then Wikipedia API (same /api/cover endpoint GameCard uses).
      // Converting to data URLs avoids CORS failures inside html-to-image.
      const map: Record<string, string> = {}
      await Promise.allSettled(
        playedGames.map(async (game) => {
          let coverUrl = game.coverUrl

          // If no static URL, ask the same Wikipedia API GameCard uses
          if (!coverUrl) {
            try {
              const searchTitle = game.wikiTitle ?? game.title
              const r = await fetch(
                `/api/cover?title=${encodeURIComponent(searchTitle)}&year=${game.year}`
              )
              const data = await r.json()
              if (data.url) coverUrl = data.url
            } catch { /* leave coverUrl empty */ }
          }

          if (!coverUrl) return

          const src = coverUrl.startsWith("/")
            ? coverUrl
            : `/api/proxy-image?url=${encodeURIComponent(coverUrl)}`
          try {
            const res = await fetch(src)
            if (!res.ok) return
            const blob = await res.blob()
            map[game.id] = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
          } catch { /* skip — image will be blank placeholder */ }
        })
      )

      // Step 2: Push data URLs into React state so the export grid renders them
      setExportImageMap(map)

      // Step 3: Give React one frame to commit the new img srcs
      await new Promise((r) => setTimeout(r, 80))

      // Step 4: Make export grid visible (loading overlay already covers any flash)
      grid.style.setProperty("visibility", "visible", "important")
      grid.style.setProperty("opacity", "1", "important")
      grid.style.setProperty("z-index", "9999", "important")
      grid.style.setProperty("left", "0px", "important")
      grid.style.setProperty("top", "0px", "important")

      // One more tick for the browser to paint
      await new Promise((r) => setTimeout(r, 80))

      const dataUrl = await toPng(grid, {
        backgroundColor: "#07071a",
        pixelRatio: 2,
      })

      // Step 5: Hide export grid again
      grid.style.setProperty("opacity", "0", "important")
      grid.style.setProperty("z-index", "-1", "important")
      grid.style.setProperty("visibility", "hidden", "important")

      // Step 6: Copy image to clipboard now so it's ready before the modal opens
      setClipboardCopied(false)
      try {
        const blob = await fetch(dataUrl).then((r) => r.blob())
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        setClipboardCopied(true)
      } catch { /* clipboard unavailable — hint won't show */ }

      setExportDataUrl(dataUrl)
      setExportModalOpen(true)
    } catch (e) {
      console.error(e)
    } finally {
      setIsExporting(false) // loading overlay disappears; modal takes over
    }
  }, [playedCount, playedGames])

  const handleDownload = useCallback(async () => {
    const filename = `metacritic-top100-${playedCount}-played.png`

    // On mobile, use the Web Share API so iOS shows its native share sheet
    // (gives the user "Save Image" / "Save to Camera Roll" option)
    if (isMobile && typeof navigator.share === "function") {
      try {
        const blob = await fetch(exportDataUrl).then((r) => r.blob())
        const file = new File([blob], filename, { type: "image/png" })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] })
          return
        }
      } catch { /* share cancelled or unsupported — fall through */ }
    }

    // Desktop / fallback: anchor download
    const link = document.createElement("a")
    link.download = filename
    link.href = exportDataUrl
    link.click()
  }, [exportDataUrl, playedCount, isMobile])

  const handleShareToX = useCallback(() => {
    const text = `I've played ${playedCount}/100 of the Metacritic Top 100 games!\n\nMy rank: ${currentTier.label} 🎮\n\nFind out how many you have played at:\nhttps://top-100-games.vercel.app/`
    // Image is already in clipboard from when the share image was generated
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(tweetUrl, "_blank")
  }, [playedCount, currentTier.label])

  // ── Export grid geometry ──────────────────────────────────────────────────
  // Square canvas: 1200×1200. Optimal cols/rows via √N so covers are as large
  // as possible while keeping incomplete rows centred.
  const EXPORT_SIZE   = 1200
  const EXPORT_PAD    = 40
  const EXPORT_GAP    = 8
  const HEADER_H      = 270   // title (~56px) + badge row (~90px) + year chart (~95px) + spacing
  const FOOTER_H      = 50    // watermark + margin
  const gridAreaW     = EXPORT_SIZE - EXPORT_PAD * 2              // 1120
  const gridAreaH     = EXPORT_SIZE - EXPORT_PAD * 2 - HEADER_H - FOOTER_H // 855

  const exportCount   = Math.max(playedGames.length, 1)
  const exportCols    = Math.ceil(Math.sqrt(exportCount))
  const exportRows    = Math.ceil(exportCount / exportCols)

  // Largest cell that fits both width-wise and height-wise (3:4 portrait ratio)
  const cellWFromW    = Math.floor((gridAreaW - (exportCols - 1) * EXPORT_GAP) / exportCols)
  const cellHFromH    = Math.floor((gridAreaH - (exportRows - 1) * EXPORT_GAP) / exportRows)
  const cellWFromH    = Math.floor(cellHFromH * 3 / 4)
  const exportCellW   = Math.min(cellWFromW, cellWFromH)
  const exportCellH   = Math.floor(exportCellW * 4 / 3)

  return (
    <div style={{ height: "calc(100vh - 72px)", display: "flex", flexDirection: "column", overflow: "hidden", background: "#07071a" }}>

      {/* ── Hero / status panel ─────────────────────────────── */}
      <div
        style={{
          position: "relative",
          borderBottom: "2px solid #1a1a44",
          fontFamily: "var(--font-vt323), monospace",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Console art background */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/header background.png')",
            backgroundSize: "cover",
            backgroundPosition: "center 42%",
            backgroundRepeat: "no-repeat",
            opacity: 0.55,
          }}
        />

        {/* Dark gradient overlay so text stays readable */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, rgba(7,7,26,0.92) 0%, rgba(7,7,26,0.75) 50%, rgba(7,7,26,0.55) 100%)",
          }}
        />

        {/* Content sits above the background */}
        <div style={{ position: "relative", padding: "18px 24px 16px" }}>
          {/* Top row: counter + tier badge + buttons */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              {/* Counter */}
              <div>
                <div style={{ fontSize: "13px", color: "#5a5a90", letterSpacing: "0.1em", marginBottom: "4px" }}>
                  GAMES CLEARED
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "64px",
                      lineHeight: 1,
                      color: "#00e096",
                      letterSpacing: "-0.02em",
                      textShadow: "0 0 20px rgba(0,224,150,0.5), 0 0 40px rgba(0,224,150,0.2)",
                    }}
                  >
                    {String(playedCount).padStart(3, "0")}
                  </span>
                  <span style={{ fontSize: "28px", color: "#3a3a70" }}>/&nbsp;100</span>
                </div>
              </div>

              {/* Tier badge */}
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentTier.badge}
                  alt={currentTier.label}
                  style={{ height: "64px", width: "auto", objectFit: "contain" }}
                />
                <div>
                  <div style={{ fontSize: "11px", color: "#5a5a90", letterSpacing: "0.1em", marginBottom: "2px" }}>
                    CURRENT RANK
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{
                      fontSize: "18px",
                      color: "#c8c4e0",
                      fontFamily: "var(--font-vt323), monospace",
                      letterSpacing: "0.04em",
                      maxWidth: "180px",
                      lineHeight: 1.2,
                    }}>
                      {currentTier.label}
                    </div>
                    {/* ? help icon */}
                    <button
                      ref={tierBtnRef}
                      onMouseEnter={openTierTooltip}
                      onMouseLeave={() => setTierTooltipOpen(false)}
                      onClick={() => tierTooltipOpen ? setTierTooltipOpen(false) : openTierTooltip()}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: "1px solid #3a3a70",
                        background: "rgba(13,13,42,0.85)",
                        color: "#5a5a90",
                        fontFamily: "var(--font-vt323), monospace",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        lineHeight: 1,
                        padding: 0,
                      }}
                      aria-label="View all tiers"
                    >
                      ?
                    </button>
                  </div>
                </div>

                {/* Tier tooltip is rendered via portal — see bottom of component */}
              </div>
            </div>

            {/* Buttons + sort bar — stacked column, right-aligned */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", paddingTop: "8px" }}>
              {/* Action buttons row */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setStatsOpen(true)}
                  style={{
                    background: "rgba(13,13,42,0.85)",
                    border: "1px solid #1e1e4a",
                    color: "#6060a0",
                    fontFamily: "var(--font-vt323), monospace",
                    fontSize: "16px",
                    padding: "5px 14px",
                    cursor: "pointer",
                    letterSpacing: "0.06em",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <BarChart2 style={{ width: 14, height: 14 }} />
                  STATS
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  style={{
                    background: "rgba(13,13,42,0.85)",
                    border: "1px solid #1e1e4a",
                    color: "#6060a0",
                    fontFamily: "var(--font-vt323), monospace",
                    fontSize: "16px",
                    padding: "5px 14px",
                    cursor: isExporting ? "default" : "pointer",
                    letterSpacing: "0.06em",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: isExporting ? 0.5 : 1,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <Download style={{ width: 14, height: 14 }} />
                  {isExporting ? "GENERATING..." : "SHARE"}
                </button>
                <button
                  onClick={() => {
                    setPlayedIds(new Set())
                    localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
                  }}
                  style={{
                    background: "rgba(180,30,30,0.25)",
                    border: "1px solid #aa3333",
                    color: "#ff6b6b",
                    fontFamily: "var(--font-vt323), monospace",
                    fontSize: "16px",
                    padding: "5px 14px",
                    cursor: "pointer",
                    letterSpacing: "0.06em",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  CLEAR SELECTIONS
                </button>
              </div>

            </div>
          </div>

          {/* Progress bar + Sort/Filter — unified compact row */}
          <div style={{ marginTop: "10px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>

            {/* Left: progress bar + pct label + instruction */}
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <BlockProgress pct={pct} blocks={isMobile ? 20 : 40} />
              <div style={{ fontSize: "13px", color: "#5a5a90", letterSpacing: "0.08em", marginTop: "3px" }}>
                {pct}% COMPLETE
              </div>
              <div style={{ fontSize: "13px", color: "#3a3a70", fontStyle: "italic", marginTop: "4px", letterSpacing: "0.03em" }}>
                Click a game&apos;s cover to add it to your played games list.
              </div>
            </div>

            {/* Right: Sort + Filter controls */}
            <div style={{ display: "flex", alignItems: "stretch", gap: "6px", flexWrap: "wrap", flexShrink: 0 }}>

              {/* Platform filter button */}
              <button
                ref={platformBtnRef}
                onClick={() => platformDropdownOpen ? setPlatformDropdownOpen(false) : openPlatformDropdown()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: filterPlatform ? "rgba(0,224,150,0.08)" : "rgba(13,13,42,0.85)",
                  border: filterPlatform ? "1px solid rgba(0,224,150,0.4)" : "1px solid #1e1e4a",
                  backdropFilter: "blur(4px)",
                  padding: "5px 10px",
                  cursor: "pointer",
                  fontFamily: "var(--font-vt323), monospace",
                  fontSize: "12px",
                  color: filterPlatform ? "#00e096" : "#6060a0",
                  letterSpacing: "0.1em",
                  transition: "border-color 0.12s, color 0.12s, background 0.12s",
                }}
              >
                {filterPlatform ? (
                  <>
                    <ConsoleIcon platform={filterPlatform} size={15} />
                    <span>{filterPlatform.toUpperCase()}</span>
                    <span style={{ fontSize: "10px", opacity: 0.6, marginLeft: "2px" }}>✕</span>
                  </>
                ) : (
                  <>
                    <span>PLATFORM</span>
                    <span style={{ fontSize: "9px", opacity: 0.5 }}>▼</span>
                  </>
                )}
              </button>

              {/* Sort box */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(13,13,42,0.85)",
                border: "1px solid #1e1e4a",
                backdropFilter: "blur(4px)",
                padding: "5px 8px",
              }}>
                <span style={{
                  fontFamily: "var(--font-vt323), monospace",
                  fontSize: "12px",
                  color: "#6060a0",
                  letterSpacing: "0.14em",
                  marginRight: "6px",
                }}>
                  SORT
                </span>
                {(["rank", "year", "completed"] as const).map((field) => {
                  const active = sortField === field
                  const labels: Record<typeof field, string> = { rank: "RANK", year: "YEAR", completed: "COMPLETED" }
                  const arrow = active ? (sortDir === "asc" ? " ↑" : " ↓") : ""
                  return (
                    <button
                      key={field}
                      onClick={() => handleSort(field)}
                      style={{
                        fontFamily: "var(--font-vt323), monospace",
                        fontSize: "13px",
                        letterSpacing: "0.1em",
                        padding: "3px 12px",
                        cursor: "pointer",
                        border: active ? "1px solid rgba(0,224,150,0.5)" : "1px solid rgba(255,255,255,0.08)",
                        background: active ? "rgba(0,224,150,0.08)" : "rgba(7,7,26,0.6)",
                        color: active ? "#00e096" : "#5050a0",
                        transition: "color 0.12s, border-color 0.12s, background 0.12s",
                      }}
                    >
                      {labels[field]}{arrow}
                    </button>
                  )
                })}
              </div>

            </div>{/* end sort+filter controls */}
          </div>{/* end progress+sort row */}
        </div>
      </div>

      {/* ── Game grid ───────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 10px 60px" : "28px 24px 60px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(3, 1fr)"
              : "repeat(auto-fill, minmax(180px, 1fr))",
            gap: isMobile ? "6px" : "44px 24px",
          }}
        >
          {filteredAndSorted.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              played={playedIds.has(game.id)}
              onClick={() => togglePlayed(game.id)}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>

      {/* ── Stats sheet ─────────────────────────────────────── */}
      <Sheet open={statsOpen} onOpenChange={setStatsOpen}>
        <SheetContent
          side="right"
          className="w-[460px] p-6 overflow-y-auto"
          style={{ background: "#09091e", borderLeft: "2px solid #1a1a44" }}
        >
          <SheetHeader className="mb-4">
            <SheetTitle
              style={{
                fontFamily: "var(--font-vt323), monospace",
                fontSize: "22px",
                color: "#c8c4e0",
                letterSpacing: "0.08em",
              }}
            >
              STATS
            </SheetTitle>
          </SheetHeader>
          <StatsPanel games={ALL_GAMES} playedIds={playedIds} />
        </SheetContent>
      </Sheet>

      {/* ── Generating overlay (covers any export grid flash) ── */}
      {isExporting && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(7,7,26,0.96)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-vt323), monospace",
          flexDirection: "column",
          gap: "12px",
        }}>
          <div style={{ fontSize: 28, color: "#00e096", letterSpacing: "0.1em",
            textShadow: "0 0 20px rgba(0,224,150,0.5)" }}>
            GENERATING IMAGE...
          </div>
          <div style={{ fontSize: 16, color: "#5a5a90", letterSpacing: "0.06em" }}>
            Loading artwork...
          </div>
        </div>
      )}

      {/* ── Export preview modal ─────────────────────────────── */}
      {exportModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            style={{
              background: "#09091e",
              border: "1px solid #1e1e4a",
              padding: "24px",
              maxWidth: "700px",
              width: "100%",
              position: "relative",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setExportModalOpen(false)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "none",
                border: "none",
                color: "#5a5a90",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>

            <div style={{
              fontFamily: "var(--font-vt323), monospace",
              fontSize: "20px",
              color: "#c8c4e0",
              letterSpacing: "0.08em",
            }}>
              SHARE YOUR PROGRESS
            </div>

            {/* Image preview — constrained so it never requires scrolling */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={exportDataUrl}
                alt="Export preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "55vh",
                  width: "auto",
                  height: "auto",
                  display: "block",
                  border: "1px solid #1a1a44",
                  objectFit: "contain",
                }}
              />
            </div>

            {/* Clipboard hint after clicking Share to X on desktop */}
            {clipboardCopied && (
              <div style={{
                fontFamily: "var(--font-vt323), monospace",
                fontSize: 15,
                color: "#00e096",
                letterSpacing: "0.05em",
                textAlign: "center",
                padding: "6px 0 0",
              }}>
                📋 Image copied to clipboard — paste it into your tweet (⌘V / Ctrl+V)
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleDownload}
                style={{
                  flex: 1,
                  background: "#00e096",
                  border: "none",
                  color: "#07071a",
                  fontFamily: "var(--font-vt323), monospace",
                  fontSize: "18px",
                  padding: "10px 0",
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Download style={{ width: 16, height: 16 }} />
                DOWNLOAD
              </button>
              <button
                onClick={handleShareToX}
                style={{
                  flex: 1,
                  background: "#000",
                  border: "1px solid #333",
                  color: "#fff",
                  fontFamily: "var(--font-vt323), monospace",
                  fontSize: "18px",
                  padding: "10px 0",
                  cursor: "pointer",
                  letterSpacing: "0.08em",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {/* X logo */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                SHARE TO X
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Platform filter dropdown portal ──────────────────── */}
      {platformDropdownOpen && platformDropdownPos && typeof document !== "undefined" && createPortal(
        <>
          {/* Backdrop — click anywhere outside to close */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 8998 }}
            onClick={() => setPlatformDropdownOpen(false)}
          />
          <div
            style={{
              position: "fixed",
              top: platformDropdownPos.top,
              right: platformDropdownPos.right,
              zIndex: 8999,
              background: "rgba(7,7,26,0.97)",
              border: "1px solid #1e1e4a",
              backdropFilter: "blur(12px)",
              boxShadow: "0 12px 48px rgba(0,0,0,0.9)",
              minWidth: "210px",
              // Clamp height so it never exceeds the viewport and becomes scrollable
              maxHeight: `calc(100vh - ${platformDropdownPos.top}px - 16px)`,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {/* ALL option */}
            <div
              onClick={() => { setFilterPlatform(null); setPlatformDropdownOpen(false) }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 14px",
                cursor: "pointer",
                background: filterPlatform === null ? "rgba(0,224,150,0.08)" : "transparent",
                borderBottom: "1px solid #1a1a3a",
                fontFamily: "var(--font-vt323), monospace",
                fontSize: "14px",
                color: filterPlatform === null ? "#00e096" : "#8080b0",
                letterSpacing: "0.08em",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { if (filterPlatform !== null) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)" }}
              onMouseLeave={(e) => { if (filterPlatform !== null) (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
            >
              <span>ALL PLATFORMS</span>
              <span style={{ fontSize: "12px", color: "#3a3a70" }}>100</span>
            </div>

            {/* Platform rows */}
            {platformsWithCount.map(({ platform, count }) => {
              const active = filterPlatform === platform
              return (
                <div
                  key={platform}
                  onClick={() => { setFilterPlatform(platform); setPlatformDropdownOpen(false) }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 14px",
                    cursor: "pointer",
                    background: active ? "rgba(0,224,150,0.08)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)" }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
                >
                  <span style={{ width: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ConsoleIcon platform={platform} size={16} />
                  </span>
                  <span style={{
                    fontFamily: "var(--font-vt323), monospace",
                    fontSize: "14px",
                    color: active ? "#00e096" : "#c8c4e0",
                    letterSpacing: "0.06em",
                    flex: 1,
                  }}>
                    {platform}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-vt323), monospace",
                    fontSize: "12px",
                    color: active ? "rgba(0,224,150,0.5)" : "#3a3a70",
                  }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </>,
        document.body
      )}

      {/* ── Tier tooltip portal (fixed, above everything) ──── */}
      {tierTooltipOpen && tooltipPos && typeof document !== "undefined" && createPortal(
        <div
          onMouseEnter={() => setTierTooltipOpen(true)}
          onMouseLeave={() => setTierTooltipOpen(false)}
          style={{
            position: "fixed",
            top: tooltipPos.top,
            left: tooltipPos.left,
            zIndex: 9000,
            background: "rgba(7,7,26,0.97)",
            border: "1px solid #1e1e4a",
            backdropFilter: "blur(10px)",
            padding: "16px 20px",
            width: tooltipPos.width,
            boxSizing: "border-box",
            boxShadow: "0 12px 48px rgba(0,0,0,0.9)",
          }}
        >
          <div style={{
            fontFamily: "var(--font-vt323), monospace",
            fontSize: "13px",
            color: "#5a5a90",
            letterSpacing: "0.12em",
            marginBottom: "12px",
          }}>
            ALL TIERS
          </div>
          {/* 4-col on desktop, 2-col on mobile */}
          <div style={{
            display: "grid",
            gridTemplateColumns: tooltipPos && tooltipPos.width < 480 ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: "8px",
          }}>
            {[...TIERS].reverse().map((tier) => {
              const isCurrentTier = tier.label === currentTier.label
              const unlockLabel = tier.min === 100 ? "100 games" : tier.min === 0 ? "Start" : `${tier.min}+ games`
              return (
                <div
                  key={tier.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    minWidth: 0,
                    background: isCurrentTier ? "rgba(0,224,150,0.1)" : "rgba(255,255,255,0.02)",
                    border: isCurrentTier ? "1px solid rgba(0,224,150,0.45)" : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tier.badge}
                    alt={tier.label}
                    style={{ width: 32, height: 32, objectFit: "contain", flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-vt323), monospace",
                      fontSize: "13px",
                      color: isCurrentTier ? "#00e096" : "#c8c4e0",
                      lineHeight: 1.25,
                      letterSpacing: "0.02em",
                    }}>
                      {isCurrentTier ? `▶ ${tier.label}` : tier.label}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-vt323), monospace",
                      fontSize: "11px",
                      color: isCurrentTier ? "rgba(0,224,150,0.55)" : "#3a3a70",
                      letterSpacing: "0.06em",
                    }}>
                      {unlockLabel}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>,
        document.body
      )}

      {/* ── Confetti canvas (milestone celebrations) ─────────── */}
      <Confetti intensity={confettiIntensity} trigger={confettiTrigger} />

      {/* ── Hidden export grid (1200×1200 square) ───────────── */}
      <div
        id="export-grid"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: EXPORT_SIZE,
          height: EXPORT_SIZE,
          boxSizing: "border-box",
          padding: EXPORT_PAD,
          background: "#07071a",
          opacity: 0,
          visibility: "hidden",
          pointerEvents: "none",
          zIndex: -1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        aria-hidden
      >
        {/* Title */}
        <div style={{
          textAlign: "center",
          fontFamily: "var(--font-vt323), monospace",
          fontSize: 36,
          color: "#c8c4e0",
          letterSpacing: "0.08em",
          marginBottom: 16,
          flexShrink: 0,
        }}>
          I&apos;VE PLAYED {playedCount}/100 METACRITIC TOP 100 GAMES
        </div>

        {/* Badge + tier */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          marginBottom: 24,
          flexShrink: 0,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentTier.badge} alt={currentTier.label}
            style={{ height: 72, width: "auto", objectFit: "contain" }} />
          <div style={{
            color: "#00e096", fontSize: 28,
            fontFamily: "var(--font-vt323), monospace", letterSpacing: "0.06em",
          }}>
            {currentTier.label}
          </div>
        </div>

        {/* Year dot chart — mirrors the sidebar StatsPanel style */}
        {(() => {
          const { allYears, playedByYear } = exportYearChart
          const DOT      = 10          // dot diameter px
          const DOT_GAP  = 3           // vertical gap between dots
          const CHART_H  = 60          // fixed column height (fits up to 5 dots)
          const MAX_DOTS = Math.floor(CHART_H / (DOT + DOT_GAP))
          const GAP      = 2           // horizontal gap between columns
          const colW     = Math.floor((gridAreaW - (allYears.length - 1) * GAP) / allYears.length)

          return (
            <div style={{ flexShrink: 0, marginBottom: 18 }}>
              {/* Section label */}
              <div style={{
                fontFamily: "var(--font-vt323), monospace",
                fontSize: 15, color: "#3a3a60",
                letterSpacing: "0.18em", textAlign: "center", marginBottom: 8,
              }}>
                PLAYED BY YEAR
              </div>

              {/* Dot columns */}
              <div style={{ display: "flex", alignItems: "flex-end", height: CHART_H, gap: GAP }}>
                {allYears.map((year) => {
                  const count = Math.min(playedByYear.get(year) ?? 0, MAX_DOTS)
                  return (
                    <div key={year} style={{
                      width: colW, flexShrink: 0,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "flex-end",
                      height: "100%", gap: DOT_GAP,
                    }}>
                      {Array.from({ length: count }, (_, i) => (
                        <div key={i} style={{
                          width: DOT, height: DOT,
                          borderRadius: "50%",
                          background: "#00e096",
                          boxShadow: "0 0 5px rgba(0,224,150,0.65)",
                          flexShrink: 0,
                        }} />
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* Axis line */}
              <div style={{ height: 1, background: "#2a2a50", marginTop: 5 }} />

              {/* Tick marks + year labels every 5 years */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: GAP, marginTop: 3 }}>
                {allYears.map((year) => {
                  const show = year % 5 === 0
                  return (
                    <div key={year} style={{
                      width: colW, flexShrink: 0,
                      display: "flex", flexDirection: "column", alignItems: "center",
                    }}>
                      <div style={{
                        width: 1, height: show ? 7 : 4,
                        background: show ? "#3a3a70" : "#1e1e40",
                        marginBottom: 2,
                      }} />
                      {show && (
                        <span style={{
                          fontFamily: "var(--font-vt323), monospace",
                          fontSize: 13, color: "#4a4a80",
                          letterSpacing: 0, whiteSpace: "nowrap",
                        }}>
                          {year}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Game covers — row-by-row so incomplete last row stays centred */}
        {playedGames.length > 0 && (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: EXPORT_GAP,
          }}>
            {Array.from({ length: exportRows }, (_, rowIdx) => {
              const rowGames = playedGames.slice(
                rowIdx * exportCols,
                (rowIdx + 1) * exportCols
              )
              return (
                <div key={rowIdx} style={{ display: "flex", gap: EXPORT_GAP, justifyContent: "center" }}>
                  {rowGames.map((game) => (
                    <div key={game.id} style={{
                      width: exportCellW,
                      height: exportCellH,
                      flexShrink: 0,
                      overflow: "hidden",
                    }}>
                      {exportImageMap[game.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={exportImageMap[game.id]} alt={game.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{
                          width: "100%", height: "100%", background: "#0d0d28",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{
                            fontSize: Math.max(8, Math.floor(exportCellW / 10)),
                            color: "#404080", textAlign: "center",
                            padding: 4, fontFamily: "monospace",
                          }}>{game.title}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer watermark */}
        <div style={{
          flexShrink: 0,
          marginTop: 16,
          textAlign: "center",
          fontFamily: "var(--font-vt323), monospace",
          fontSize: 22,
          color: "#6060a0",
          letterSpacing: "0.08em",
        }}>
          top-100-games.vercel.app
        </div>
      </div>
    </div>
  )
}
