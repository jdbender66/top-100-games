import gamesData from "@/data/games.json"
import type { Game, Filters, SortKey } from "@/types/game"

export const ALL_GAMES: Game[] = gamesData as Game[]

export function getAllPlatforms(games: Game[]): string[] {
  return [...new Set(games.map((g) => g.platform))].sort()
}

export function getAllGenres(games: Game[]): string[] {
  return [...new Set(games.flatMap((g) => g.genres))].sort()
}

export function getAllDecades(games: Game[]): string[] {
  const decades = new Set(games.map((g) => `${Math.floor(g.year / 10) * 10}s`))
  return [...decades].sort()
}

export function filterGames(games: Game[], filters: Filters, playedIds: Set<string>): Game[] {
  return games.filter((game) => {
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase()
      if (
        !game.title.toLowerCase().includes(q) &&
        !game.developer.toLowerCase().includes(q) &&
        !game.platform.toLowerCase().includes(q)
      )
        return false
    }
    if (filters.platforms.length > 0 && !filters.platforms.includes(game.platform)) return false
    if (filters.genres.length > 0 && !filters.genres.some((g) => game.genres.includes(g))) return false
    if (filters.decades.length > 0) {
      const decade = `${Math.floor(game.year / 10) * 10}s`
      if (!filters.decades.includes(decade)) return false
    }
    if (filters.showPlayedOnly && !playedIds.has(game.id)) return false
    if (filters.showUnplayedOnly && playedIds.has(game.id)) return false
    return true
  })
}

export function sortGames(games: Game[], sortKey: SortKey): Game[] {
  const sorted = [...games]
  switch (sortKey) {
    case "rank":
      return sorted.sort((a, b) => a.rank - b.rank)
    case "score_desc":
      return sorted.sort((a, b) => b.metacriticScore - a.metacriticScore || a.rank - b.rank)
    case "year_asc":
      return sorted.sort((a, b) => a.year - b.year || a.rank - b.rank)
    case "year_desc":
      return sorted.sort((a, b) => b.year - a.year || a.rank - b.rank)
    case "title_az":
      return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case "platform":
      return sorted.sort((a, b) => a.platform.localeCompare(b.platform) || a.rank - b.rank)
    default:
      return sorted
  }
}
