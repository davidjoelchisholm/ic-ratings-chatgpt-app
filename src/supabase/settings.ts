import { supabase } from './client.js'

export async function fetchSearchInstructions(): Promise<string | null> {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'ai_search_instructions')
    .single()

  return data?.value?.trim() || null
}
