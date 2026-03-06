"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { BarChart2, Download } from "lucide-react"
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

  const playedCount = playedIds.size
  const pct = Math.round((playedCount / 100) * 100)
  const currentTier = getTier(playedCount)

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const { toPng } = await import("html-to-image")
      const grid = document.getElementById("export-grid")
      if (!grid) return
      const dataUrl = await toPng(grid, { backgroundColor: "#07071a", pixelRatio: 2 })
      const link = document.createElement("a")
      link.download = `metacritic-100-${playedCount}-played.png`
      link.href = dataUrl
      link.click()
    } catch (e) {
      console.error(e)
    } finally {
      setIsExporting(false)
    }
  }, [playedCount])

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
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: isExporting ? 0.5 : 1,
                  backdropFilter: "blur(4px)",
                }}
              >
                <Download style={{ width: 14, height: 14 }} />
                {isExporting ? "EXPORTING..." : "SHARE"}
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

      {/* ── Hidden export grid ──────────────────────────────── */}
      <div
        id="export-grid"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 1200,
          padding: 32,
          background: "#07071a",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
        aria-hidden
      >
        {/* Export header with tier badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentTier.badge}
            alt={currentTier.label}
            crossOrigin="anonymous"
            style={{ height: "64px", width: "auto", objectFit: "contain" }}
          />
          <div>
            <h2
              style={{
                color: "#c8c4e0",
                fontSize: 28,
                fontFamily: "var(--font-vt323), monospace",
                letterSpacing: "0.08em",
                margin: 0,
              }}
            >
              I&apos;VE PLAYED {playedCount}/100 METACRITIC TOP 100 GAMES
            </h2>
            <div style={{
              color: "#00e096",
              fontSize: 20,
              fontFamily: "var(--font-vt323), monospace",
              letterSpacing: "0.06em",
              marginTop: 4,
            }}>
              RANK: {currentTier.label}
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 8 }}>
          {ALL_GAMES.map((game) => (
            <div
              key={game.id}
              style={{
                position: "relative",
                aspectRatio: "3/4",
                overflow: "hidden",
                opacity: playedIds.has(game.id) ? 1 : 0.35,
                outline: playedIds.has(game.id) ? "2px solid #00e096" : "none",
              }}
            >
              {game.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={game.coverUrl}
                  alt={game.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  crossOrigin="anonymous"
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
                  <span
                    style={{
                      fontSize: 8,
                      color: "#4040800",
                      textAlign: "center",
                      padding: 4,
                      fontFamily: "monospace",
                    }}
                  >
                    {game.title}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
