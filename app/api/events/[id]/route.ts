// app/api/events/[id]/route.ts
// ใช้ server-side client เพื่อให้ RLS รู้จัก session ของ user

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  // ตรวจสอบว่า login แล้วและเป็น admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 })
  }

  // ดึงชื่อกิจกรรมก่อนลบ (สำหรับ log)
  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', params.id)
    .single()

  // Soft delete
  const { error } = await supabase
    .from('events')
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', params.id)
    .is('deleted_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // บันทึก activity log
  await supabase.from('activity_logs').insert({
    actor_id: user.id,
    action: 'event_deleted',
    target_type: 'event',
    target_id: params.id,
    metadata: { title: event?.title },
  })

  return NextResponse.json({ success: true })
}
