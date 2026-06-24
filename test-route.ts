import { createClient } from './lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from './types/database'

async function test() {
  const supabase = (await createClient()) as unknown as SupabaseClient<Database>
  const { data } = await supabase.from('events').select('*')
  if (data) {
    const title = data[0].title
    console.log(title)
  }
}
