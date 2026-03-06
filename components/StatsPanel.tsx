"use client"

import type { Game } from "@/types/game"

interface Props {
  games: Game[]
  playedIds: Set<string>
}

export default function StatsPanel({ games, playedIds }: Props) {
  const played = games.filter((g) => playedIds.has(g.id))

  const byDecade = games.reduce((acc, g) => {
    const decade = `${Math.floor(g.year / 10) * 10}s`
    if (!acc[decade]) acc[decade] = { total: 0, played: 0 }
    acc[decade].total++
    if (playedIds.has(g.id)) acc[decade].played++
    return acc
  }, {} as Record<string, { total: number; played: number }>)

  const byPlatform = games.reduce((acc, g) => {
    if (!acc[g.platform]) acc[g.platform] = { total: 0, played: 0 }
    acc[g.platform].total++
    if (playedIds.has(g.id)) acc[g.platform].played++
    return acc
  }, {} as Record<string, { total: number; played: number }>)

  const topUnplayed = games.filter((g) => !playedIds.has(g.id)).slice(0, 5)

  return (
    <div className="space-y-6 text-sm">
      <div>
        <p className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">By Decade</p>
        <div className="space-y-2">
          {Object.entries(byDecade).sort(([a], [b]) => a.localeCompare(b)).map(([decade, { total, played }]) => (
            <div key={decade}>
              <div className="flex justify-between text-xs mb-1">
                <span>{decade}</span>
                <span className="text-muted-foreground">{played}/{total}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(played / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Top Unplayed</p>
        <div className="space-y-1.5">
          {topUnplayed.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-2">
              <span className="text-xs truncate">{g.title}</span>
              <span className="text-xs text-emerald-400 font-bold shrink-0">{g.metacriticScore}</span>
            </div>
          ))}
          {topUnplayed.length === 0 && (
            <p className="text-xs text-muted-foreground">You've played everything!</p>
          )}
        </div>
      </div>
    </div>
  )
}
