"use client"

import { useState, useEffect, CSSProperties } from "react"
import type { Game } from "@/types/game"
import ConsoleIcon from "./ConsoleIcon"

interface Props {
  game: Game
  played: boolean
  onClick: () => void
  isMobile?: boolean
}

// ─── Isometric case dimensions ────────────────────────────────────────────────
//
//  Bounding box = (CW + DX) × (CH + DY)
//
//  Top face  clip: polygon( DX 0,  CW+DX 0,  CW DY,  0 DY )
//  Right face clip: polygon( CW DY,  CW+DX 0,  CW+DX CH,  CW CH+DY )
//  Front face: absolute left=0, top=DY, width=CW, height=CH
//
// Portrait (DVD/Blu-ray case): tall & narrow — PS2/3/4, Xbox, Switch, etc.
const PORTRAIT_CW = 136
const PORTRAIT_CH = 190

// Landscape (cartridge): wide & short — N64, NES, GBA cartridges
const LANDSCAPE_CW = 200
const LANDSCAPE_CH = 136

// Square (jewel case): CD-ROM era — PlayStation 1, Dreamcast
const SQUARE_CW = 155
const SQUARE_CH = 145

// Shared depth projection
const DX = 16
const DY = 11

// Platforms whose physical media is wider than it is tall (cartridges)
const LANDSCAPE_PLATFORMS = new Set([
  "Nintendo 64",
  "NES",
  "Game Boy Advance",
  "Atari 2600",
  "Atari",
])

// Platforms that used CD jewel cases (roughly square)
const SQUARE_PLATFORMS = new Set([
  "PlayStation",
  "Dreamcast",
])

function getCaseDimensions(platform: string, caseShape?: string) {
  if (caseShape === "square") return { CW: SQUARE_CW, CH: SQUARE_CH }
  if (caseShape === "landscape") return { CW: LANDSCAPE_CW, CH: LANDSCAPE_CH }
  if (caseShape === "portrait") return { CW: PORTRAIT_CW, CH: PORTRAIT_CH }
  if (LANDSCAPE_PLATFORMS.has(platform)) {
    return { CW: LANDSCAPE_CW, CH: LANDSCAPE_CH }
  }
  if (SQUARE_PLATFORMS.has(platform)) {
    return { CW: SQUARE_CW, CH: SQUARE_CH }
  }
  return { CW: PORTRAIT_CW, CH: PORTRAIT_CH }
}

const GRADIENTS = [
  "linear-gradient(135deg,#3b1060,#1a0540)",
  "linear-gradient(135deg,#0b3d6b,#061a40)",
  "linear-gradient(135deg,#0d5c3a,#062918)",
  "linear-gradient(135deg,#7a1c2e,#3d0a14)",
  "linear-gradient(135deg,#5a3000,#2a1500)",
  "linear-gradient(135deg,#1a1a60,#0a0a30)",
  "linear-gradient(135deg,#4a0060,#200030)",
  "linear-gradient(135deg,#003d5c,#001a30)",
]

function gradientForGame(id: string) {
  const sum = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return GRADIENTS[sum % GRADIENTS.length]
}

function getScoreColor(score: number): { bg: string; text: string } {
  if (score >= 97) return { bg: "#ffc800", text: "#000" }
  if (score >= 95) return { bg: "#00e096", text: "#000" }
  return { bg: "#4a9eff", text: "#000" }
}

// Rank 1 = bright gold, Rank 100 = plain gray, linear interpolation
function getRankColor(rank: number): { color: string; shadowColor: string; glowColor: string } {
  const t = (rank - 1) / 99            // 0 at rank 1, 1 at rank 100
  // Gold rgb(255,200,0) → Gray rgb(105,105,105)
  const r = Math.round(255 - t * 150)
  const g = Math.round(200 - t * 95)
  const b = Math.round(0   + t * 105)
  const color = `rgb(${r},${g},${b})`
  // Shadow = 45% brightness of main color (hard pixel shadow → tetris effect)
  const rs = Math.round(r * 0.42)
  const gs = Math.round(g * 0.42)
  const bs = Math.round(b * 0.42)
  const shadowColor = `rgb(${rs},${gs},${bs})`
  // Glow only for top ~20 ranks, fades quickly
  const glowAlpha = Math.max(0, 1 - t * 5) * 0.55
  const glowColor = `rgba(${r},${g},${b},${glowAlpha.toFixed(2)})`
  return { color, shadowColor, glowColor }
}

