export interface Game {
  id: string
  rank: number
  title: string
  developer: string
  publisher: string
  platform: string
  year: number
  metacriticScore: number
  genres: string[]
  coverUrl: string
  steamAppId: number | null
  wikiTitle?: string
  caseShape?: "portrait" | "landscape" | "square"
}

export type SortKey = "rank" | "year_asc" | "year_desc" | "title_az" | "score_desc" | "platform"

export interface Filters {
  searchQuery: string
  platforms: string[]
  decades: string[]
  genres: string[]
  showPlayedOnly: boolean
  showUnplayedOnly: boolean
}

export const DEFAULT_FILTERS: Filters = {
  searchQuery: "",
  platforms: [],
  decades: [],
  genres: [],
  showPlayedOnly: false,
  showUnplayedOnly: false,
}
