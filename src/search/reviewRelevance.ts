import type { Review } from '../supabase/contractors.js'

export interface ReviewExcerpt {
  excerpt: string
  rating_overall: number
}

// The reviews table has no embedding column yet. We select the top reviews by overall
// rating (most impressive reviews give the best signal). Future: add a reviews.embedding
// column and replace this with cosine similarity against the query embedding.
export function selectRelevantReviews(reviews: Review[], limit = 3): ReviewExcerpt[] {
  return reviews
    .filter((r) => r.notes?.trim())
    .sort((a, b) => b.rating_overall - a.rating_overall)
    .slice(0, limit)
    .map((r) => ({
      excerpt: r.notes!.trim(),
      rating_overall: r.rating_overall,
    }))
}
