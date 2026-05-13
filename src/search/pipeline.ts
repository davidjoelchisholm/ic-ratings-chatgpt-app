import { fetchFilteredContractors, type Filters } from '../supabase/contractors.js'
import { fetchSearchInstructions } from '../supabase/settings.js'
import { matchContractors } from '../supabase/vectorSearch.js'
import { generateEmbedding } from './embeddings.js'
import { computeRatings, type ContractorWithRatings } from './ratings.js'
import { rankWithOpenAI } from './rankOpenAI.js'
import { rankWithClaude } from './rankClaude.js'
import { formatResults, type SearchOutput } from './formatResults.js'

export type Provider = 'openai' | 'claude'

export interface PipelineInput {
  provider: Provider
  query: string
  filters?: Filters
}

const NO_RESULTS_MESSAGE =
  'There are no contractors that match your filtered criteria. Try widening your filter.'

export async function runSearchPipeline(input: PipelineInput): Promise<SearchOutput | { message: string }> {
  const { provider, query, filters = {} } = input

  // 1. Fetch contractors with DB-level filters applied
  const raw = await fetchFilteredContractors(filters)
  if (raw.length === 0) return { message: NO_RESULTS_MESSAGE }

  // 2. Compute ratings from raw review rows (no stored avg_rating column)
  const contractors = raw.map(computeRatings)

  // 3. Apply in-memory filter for min_rating_overall (needs computed avg)
  const pool = filters.min_rating_overall != null
    ? contractors.filter((c) => c.avg_overall != null && c.avg_overall >= filters.min_rating_overall!)
    : contractors

  if (pool.length === 0) return { message: NO_RESULTS_MESSAGE }

  // 4. Generate embedding for the query
  const embedding = await generateEmbedding(query)

  // 5. Vector search against pre-filtered contractor IDs only
  const filterIds = pool.map((c) => c.id)
  const matches = await matchContractors(embedding, filterIds, Math.min(filterIds.length, 50))
  if (matches.length === 0) return { message: NO_RESULTS_MESSAGE }

  // 6. Build candidate set in vector-ranked order
  const lookup = new Map<string, ContractorWithRatings>(pool.map((c) => [c.id, c]))
  const candidates = matches.map((m) => lookup.get(m.id)).filter((c): c is ContractorWithRatings => c != null)

  // 7. Read admin instructions
  const instructions = await fetchSearchInstructions()

  // 8. Rank candidates with chosen LLM
  const ranking =
    provider === 'claude'
      ? await rankWithClaude(query, candidates, instructions)
      : await rankWithOpenAI(query, candidates, instructions)

  // 9. Format and return structured output
  return formatResults(ranking, lookup, pool.length)
}
