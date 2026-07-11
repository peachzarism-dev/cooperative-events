// app/(admin)/admin/users/page.tsx

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsersClient from '@/components/members/UsersClient'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/staff/dashboard')

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, last_login, created_at, updated_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">จัดการเจ้าหน้าที่</h1>
        <p className="text-gray-500 text-sm mt-0.5">เพิ่ม/ระงับบัญชีเจ้าหน้าที่</p>
      </div>
      <UsersClient initialUsers={users || []} />
    </div>
  )
}
