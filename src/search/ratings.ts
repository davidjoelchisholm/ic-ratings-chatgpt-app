import type { Contractor, Review } from '../supabase/contractors.js'

export interface ContractorWithRatings extends Contractor {
  avg_overall: number | null
  avg_interpersonal: number | null
  avg_quality: number | null
  avg_professionalism: number | null
  avg_communication: number | null
  avg_reliability: number | null
  review_count: number
}

export function computeRatings(contractor: Contractor): ContractorWithRatings {
  const reviews = contractor.reviews ?? []
  if (reviews.length === 0) {
    return {
      ...contractor,
      avg_overall: null,
      avg_interpersonal: null,
      avg_quality: null,
      avg_professionalism: null,
      avg_communication: null,
      avg_reliability: null,
      review_count: 0,
    }
  }

  const n = reviews.length
  const avg = (field: keyof Review) =>
    parseFloat((reviews.reduce((s, r) => s + ((r[field] as number) ?? 0), 0) / n).toFixed(1))

  return {
    ...contractor,
    avg_overall: avg('rating_overall'),
    avg_interpersonal: avg('rating_interpersonal'),
    avg_quality: avg('rating_quality'),
    avg_professionalism: avg('rating_professionalism'),
    avg_communication: avg('rating_communication'),
    avg_reliability: avg('rating_reliability'),
    review_count: n,
  }
}
