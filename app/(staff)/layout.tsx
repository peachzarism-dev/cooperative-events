// app/(staff)/layout.tsx — Layout สำหรับ Staff และ Admin

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StaffSidebar from '@/components/ui/StaffSidebar'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) redirect('/login?error=suspended')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <StaffSidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
