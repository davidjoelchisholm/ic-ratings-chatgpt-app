import type { ContractorWithRatings } from './ratings.js'
import type { RankingResult, RankingResponse } from './rankOpenAI.js'
import { selectRelevantReviews, type ReviewExcerpt } from './reviewRelevance.js'

export interface MatchResult {
  rank: number
  confidence: number
  reasoning: string
  id: string
  name: string
  trade: string
  location: string
  daily_rate: number
  avg_rating: number | null
  review_count: number
  willing_to_travel: boolean
  has_1099: boolean
  skills: string[]
  certifications: string[]
  languages: string[]
  relevant_reviews: ReviewExcerpt[]
}

export interface EliminatedResult {
  rank: number
  confidence: number
  reasoning: string
  name: string
  trade: string
  location: string
  daily_rate: number
}

export interface SearchOutput {
  summary: string
  total_in_pool: number
  strong_matches: MatchResult[]
  partial_matches: MatchResult[]
  eliminated: EliminatedResult[]
}

export function formatResults(
  ranking: RankingResponse,
  lookup: Map<string, ContractorWithRatings>,
  totalInPool: number,
): SearchOutput {
  const strong: MatchResult[] = []
  const partial: MatchResult[] = []
  const eliminated: EliminatedResult[] = []

  const sorted = [...ranking.results].sort((a, b) => a.rank - b.rank)

  for (const r of sorted) {
    const c = lookup.get(r.contractor_id)
    if (!c) continue

    if (r.confidence >= 80) {
      strong.push(buildMatch(r, c))
    } else if (r.confidence >= 50) {
      partial.push(buildMatch(r, c))
    } else {
      eliminated.push({
        rank: r.rank,
        confidence: r.confidence,
        reasoning: r.reasoning,
        name: c.name,
        trade: c.trade,
        location: `${c.location_city}, ${c.location_state}`,
        daily_rate: c.daily_rate,
      })
    }
  }

  // Cap partial matches at 5 — strong matches are always shown in full
  return {
    summary: ranking.summary,
    total_in_pool: totalInPool,
    strong_matches: strong,
    partial_matches: partial.slice(0, 5),
    eliminated,
  }
}

function buildMatch(r: RankingResult, c: ContractorWithRatings): MatchResult {
  return {
    rank: r.rank,
    confidence: r.confidence,
    reasoning: r.reasoning,
    id: c.id,
    name: c.name,
    trade: c.trade,
    location: `${c.location_city}, ${c.location_state}`,
    daily_rate: c.daily_rate,
    avg_rating: c.avg_overall,
    review_count: c.review_count,
    willing_to_travel: c.willing_to_travel,
    has_1099: c.has_1099,
    skills: c.skills ?? [],
    certifications: c.certifications ?? [],
    languages: c.languages ?? [],
    relevant_reviews: selectRelevantReviews(c.reviews),
  }
}
