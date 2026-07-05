# metacritic-100 — Project Notes
> Full handoff context for a new Claude session to pick up this project without missing a beat.

---

## Project Location
```
/Users/josephbender/Documents/Claude Code/metacritic-100/
```

---

## What This Project Is
A personal web app called **"Top 100 Games Tracker"** — lets Joe check off which of Metacritic's Top 100 games of all time he has played. Deployed (or deploying) to Vercel at `https://top-100-games.vercel.app`.

Key features:
- **100 isometric 3D game case cards** rendered in CSS, each with cover art
- **Click a card to toggle played/unplayed** — state persisted in `localStorage`
- **Filter** by platform, genre, decade, play status, or search by title
- **Sort** by rank, score, year (asc/desc), title A–Z, or platform
- **Stats panel** (slide-out sheet) showing dot chart, platform progress bars, top unplayed, quickstats
- **Tier badge system** — 11 tiers from "Grass Toucher" to "Genuine Gaming God" based on games played count, unlocked at each 10-game milestone
- **Confetti** fires at every 10-game milestone, intensity scales 1–10
- **Share / Export** — renders all played game cards as a PNG share image using `html2canvas`
- **Console logos** in card popups for all 18 platforms
- **Cover art** auto-fetched: Steam CDN first → Wikipedia API fallback → gradient placeholder

---

## Tech Stack

| Tech | Version | Notes |
|------|---------|-------|
| Next.js | 16.1.6 | App Router, `"use client"` everywhere |
| React | 19 | |
| TypeScript | 5 | |
| Tailwind CSS | v4 | `@import "tailwindcss"` in globals.css |
| shadcn/ui | latest | Tooltip, Sheet, Button, Select components |
| lucide-react | 0.383.0 | Icons |
| html2canvas | latest | Share image generation |
| html-to-image | latest | Also available (backup) |
| vaul | latest | Drawer (may be unused) |

**Dev port:** `3001` (set via `package.json` start script: `next dev -p 3001`)

**Run locally:** `npm run dev` from inside `metacritic-100/`

---

## File Map

```
metacritic-100/
├── app/
│   ├── page.tsx           — Main page ("use client"), all UI state
│   ├── layout.tsx         — Root layout, VT323 font, Nav, TooltipProvider
│   ├── globals.css        — Tailwind v4 import, dark theme vars, custom scrollbar
│   └── api/
│       ├── cover/
│       │   └── route.ts   — Wikipedia cover art API (infobox + pageimages strategies)
│       └── proxy-image/
│           └── route.ts   — CORS proxy for external images (needed for html2canvas)
├── components/
│   ├── GameCard.tsx        — Isometric 3D game case renderer, info popup
│   ├── StatsPanel.tsx      — Stats slide-out panel (dot chart, platform bars, etc.)
│   ├── FilterBar.tsx       — Top filter/sort bar (inline retro selects + search)
│   ├── SortDropdown.tsx    — Shadcn/ui Select wrapper for sort (may be legacy)
│   ├── ConsoleIcon.tsx     — Platform logo img component
│   ├── Confetti.tsx        — Canvas-based confetti animation
│   └── Nav.tsx             — Fixed top nav bar with logo, title, live clock
├── lib/
│   └── games.ts            — ALL_GAMES export, filterGames(), sortGames(), getAllPlatforms/Genres/Decades()
├── types/
│   └── game.ts             — Game interface, SortKey union, Filters interface, DEFAULT_FILTERS
├── data/
│   └── games.json          — Source of truth: 100 game objects
├── public/
│   ├── website_logo.png    — Nav bar logo
│   ├── favicon.png
│   ├── og-image.png        — OpenGraph share image
│   ├── console logos/      — 18 platform logo PNGs (named e.g. playstation2.png, 360.png, PC.png)
│   ├── Tier Badges/        — 11 badge PNGs (badge 1.png → badge 11.png)
│   └── [cover images]      — Some game covers stored locally (e.g. soulcaliber.jpg)
└── next.config.ts          — next/image remote patterns (Steam CDN, Wikipedia, IGDB)
```

---

## Data Model (`types/game.ts`)

```typescript
interface Game {
  id: string           // kebab-case unique ID (e.g. "zelda-ocarina-of-time")
  rank: number         // 1–100
  title: string
  developer: string
  publisher: string
  platform: string     // exactly as it appears in ConsoleIcon LOGO_MAP
  year: number
  metacriticScore: number
  genres: string[]
  coverUrl: string     // Steam CDN URL, local path ("/soulcaliber.jpg"), or ""
  steamAppId: number | null
  wikiTitle?: string   // overrides title for Wikipedia API lookups if different
  caseShape?: "portrait" | "landscape" | "square"  // defaults to "portrait"
}

type SortKey = "rank" | "score_desc" | "year_asc" | "year_desc" | "title_az" | "platform"

interface Filters {
  searchQuery: string
  platforms: string[]
  decades: string[]
  genres: string[]
  showPlayedOnly: boolean
  showUnplayedOnly: boolean
}
```

