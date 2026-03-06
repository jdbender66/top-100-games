"use client"

import type { Filters } from "@/types/game"
import { Button } from "@/components/ui/button"

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  allPlatforms: string[]
  allGenres: string[]
  allDecades: string[]
}

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

export default function FiltersSidebar({ filters, onChange, allPlatforms, allGenres, allDecades }: Props) {
  return (
    <div className="space-y-5 text-sm">
      <div>
        <p className="font-semibold mb-2 text-xs uppercase tracking-wider text-muted-foreground">Status</p>
        <div className="space-y-1">
          {[
            { label: "Played", key: "showPlayedOnly" as const },
            { label: "Not played", key: "showUnplayedOnly" as const },
          ].map(({ label, key }) => (
            <button
              key={key}
              onClick={() => onChange({ ...filters, [key]: !filters[key], ...(key === "showPlayedOnly" && filters[key] === false ? { showUnplayedOnly: false } : {}), ...(key === "showUnplayedOnly" && filters[key] === false ? { showPlayedOnly: false } : {}) })}
              className={`w-full text-left px-2 py-1 rounded-md transition-colors ${filters[key] ? "bg-emerald-600 text-white" : "hover:bg-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-semibold mb-2 text-xs uppercase tracking-wider text-muted-foreground">Decade</p>
        <div className="flex flex-wrap gap-1">
          {allDecades.map((d) => (
            <button
              key={d}
              onClick={() => onChange({ ...filters, decades: toggle(filters.decades, d) })}
              className={`px-2 py-0.5 rounded-full text-xs transition-colors ${filters.decades.includes(d) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-semibold mb-2 text-xs uppercase tracking-wider text-muted-foreground">Platform</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {allPlatforms.map((p) => (
            <button
              key={p}
              onClick={() => onChange({ ...filters, platforms: toggle(filters.platforms, p) })}
              className={`w-full text-left px-2 py-1 rounded-md text-xs transition-colors ${filters.platforms.includes(p) ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-semibold mb-2 text-xs uppercase tracking-wider text-muted-foreground">Genre</p>
        <div className="flex flex-wrap gap-1">
          {allGenres.map((g) => (
            <button
              key={g}
              onClick={() => onChange({ ...filters, genres: toggle(filters.genres, g) })}
              className={`px-2 py-0.5 rounded-full text-xs transition-colors ${filters.genres.includes(g) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs"
        onClick={() => onChange({ searchQuery: "", platforms: [], decades: [], genres: [], showPlayedOnly: false, showUnplayedOnly: false })}
      >
        Reset filters
      </Button>
    </div>
  )
}