export default function GameCard({ game, played, onClick, isMobile = false }: Props) {
  // steamError: the static coverUrl (Steam library_600x900) failed to load
  const [steamError, setSteamError] = useState(false)
  // dynamicCoverUrl: fetched from Wikipedia API as fallback
  const [dynamicCoverUrl, setDynamicCoverUrl] = useState<string | null>(null)
  // dynamicImgError: even the Wikipedia image failed
  const [dynamicImgError, setDynamicImgError] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Fetch Wikipedia cover when:
  //   • no static Steam URL is set, OR
  //   • the Steam URL failed to load (steamError)
  useEffect(() => {
    if (!game.coverUrl || steamError) {
      setDynamicCoverUrl(null)
      setDynamicImgError(false)
      const searchTitle = game.wikiTitle ?? game.title
      fetch(`/api/cover?title=${encodeURIComponent(searchTitle)}&year=${game.year}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.url) setDynamicCoverUrl(data.url)
        })
        .catch(() => {})
    }
  }, [game.coverUrl, game.wikiTitle, game.title, game.year, steamError])

  // Which URL to actually render
  const activeCoverUrl = steamError
    ? dynamicCoverUrl            // Steam failed → try Wikipedia
    : (game.coverUrl || dynamicCoverUrl) // Steam or Wikipedia

  const showFallback = !activeCoverUrl || dynamicImgError
  const sc = getScoreColor(game.metacriticScore)

  // ── Mobile compact view (cover art only, rank overlay) ────────────────────
  if (isMobile) {
    const { color: rankColor, shadowColor, glowColor } = getRankColor(game.rank)
    return (
      <div
        onClick={onClick}
        style={{
          position: "relative",
          aspectRatio: "3 / 4",
          overflow: "hidden",
          cursor: "pointer",
          border: played ? "2px solid #00e096" : "1px solid #1e1e4a",
          background: "#0a0a1e",
        }}
      >
        {/* Cover image */}
        {!showFallback ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeCoverUrl!}
            alt={game.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={() => {
              if (!steamError && game.coverUrl) setSteamError(true)
              else setDynamicImgError(true)
            }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: gradientForGame(game.id),
            display: "flex", alignItems: "flex-end", padding: "6px",
          }}>
            <span style={{
              color: "rgba(255,255,255,0.75)", fontSize: "11px",
              fontFamily: "var(--font-vt323), monospace", lineHeight: 1.2,
            }}>
              {game.title}
            </span>
          </div>
        )}

        {/* Played green tint */}
        {played && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,224,150,0.1)", pointerEvents: "none",
          }} />
        )}

        {/* Rank overlay — bottom-left, gold→gray */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 5px 3px",
          background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0) 100%)",
          fontFamily: "var(--font-vt323), monospace",
          fontSize: "18px",
          lineHeight: 1,
          color: rankColor,
          textShadow: `1px 1px 0 ${shadowColor}, 2px 2px 0 ${shadowColor}, 0 0 10px ${glowColor}`,
          letterSpacing: "0.02em",
        }}>
          #{game.rank}
        </div>

        {/* Played checkmark — top-right */}
        {played && (
          <div style={{
            position: "absolute", top: 4, right: 4,
            background: "#00e096", color: "#000",
            fontFamily: "var(--font-vt323), monospace",
            fontSize: "13px", padding: "0 4px", lineHeight: "1.4",
          }}>
            ✓
          </div>
        )}
      </div>
    )
  }

  const { CW, CH } = getCaseDimensions(game.platform, game.caseShape)
  const topClip   = `polygon(${DX}px 0px, ${CW + DX}px 0px, ${CW}px ${DY}px, 0px ${DY}px)`
  const rightClip = `polygon(${CW}px ${DY}px, ${CW + DX}px 0px, ${CW + DX}px ${CH}px, ${CW}px ${CH + DY}px)`

  const caseWrapStyle: CSSProperties = {
    position: "relative",
    width: CW + DX,
    height: CH + DY,
    transform: hovered ? "translateY(-8px) scale(1.03)" : "translateY(0) scale(1)",
    transition: "transform 0.2s ease, filter 0.2s ease",
    filter: played
      ? "drop-shadow(0 0 12px rgba(0,224,150,0.5)) drop-shadow(0 8px 20px rgba(0,0,0,0.8))"
      : hovered
        ? "drop-shadow(0 10px 24px rgba(0,0,0,0.85))"
        : "drop-shadow(0 4px 12px rgba(0,0,0,0.7))",
    flexShrink: 0,
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", cursor: "pointer" }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Isometric case — fixed-height container so all cards align ── */}
      {/* PORTRAIT_CH + DY = 190 + 11 = 201 is the tallest possible case */}
      <div style={{
        height: PORTRAIT_CH + DY,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}>
      <div style={caseWrapStyle}>

        {/* Top face — lighter, gives the "lid" illusion */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: topClip,
            background: "linear-gradient(120deg, #22224a 0%, #12122e 100%)",
          }}
        />

        {/* Right face — darker, gives depth */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: rightClip,
            background: "linear-gradient(180deg, #0e0e28 0%, #07071a 100%)",
          }}
        />

        {/* Front face — the cover art */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: DY,
            width: CW,
            height: CH,
            overflow: "hidden",
            outline: played ? "2px solid #00e096" : "1px solid #1e1e4a",
            outlineOffset: "-1px",
            // Dark background shows between image and case edges when aspect ratios differ
            background: "#0a0a1e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!showFallback ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeCoverUrl!}
              alt={game.title}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "100%",
                height: "100%",
                objectFit: "contain",  // show the WHOLE poster, never crop
                display: "block",
              }}
              onError={() => {
                // If the static Steam URL fails, trigger the Wikipedia fallback chain
                if (!steamError && game.coverUrl) setSteamError(true)
                else setDynamicImgError(true)
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: gradientForGame(game.id),
                display: "flex",
                alignItems: "flex-end",
                padding: "8px",
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "15px",
                  fontFamily: "var(--font-vt323), monospace",
                  lineHeight: 1.25,
                  letterSpacing: "0.04em",
                }}
              >
                {game.title}
              </span>
            </div>
          )}

          {/* Subtle played tint */}
          {played && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,224,150,0.1)",
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        {/* rank badge removed — now displayed as large number below the case */}

        {/* Played check — top-right of front face */}

        {played && (
          <div
            style={{
              position: "absolute",
              right: DX + 5,
              top: DY + 5,
              background: "#00e096",
              color: "#000",
              fontFamily: "var(--font-vt323), monospace",
              fontSize: "15px",
              padding: "0 5px",
              lineHeight: "1.4",
              zIndex: 2,
            }}
          >
            ✓
          </div>
        )}
      </div>
      </div>{/* end fixed-height case container */}

      {/* ── Info below the case ───────────────────────────────── */}
      {/* Fixed-height column so every card's score chip lands on the same row */}
      <div
        style={{
          width: Math.max(CW + DX, 152),
          textAlign: "center",
          fontFamily: "var(--font-vt323), monospace",
          letterSpacing: "0.04em",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* ── Big rank number (tetris-block style) ── */}
        {(() => {
          const { color, shadowColor, glowColor } = getRankColor(game.rank)
          return (
            <div style={{
              fontSize: "52px",
              lineHeight: 1,
              marginBottom: "6px",
              color,
              fontFamily: "var(--font-vt323), monospace",
              letterSpacing: "-0.01em",
              flexShrink: 0,
              textShadow: `
                2px  2px 0 ${shadowColor},
                4px  4px 0 ${shadowColor},
                6px  6px 0 ${shadowColor},
                0    0   18px ${glowColor}
              `,
            }}>
              #{game.rank}
            </div>
          )
        })()}

        {/* Title — fixed height = exactly 2 lines, so all cards stay in sync */}
        <div
          style={{
            fontSize: "19px",
            color: hovered ? "#e8e4ff" : "#c8c4e0",
            lineHeight: 1.25,
            // 19px × 1.25 × 2 lines = 47.5 → round to 48px
            height: "48px",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            marginBottom: "4px",
            transition: "color 0.15s",
            flexShrink: 0,
            width: "100%",
          } as CSSProperties}
        >
          {game.title}
        </div>

        {/* Year · Console icon */}
        <div style={{
          fontSize: "14px", color: "#7070b8", marginBottom: "5px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
          flexShrink: 0,
        }}>
          {game.year}&nbsp;·&nbsp;<ConsoleIcon platform={game.platform} size={18} />
        </div>

        {/* Score chip */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <span
            style={{
              background: sc.bg,
              color: sc.text,
              fontSize: "17px",
              fontWeight: "bold",
              padding: "1px 9px",
              lineHeight: "1.35",
              letterSpacing: "0.05em",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: "normal", opacity: 0.8 }}>Metacritic:&nbsp;</span>{game.metacriticScore}
          </span>
          {played && (
            <span style={{ color: "#00e096", fontSize: "15px", letterSpacing: "0.06em" }}>
              PLAYED
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