---

## `data/games.json` Structure

Each entry looks like:
```json
{
  "rank": 1,
  "id": "zelda-ocarina-of-time",
  "title": "The Legend of Zelda: Ocarina of Time",
  "developer": "Nintendo EAD",
  "publisher": "Nintendo",
  "platform": "Nintendo 64",
  "year": 1998,
  "metacriticScore": 99,
  "genres": ["Action-Adventure"],
  "steamAppId": null,
  "coverUrl": "",
  "wikiTitle": "The Legend of Zelda: Ocarina of Time"
}
```

- `coverUrl: ""` → no static cover; will try Wikipedia API at runtime
- `coverUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/[id]/library_600x900.jpg"` → Steam CDN
- `coverUrl: "/soulcaliber.jpg"` → local file in `public/`
- `wikiTitle` is optional — only needed when Wikipedia article title differs from `title`

---

## localStorage Persistence

**Key:** `"metacritic100_played"`
**Value:** JSON array of game IDs, e.g. `["zelda-ocarina-of-time", "grand-theft-auto-iv"]`

Loaded in a `useEffect` on mount in `page.tsx`. Written back via `setPlayedIds` on every toggle.

---

## page.tsx — Architecture

`app/page.tsx` is the entire app (`"use client"`). Major pieces:

### State
- `playedIds: Set<string>` — loaded from localStorage on mount
- `sortField: "rank" | "year" | "completed"`, `sortDir: "asc" | "desc"` — header column sort
- `filterPlatform: string | null` — single-platform quick filter (portal dropdown)
- `statsOpen: boolean` — controls Stats Sheet slide-out
- `confettiTrigger: number`, `confettiIntensity: number` — incremented at milestones
- `exportModalOpen: boolean`, `exportDataUrl: string` — Share modal
- `exportImageMap: Record<string, string>` — pre-fetched cover data URLs for export
- `exportBadgeUrl: string` — tier badge as data URL for export
- `tierTooltipOpen: boolean` — hover tooltip showing tier badge + label

### Module-level cover cache
```typescript
const coverCache = new Map<string, string>() // gameId → data URL
```
Persists across re-renders. Pre-fetched in background for all played games so share export is instant.

### Tier Badge System
11 tiers defined in `TIERS` array, matched by `getTier(count)`:

| Count | Label | Badge |
|-------|-------|-------|
| 100 | Genuine Gaming God | badge 11.png |
| 90 | Digital Degen | badge 10.png |
| 80 | Who Needs Sunlight? | badge 9.png |
| 70 | Learned Gaming Scholar | badge 8.png |
| 60 | Skipping Family Dinners | badge 7.png |
| 50 | Zelda Is My Girlfriend | badge 6.png |
| 40 | Certified Couch Occupant | badge 5.png |
| 30 | Cooking With Gas | badge 4.png |
| 20 | Not A Complete Noob | badge 3.png |
| 10 | Dipped Your Toe In The Gaming Pool | badge 2.png |
| 0 | Grass Toucher | badge 1.png |

### Confetti Milestones
Every 10 games played fires confetti. `intensity = playedCount / 10` (so 10 games = 1, 100 games = 10). At intensity ≥ 9, a second wave fires at +350ms; at 10, a third at +700ms.

### Platform Filter Dropdown
Custom portal-rendered dropdown anchored to the platform filter button via `getBoundingClientRect()`. Tracks scroll to reposition. Shows all platforms with per-platform game counts.

### Sort (Header Columns)
Three sortable columns: Rank, Year, Completed. Clicking the same column toggles direction. Defaults: rank → asc, year → asc, completed → asc.

### `FilterBar` component
Inline retro filter bar below the sticky header. Controls: Search (text), Platform (select), Genre (select), Decade (select), Status (select: all/played/unplayed), Sort By (select). Shows live result count. `[RESET]` button appears when any filter is active.

### Share / Export Flow
1. `handleExport()` called
2. Pre-fetches all cover images via `fetchAndCacheCover()` + proxy → data URLs (bypasses CORS)
3. Sets `exportImageMap` state
4. `html2canvas` (or html-to-image) renders a dedicated off-screen share card DOM element
5. Result stored as `exportDataUrl`
6. `exportModalOpen = true` shows the PNG in a modal with download + share buttons

