// app/(admin)/admin/members/page.tsx

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MembersClient from '@/components/members/MembersClient'

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'admin') redirect('/staff/dashboard')

  const pageSize = 50
  const query = (searchParams?.q || '').trim()
  const page = Math.max(Number(searchParams?.page || '1'), 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let membersQuery = supabase
    .from('cooperative_members')
    .select('id, member_no, full_name, phone, email, is_active, created_at, updated_at', { count: 'exact' })
    .order('member_no')
    .range(from, to)

  if (query) {
    const safeQuery = query.replace(/[,()]/g, ' ')
    membersQuery = membersQuery.or(
      `member_no.ilike.%${safeQuery}%,full_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`
    )
  }

  const { data: members, count } = await membersQuery

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">ฐานข้อมูลสมาชิกสหกรณ์</h1>
          <p className="text-gray-500 text-sm mt-0.5">จัดการข้อมูลสมาชิก / Import CSV</p>
        </div>
      </div>
      <MembersClient
        initialMembers={members || []}
        totalMembers={count || 0}
        page={page}
        pageSize={pageSize}
        query={query}
      />
    </div>
  )
}
