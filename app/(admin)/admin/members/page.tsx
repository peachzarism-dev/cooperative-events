// app/(admin)/admin/members/page.tsx

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MembersClient from '@/components/members/MembersClient'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'admin') redirect('/staff/dashboard')

  const { data: members } = await supabase
    .from('cooperative_members')
    .select('*')
    .order('member_no')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ฐานข้อมูลสมาชิกสหกรณ์</h1>
          <p className="text-gray-500 text-sm mt-0.5">จัดการข้อมูลสมาชิก / Import CSV</p>
        </div>
      </div>
      <MembersClient initialMembers={members || []} />
    </div>
  )
}