---

## GameCard.tsx — Isometric 3D Case Renderer

### Case shapes and dimensions
| Shape | Width | Height | Usage |
|-------|-------|--------|-------|
| portrait | 136px | 190px | default (most console games) |
| landscape | 200px | 136px | handheld games, some older titles |
| square | 155px | 145px | PC games |

### Three faces of the isometric case
Rendered via `clipPath: polygon()` on absolutely-positioned divs:
- **Front face** — main cover art image
- **Top face** — lighter gradient (perspective top)
- **Right spine face** — darker gradient (perspective side)

### Cover art fallback chain (per card at render time)
1. `game.coverUrl` (Steam CDN or local path) — tried first via `<img>` with `onError`
2. Wikipedia API: `GET /api/cover?title=...&year=...` — infobox wikitext + pageimages fallback
3. Gradient placeholder — CSS gradient using game's rank-derived hue

### Info popup
Clicking a card's info icon opens a portal-rendered popup (via `createPortal`) positioned near the card. Shows: title, developer, publisher, platform + console icon, year, score, genres. Closed by clicking outside or pressing Escape.

### Mobile compact view
At `window.innerWidth < 640`, cards render in a compact mode: smaller dimensions, no 3D face effects, simpler layout.

### Rank number styling
`getRankColor(rank)`: gold gradient for ranks 1–3, silver for 4–10, bronze for 11–25, muted for the rest.
`getScoreColor(score)`: green ≥ 90, teal ≥ 80, yellow ≥ 70, orange ≥ 60, red below.

---

## Cover Art API (`app/api/cover/route.ts`)

Two-strategy Wikipedia lookup with caching (24h via `next: { revalidate: 86400 }`).

### Strategy 1: Infobox wikitext parsing
1. Tries up to 5 article title variants (plain, `(video game)`, `([year] video game)`, `([year])`, plus wiki-specific `wikiTitle` if provided)
2. For each: fetches `?action=query&prop=revisions&rvprop=content` to get raw wikitext
3. Parses `| image = filename.jpg` from the infobox
4. Builds `upload.wikimedia.org` URL with proper encoding

### Strategy 2: pageimages API fallback
If Strategy 1 fails: `?action=query&prop=pageimages&pithumbsize=600`

### URL format returned
```
https://upload.wikimedia.org/wikipedia/commons/thumb/[hash1]/[hash2]/[filename]/600px-[filename]
```
or the direct URL from pageimages.

---

## CORS Proxy (`app/api/proxy-image/route.ts`)

`GET /api/proxy-image?url=[encoded URL]`

Fetches the external image server-side, returns it as a buffer with `Access-Control-Allow-Origin: *`. Required for html2canvas to export images that live on external domains (Steam CDN, Wikipedia).

---

## Nav.tsx

Fixed top bar (72px tall, `z-index: 50`). Contains:
- Vertical separator line
- `/website_logo.png` (52px tall)
- Title: "Top 100 Games Tracker" (desktop) / "Top 100 Tracker" (mobile, <640px)
- Spacer
- Live clock (hidden on mobile): `"TUE 11 MAR 2025  14:22"` format

---

## StatsPanel.tsx

Slide-out `Sheet` (shadcn/ui) from the right side. Opened via the stats icon button.

Content:
- **Dot chart** — one dot per year (1990s–2020s), dot size/opacity = games that year, colored by played status
- **Quick stats** — played count, avg year, avg Metacritic score, oldest/newest played games
- **Platform progress bars** — for each platform: `[played] / [total]` with retro block bar
- **Top 5 unplayed** — ranked list of highest-ranked games not yet played

---

## ConsoleIcon.tsx

Maps 18 platform strings → PNG paths in `public/console logos/`:

| Platform | File |
|----------|------|
| PlayStation | playstation.png |
| PlayStation 2 | playstation2.png |
| PlayStation 3 | ps3.png |
| PlayStation 4 | ps4.png |
| PlayStation 5 | ps5.png |
| Nintendo 64 | n64.png |
| GameCube | gamecube.png |
| Nintendo Switch | switch.png |
| Wii | wii.png |
| Dreamcast | dreamcast.png |
| Xbox | xbox.png |
| Xbox 360 | 360.png |
| PC | PC.png |
| Game Boy Advance | gba.png |
| Nintendo DS | ds.png |
| NES | nes.png |
| SNES | snes.png |
| Game Boy | gameboy.png |

If platform not in map: renders platform name as text fallback.

---

## Confetti.tsx

Canvas-based, `position: fixed; inset: 0; pointer-events: none; z-index: 99999`.

