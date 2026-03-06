"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { BarChart2, Download, X } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import GameCard from "@/components/GameCard"
import StatsPanel from "@/components/StatsPanel"
import { ALL_GAMES, sortGames } from "@/lib/games"
import type { SortKey } from "@/types/game"

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
function BlockProgress({ pct }: { pct: number }) {
  const BLOCKS = 40
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
  const [sortKey, setSortKey] = useState<SortKey>("rank")
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set())
  const [statsOpen, setStatsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportDataUrl, setExportDataUrl] = useState<string>("")
  // Pre-loaded cover images as data URLs for export (bypasses CORS)
  const [exportImageMap, setExportImageMap] = useState<Record<string, string>>({})
  // Clipboard copy status for X share UX hint
  const [clipboardCopied, setClipboardCopied] = useState(false)

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

  const filteredAndSorted = useMemo(() => {
    return sortGames(ALL_GAMES, sortKey)
  }, [sortKey])

  // Only games the user has marked as played, in rank order
  const playedGames = useMemo(() =>
    ALL_GAMES.filter((g) => playedIds.has(g.id)),
    [playedIds]
  )

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
      // This avoids CORS failures inside html-to-image, since data URLs
      // are embedded in memory and have no origin restrictions.
      const map: Record<string, string> = {}
      await Promise.allSettled(
        playedGames.map(async (game) => {
          if (!game.coverUrl) return
          const src = game.coverUrl.startsWith("/")
            ? game.coverUrl
            : `/api/proxy-image?url=${encodeURIComponent(game.coverUrl)}`
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

      setExportDataUrl(dataUrl)
      setExportModalOpen(true)
    } catch (e) {
      console.error(e)
    } finally {
      setIsExporting(false) // loading overlay disappears; modal takes over
    }
  }, [playedCount, playedGames])

  const handleDownload = useCallback(() => {
    const link = document.createElement("a")
    link.download = `metacritic-top100-${playedCount}-played.png`
    link.href = exportDataUrl
    link.click()
  }, [exportDataUrl, playedCount])

  const handleShareToX = useCallback(async () => {
    const text = `I've played ${playedCount}/100 of the Metacritic Top 100 games!\n\nMy rank: ${currentTier.label} 🎮\n\nFind out how many you have played at:\nhttps://top-100-games.vercel.app/`

    // Copy image to clipboard so user can paste it directly into the tweet
    setClipboardCopied(false)
    try {
      const res = await fetch(exportDataUrl)
      const blob = await res.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ])
      setClipboardCopied(true)
    } catch {
      // Clipboard API unavailable — user will need to attach manually
    }

    // Open X tweet composer directly (opens X app on mobile, browser tab on desktop)
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(tweetUrl, "_blank")
  }, [exportDataUrl, playedCount, currentTier.label])

  // Number of columns in the export grid (max 10)
  const exportCols = Math.min(Math.max(playedCount, 1), 10)

  return (
    <div style={{ minHeight: "100vh", background: "#07071a" }}>

      {/* ── Hero / status panel ─────────────────────────────── */}
      <div
        style={{
          position: "relative",
          borderBottom: "2px solid #1a1a44",
          fontFamily: "var(--font-vt323), monospace",
          overflow: "hidden",
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", paddingTop: "8px", flexWrap: "wrap" }}>
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

          {/* Progress bar */}
          <div style={{ marginTop: "12px" }}>
            <BlockProgress pct={pct} />
            <div style={{ fontSize: "13px", color: "#5a5a90", letterSpacing: "0.08em", marginTop: "3px" }}>
              {pct}% COMPLETE
            </div>
          </div>
        </div>
      </div>

      {/* ── Game grid ───────────────────────────────────────── */}
      <div style={{ padding: "28px 24px 60px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "44px 24px",
          }}
        >
          {filteredAndSorted.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              played={playedIds.has(game.id)}
              onClick={() => togglePlayed(game.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Stats sheet ─────────────────────────────────────── */}
      <Sheet open={statsOpen} onOpenChange={setStatsOpen}>
        <SheetContent
          side="right"
          className="w-80 p-4 overflow-y-auto"
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

            {/* Image preview */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={exportDataUrl}
                alt="Export preview"
                style={{ width: "100%", display: "block", border: "1px solid #1a1a44" }}
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

      {/* ── Hidden export grid ──────────────────────────────── */}
      <div
        id="export-grid"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 1200,
          padding: "40px 40px 48px",
          background: "#07071a",
          opacity: 0,
          visibility: "hidden",
          pointerEvents: "none",
          zIndex: -1,
        }}
        aria-hidden
      >
        {/* Line 1: title, centered, alone */}
        <div style={{
          textAlign: "center",
          fontFamily: "var(--font-vt323), monospace",
          fontSize: 36,
          color: "#c8c4e0",
          letterSpacing: "0.08em",
          marginBottom: 20,
        }}>
          I&apos;VE PLAYED {playedCount}/100 METACRITIC TOP 100 GAMES
        </div>

        {/* Line 2: badge + tier name, centered */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          marginBottom: 32,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentTier.badge}
            alt={currentTier.label}
            style={{ height: "72px", width: "auto", objectFit: "contain" }}
          />
          <div style={{
            color: "#00e096",
            fontSize: 28,
            fontFamily: "var(--font-vt323), monospace",
            letterSpacing: "0.06em",
          }}>
            {currentTier.label}
          </div>
        </div>

        {/* Played games grid — only games the user has completed */}
        {playedGames.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${exportCols}, 1fr)`,
            gap: 8,
          }}>
            {playedGames.map((game) => (
              <div
                key={game.id}
                style={{
                  position: "relative",
                  aspectRatio: "3/4",
                  overflow: "hidden",
                  outline: "2px solid #00e096",
                }}
              >
                {exportImageMap[game.id] || game.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={exportImageMap[game.id] || proxyImageSrc(game.coverUrl)}
                    alt={game.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "#0d0d28",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{
                      fontSize: 10,
                      color: "#404080",
                      textAlign: "center",
                      padding: 4,
                      fontFamily: "monospace",
                    }}>
                      {game.title}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer watermark */}
        <div style={{
          marginTop: 20,
          textAlign: "center",
          fontFamily: "monospace",
          fontSize: 12,
          color: "#2a2a50",
          letterSpacing: "0.06em",
        }}>
          metacritic-top100.vercel.app
        </div>
      </div>
    </div>
  )
}
