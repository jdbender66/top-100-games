"use client"

import { CSSProperties } from "react"
import { Search, X } from "lucide-react"
import type { Filters, SortKey } from "@/types/game"

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  sortKey: SortKey
  onSortChange: (k: SortKey) => void
  allPlatforms: string[]
  allGenres: string[]
  allDecades: string[]
  resultCount: number
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rank", label: "RANK" },
  { value: "score_desc", label: "SCORE" },
  { value: "year_asc", label: "OLDEST" },
  { value: "year_desc", label: "NEWEST" },
  { value: "title_az", label: "A–Z" },
  { value: "platform", label: "PLATFORM" },
]

const CTRL: CSSProperties = {
  background: "#0d0d2a",
  border: "1px solid #1e1e4a",
  color: "#8080c0",
  fontFamily: "var(--font-vt323), monospace",
  fontSize: "16px",
  padding: "5px 9px",
  cursor: "pointer",
  outline: "none",
  letterSpacing: "0.05em",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
  lineHeight: "1.2",
}

const LABEL: CSSProperties = {
  fontSize: "13px",
  color: "#2e2e60",
  fontFamily: "var(--font-vt323), monospace",
  letterSpacing: "0.08em",
  marginBottom: "2px",
  display: "block",
}

function SelectGroup({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  allLabel: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={LABEL}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={CTRL}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function FilterBar({
  filters,
  onChange,
  sortKey,
  onSortChange,
  allPlatforms,
  allGenres,
  allDecades,
  resultCount,
}: Props) {
  const hasFilters =
    filters.platforms.length > 0 ||
    filters.decades.length > 0 ||
    filters.genres.length > 0 ||
    filters.showPlayedOnly ||
    filters.showUnplayedOnly ||
    !!filters.searchQuery

  const reset = () =>
    onChange({
      searchQuery: "",
      platforms: [],
      decades: [],
      genres: [],
      showPlayedOnly: false,
      showUnplayedOnly: false,
    })

  return (
    <div
      style={{
        background: "#09091e",
        borderBottom: "2px solid #1a1a44",
        padding: "10px 20px",
        display: "flex",
        alignItems: "flex-end",
        gap: "10px",
        flexWrap: "wrap",
        fontFamily: "var(--font-vt323), monospace",
      }}
    >
      {/* ── Search ────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={LABEL}>SEARCH</span>
        <div style={{ position: "relative" }}>
          <Search
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 13,
              height: 13,
              color: "#2e2e60",
            }}
          />
          <input
            type="text"
            placeholder="TITLE..."
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            style={{ ...CTRL, paddingLeft: 26, paddingRight: filters.searchQuery ? 26 : 9, width: 160 }}
          />
          {filters.searchQuery && (
            <button
              onClick={() => onChange({ ...filters, searchQuery: "" })}
              style={{
                position: "absolute",
                right: 7,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#3a3a70",
                padding: 0,
                display: "flex",
              }}
            >
              <X style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Platform ──────────────────────── */}
      <SelectGroup
        label="PLATFORM"
        value={filters.platforms[0] ?? ""}
        onChange={(v) => onChange({ ...filters, platforms: v ? [v] : [] })}
        options={allPlatforms}
        allLabel="ALL"
      />

      {/* ── Genre ─────────────────────────── */}
      <SelectGroup
        label="GENRE"
        value={filters.genres[0] ?? ""}
        onChange={(v) => onChange({ ...filters, genres: v ? [v] : [] })}
        options={allGenres}
        allLabel="ALL"
      />

      {/* ── Decade ────────────────────────── */}
      <SelectGroup
        label="DECADE"
        value={filters.decades[0] ?? ""}
        onChange={(v) => onChange({ ...filters, decades: v ? [v] : [] })}
        options={allDecades}
        allLabel="ALL"
      />

      {/* ── Status ────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={LABEL}>STATUS</span>
        <select
          value={
            filters.showPlayedOnly ? "played" : filters.showUnplayedOnly ? "unplayed" : ""
          }
          onChange={(e) =>
            onChange({
              ...filters,
              showPlayedOnly: e.target.value === "played",
              showUnplayedOnly: e.target.value === "unplayed",
            })
          }
          style={CTRL}
        >
          <option value="">ALL</option>
          <option value="played">PLAYED</option>
          <option value="unplayed">UNPLAYED</option>
        </select>
      </div>

      {/* ── Sort ──────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={LABEL}>SORT BY</span>
        <select
          value={sortKey}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          style={CTRL}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Clear ─────────────────────────── */}
      {hasFilters && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={LABEL}>&nbsp;</span>
          <button
            onClick={reset}
            style={{
              ...CTRL,
              color: "#ff3060",
              border: "1px solid #3a1030",
              background: "#120818",
            }}
          >
            [RESET]
          </button>
        </div>
      )}

      {/* ── Result count ──────────────────── */}
      <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span style={LABEL}>SHOWING</span>
        <span
          style={{
            fontSize: "22px",
            color: resultCount < 100 ? "#00d4ff" : "#3a3a70",
            lineHeight: 1,
            letterSpacing: "0.05em",
          }}
        >
          {resultCount}
          <span style={{ color: "#252550", fontSize: "17px" }}>/100</span>
        </span>
      </div>
    </div>
  )
}
