import { supabase } from './client.js'

const STATE_ABBR: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY',
}

export interface Filters {
  trade?: string
  location_state?: string
  location_city?: string
  min_daily_rate?: number
  max_daily_rate?: number
  available_on?: string
  min_rating_overall?: number
  active?: boolean
  willing_to_travel?: boolean
  has_1099?: boolean
  skills?: string[]
  industries?: string[]
  languages?: string[]
  certifications?: string[]
}

export interface Review {
  id: string
  rating_overall: number
  rating_interpersonal: number
  rating_quality: number
  rating_professionalism: number
  rating_communication: number
  rating_reliability: number
  notes: string | null
}

export interface Contractor {
  id: string
  name: string
  trade: string
  location_city: string
  location_state: string
  daily_rate: number
  active: boolean
  willing_to_travel: boolean
  has_1099: boolean
  skills: string[]
  industries: string[]
  languages: string[]
  certifications: string[]
  bio: string | null
  available_from: string | null
  available_to: string | null
  reviews: Review[]
}

export async function fetchFilteredContractors(filters: Filters): Promise<Contractor[]> {
  // Default active=true unless caller explicitly passes false
  const activeFilter = filters.active ?? true

  let query = supabase
    .from('contractors')
    .select(`
      id, name, trade, location_city, location_state, daily_rate,
      active, willing_to_travel, has_1099, skills, industries,
      languages, certifications, bio, available_from, available_to,
      reviews (
        id, rating_overall, rating_interpersonal, rating_quality,
        rating_professionalism, rating_communication, rating_reliability,
        notes
      )
    `)
    .eq('active', activeFilter)

  if (filters.trade) query = query.ilike('trade', filters.trade)
  if (filters.location_state) {
    const state = filters.location_state.trim()
    const normalized = state.length === 2 ? state.toUpperCase() : STATE_ABBR[state.toLowerCase()] ?? state
    query = query.eq('location_state', normalized)
  }
  if (filters.location_city) query = query.ilike('location_city', filters.location_city)
  if (filters.min_daily_rate != null) query = query.gte('daily_rate', filters.min_daily_rate)
  if (filters.max_daily_rate != null) query = query.lte('daily_rate', filters.max_daily_rate)
  if (filters.willing_to_travel) query = query.eq('willing_to_travel', true)
  if (filters.has_1099) query = query.eq('has_1099', true)
  if (filters.skills?.length) query = query.overlaps('skills', filters.skills)
  if (filters.industries?.length) query = query.overlaps('industries', filters.industries)
  if (filters.languages?.length) query = query.overlaps('languages', filters.languages)
  if (filters.certifications?.length) query = query.overlaps('certifications', filters.certifications)

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch contractors: ${error.message}`)

  let contractors = (data ?? []) as Contractor[]

  // Availability date filter applied in-memory (requires date comparison)
  if (filters.available_on) {
    const target = new Date(filters.available_on)
    contractors = contractors.filter((c) => {
      if (c.available_from && new Date(c.available_from) > target) return false
      if (c.available_to && new Date(c.available_to) < target) return false
      return true
    })
  }

  return contractors
}
