import { supabase } from './client.js'

export interface VectorMatch {
  id: string
}

export async function matchContractors(
  queryEmbedding: number[],
  filterIds: string[],
  matchCount: number,
): Promise<VectorMatch[]> {
  const { data, error } = await supabase.rpc('match_contractors', {
    query_embedding: queryEmbedding,
    filter_ids: filterIds,
    match_count: matchCount,
  })

  if (error) throw new Error(`Vector search failed: ${error.message}`)

  return (data ?? []) as VectorMatch[]
}
