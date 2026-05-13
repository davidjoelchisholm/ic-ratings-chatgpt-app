import { supabase } from '../supabase/client.js'

export async function checkUserAccess(email: string): Promise<void> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (error) throw new Error(`User lookup failed: ${error.message}`)
  if (!data) throw new Error('Access denied: email not registered')
}
