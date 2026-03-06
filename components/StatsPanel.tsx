"use client"

import type { Game } from "@/types/game"

interface Props {
  games: Game[]
  playedIds: Set<string>
}

const VT: React.CSSProperties = { fontFamily: "var(--font-vt323), monospace" }

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      ...VT,
      fontSize: "14px",
      color: "#5a5a90",
      letterSpacing: "0.14em",
      marginBottom: "14px",
    }}>
      {children}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
      <span style={{ ...VT, fontSize: "15px", color: "#5a5a90", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ ...VT, fontSize: "19px", color: "#c8c4e0", letterSpacing: "0.04em", marginLeft: 12 }}>{value}</span>
    </div>
  )
}

function BarRow({ label, played, total }: { label: string; played: number; total: number }) {
  const pct = total > 0 ? (played / total) * 100 : 0
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ ...VT, fontSize: "16px", color: "#c8c4e0", letterSpacing: "0.04em" }}>{label}</span>
        <span style={{ ...VT, fontSize: "15px", color: "#5a5a90" }}>{played}/{total}</span>
      </div>
      <div style={{ height: "6px", background: "#1a1a40", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: "#00e096",
          borderRadius: 3,
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  )
}

export default function StatsPanel({ games, playedIds }: Props) {
  const played = games.filter((g) => playedIds.has(g.id))
  const playedCount = played.length

  // ── Year dot chart data ──────────────────────────────────
  const allYears = games.map((g) => g.year)
  const minYear = Math.min(...allYears)
  const maxYear = Math.max(...allYears)
  const yearRange = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i)

  const playedByYear = played.reduce((acc, g) => {
    acc[g.year] = (acc[g.year] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  const maxStack = Math.max(...yearRange.map((y) => playedByYear[y] || 0), 1)
  const DOT = 9        // dot diameter px
  const DOT_GAP = 3    // vertical gap between dots px
  const chartH = Math.max(80, maxStack * (DOT + DOT_GAP) + 6)

  // ── By Platform ──────────────────────────────────────────
  const byPlatform = games.reduce((acc, g) => {
    if (!acc[g.platform]) acc[g.platform] = { total: 0, played: 0 }
    acc[g.platform].total++
    if (playedIds.has(g.id)) acc[g.platform].played++
    return acc
  }, {} as Record<string, { total: number; played: number }>)

  const sortedPlatforms = Object.entries(byPlatform)
    .sort(([, a], [, b]) => b.total - a.total)

  // ── Quick stats ──────────────────────────────────────────
  const topUnplayed = games.filter((g) => !playedIds.has(g.id)).slice(0, 5)

  const avgYear = playedCount > 0
    ? Math.round(played.reduce((s, g) => s + g.year, 0) / playedCount)
    : null

  const avgScore = playedCount > 0
    ? Math.round(played.reduce((s, g) => s + g.metacriticScore, 0) / playedCount)
    : null

  const oldest = playedCount > 0
    ? played.reduce((a, b) => a.year < b.year ? a : b)
    : null

  const newest = playedCount > 0
    ? played.reduce((a, b) => a.year > b.year ? a : b)
    : null

  const highestPlayed = playedCount > 0
    ? played.reduce((a, b) => a.metacriticScore > b.metacriticScore ? a : b)
    : null

  // Truncate game titles to fit the wider panel
  const trunc = (s: string, n = 22) => s.length > n ? s.slice(0, n - 1) + "…" : s

  const divider = (
    <div style={{ borderTop: "1px solid #1a1a40", margin: "20px 0" }} />
  )

  return (
    <div style={{ ...VT, color: "#c8c4e0" }}>

      {/* ── GAMES BY YEAR dot chart ──────────────────────── */}
      <SectionLabel>GAMES BY YEAR</SectionLabel>

      <div style={{ position: "relative", marginBottom: "6px" }}>
        {/* Dot columns */}
        <div style={{
          display: "flex",
          alignItems: "flex-end",
          height: chartH,
          gap: 0,
        }}>
          {yearRange.map((year) => {
            const count = playedByYear[year] || 0
            return (
              <div
                key={year}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  height: "100%",
                  gap: DOT_GAP,
                }}
                title={count > 0 ? `${year}: ${count} game${count > 1 ? "s" : ""}` : year.toString()}
              >
                {Array.from({ length: count }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      width: DOT,
                      height: DOT,
                      borderRadius: "50%",
                      background: "#00e096",
                      boxShadow: "0 0 5px rgba(0,224,150,0.65)",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            )
          })}
        </div>

        {/* Axis line */}
        <div style={{ height: 1, background: "#2a2a50", margin: "5px 0 0" }} />

        {/* Year ticks + labels */}
        <div style={{ display: "flex", alignItems: "flex-start", height: 28 }}>
          {yearRange.map((year) => {
            const showLabel = year % 5 === 0
            return (
              <div
                key={year}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  overflow: "visible",
                }}
              >
                <div style={{
                  width: 1,
                  height: showLabel ? 7 : 4,
                  background: showLabel ? "#3a3a70" : "#1e1e40",
                  marginBottom: 2,
                }} />
                {showLabel && (
                  <div style={{
                    ...VT,
                    fontSize: "12px",
                    color: "#4a4a80",
                    letterSpacing: 0,
                    whiteSpace: "nowrap",
                    lineHeight: 1,
                  }}>
                    {year}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {divider}

      {/* ── QUICK STATS ──────────────────────────────────── */}
      <SectionLabel>QUICK STATS</SectionLabel>
      {playedCount === 0 ? (
        <div style={{ ...VT, fontSize: "15px", color: "#3a3a70" }}>Mark games as played to see stats.</div>
      ) : (
        <>
          {avgYear    && <StatRow label="AVG RELEASE YEAR"  value={avgYear} />}
          {avgScore   && <StatRow label="AVG METACRITIC"    value={avgScore} />}
          {oldest     && <StatRow label="OLDEST PLAYED"     value={`${trunc(oldest.title)} (${oldest.year})`} />}
          {newest     && <StatRow label="NEWEST PLAYED"     value={`${trunc(newest.title)} (${newest.year})`} />}
          {highestPlayed && <StatRow label="TOP SCORE PLAYED" value={`${trunc(highestPlayed.title)} (${highestPlayed.metacriticScore})`} />}
        </>
      )}

      {divider}

      {/* ── BY CONSOLE ───────────────────────────────────── */}
      <SectionLabel>BY CONSOLE</SectionLabel>
      {sortedPlatforms.map(([platform, { total, played: p }]) => (
        <BarRow key={platform} label={platform} played={p} total={total} />
      ))}

      {divider}

      {/* ── TOP UNPLAYED ─────────────────────────────────── */}
      <SectionLabel>TOP UNPLAYED</SectionLabel>
      {topUnplayed.length === 0 ? (
        <div style={{ ...VT, fontSize: "15px", color: "#3a3a70" }}>You&apos;ve played everything!</div>
      ) : (
        topUnplayed.map((g) => (
          <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
            <span style={{ ...VT, fontSize: "16px", color: "#c8c4e0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 12 }}>
              {g.title}
            </span>
            <span style={{ ...VT, fontSize: "18px", color: "#00e096", flexShrink: 0 }}>{g.metacriticScore}</span>
          </div>
        ))
      )}
    </div>
  )
}