- **Props:** `intensity` (1–10), `trigger` (number incremented to fire)
- **Particle shapes:** rect (most common), circle (15%), star (10%)
- **Two particle types:**
  - Regular: fall from top of screen in a 60–120° downward fan
  - Burst: explode radially from screen center (only at intensity ≥ 5)
- **Particle count scales quadratically** with intensity
- **Colors:** teal, gold, lavender, coral, cyan, yellow, pink, indigo, mint, rose
- **Physics:** gravity (0.18), drag (0.992), per-particle alpha decay
- Extra waves: intensity ≥ 9 fires second wave at +350ms; intensity = 10 fires third at +700ms

---

## Design System / Color Palette

Dark "space retro" aesthetic.

| Role | Color |
|------|-------|
| Page background | `#07071a` (near-black navy) |
| Nav background | `#0a0a22` |
| Filter bar background | `#09091e` |
| Body text / foreground | `#c8c4e0` (soft lavender) |
| Subtle text | `#6060a0` |
| Very subtle text | `#2e2e60` |
| Dividers / borders | `#1e1e4a` — `#1a1a44` |
| Card background | `#0d0d28` |
| Accent / progress bar | `#00e096` (teal green) |
| Info / score accent | `#00d4ff` (cyan) |
| Error / reset | `#ff3060` |
| Played overlay tint | semi-transparent teal |

**Font:** VT323 (Google Fonts) — loaded via `next/font/google` in `layout.tsx`, available as `--font-vt323` CSS variable.

**Scrollbar:** custom dark, 8px width, `#0d0d28` track, `#2a2a6a` thumb.

---

## next.config.ts

```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
    { protocol: "https", hostname: "upload.wikimedia.org" },
    { protocol: "https", hostname: "images.igdb.com" },
    { protocol: "https", hostname: "**.wikipedia.org" },
  ],
  unoptimized: true,
}
```

Note: `unoptimized: true` is set — this is intentional, since cover images are loaded dynamically and proxied.

---

## layout.tsx

```typescript
export const metadata = {
  title: "Top 100 Games Tracker",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://top-100-games.vercel.app"),
  // OpenGraph + Twitter card configured
}
```

Body style: `background: #07071a`, `color: #c8c4e0`, VT323 font.
`<main style={{ paddingTop: "72px" }}>` — offsets content below the 72px fixed nav.

---

## globals.css

Tailwind v4 setup:
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

Custom theme vars for shadcn/ui in both `:root` (light) and `.dark` — though the app always uses the dark background via inline styles, not the `.dark` class.

`html, body { height: 100%; overflow: hidden; }` — the page content scrolls inside a container, not the document body.

---

## Known Quirks / Gotchas

**Cover art pipeline is async and best-effort.** Some games will always show gradient placeholders because:
- No Steam App ID and no Wikipedia article with a usable infobox image
- Wikipedia article title doesn't match any of the 5 tried variants

To add a cover for a game manually: put the image in `public/`, set `coverUrl: "/filename.jpg"` in `data/games.json`.

**`html, body { overflow: hidden }` in globals.css** means the page scrolls inside its inner container div, not via the normal browser scroll. If you're debugging scroll behavior, check that container.

**`SortDropdown.tsx` may be a legacy component.** The active sort UI lives in `FilterBar.tsx` as an inline `<select>`. `SortDropdown` uses shadcn/ui `Select` and might not be wired up anymore.

**Platform filter dropdown** is portal-rendered (appended to `document.body`) so it escapes any `overflow: hidden` containers. Position is recalculated on scroll.

**Share export pre-fetches covers** in the background. If the user clicks Share immediately on load, some covers may still be loading. The export waits for all fetches to settle before rendering.

**`caseShape` field in games.json** is optional. Most games default to `"portrait"`. If a game renders oddly (landscape box art looks squished), add `"caseShape": "landscape"` or `"caseShape": "square"` to that game's entry in `data/games.json`.

---

## Environment Variables

| Variable | Used for |
|----------|----------|
| `NEXT_PUBLIC_SITE_URL` | OpenGraph metadataBase URL (optional; falls back to Vercel URL) |

No API keys required — Wikipedia API is open, Steam CDN URLs are public.

---

## Session Startup Checklist for New Claude Instance

1. Read this file
2. Read `about-me.md` and `working-style.md` from the Claude Context folder
3. The project folder is at: `Claude Code/metacritic-100/`
4. Run `npm run dev` (port 3001) to test locally
5. Before editing: read the specific component file(s) you'll be touching
6. The single source of truth for game data is `data/games.json` — edit there, not in code
7. Keep the dark space aesthetic consistent: color palette above, VT323 font everywhere
