// lib/supabase/client.ts
// Supabase client สำหรับใช้ใน Client Components (browser)

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { SupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as SupabaseClient<Database>
}
