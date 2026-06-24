// app/api/admin/users/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createAdminClient()
  const { email, full_name, password, role = 'staff' } = await req.json()

  if (!email || !full_name || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // ตรวจสอบว่า requester เป็น admin
  const { data: { user: requester } } = await supabase.auth.getUser()
  if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: requesterProfile } = await supabase
    .from('profiles').select('role').eq('id', requester.id).single()
  if (requesterProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // สร้าง user ใน Auth
  const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Profile จะถูกสร้างอัตโนมัติผ่าน trigger
  // ดึง profile ที่เพิ่งสร้าง
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', newUser.user.id)
    .single()

  // Log
  await supabase.from('activity_logs').insert({
    actor_id: requester.id,
    action: 'user_created',
    target_type: 'user',
    target_id: newUser.user.id,
    metadata: { email, full_name, role },
  })

  return NextResponse.json({ profile })
}
