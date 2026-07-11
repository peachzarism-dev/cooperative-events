// app/(admin)/admin/events/page.tsx

import { createClient } from '@/lib/supabase/server'
import AdminEventsClient from '@/components/events/AdminEventsClient'

export default async function AdminEventsPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select(`
      id,
      title,
      description,
      location,
      start_date,
      end_date,
      is_multi_day,
      max_participants,
      is_registration_open,
      registration_round,
      allow_public,
      slug,
      created_by,
      updated_by,
      deleted_at,
      draw_closed_at,
      draw_closed_by,
      created_at,
      updated_at,
      closed_message
    `)
    .is('deleted_at', null)
    .order('start_date', { ascending: false })

  // ดึงสถิติแยก
  const { data: stats } = await supabase
    .from('event_stats')
    .select('event_id, total_registered, total_checked_in, total_no_show, quota_remaining')

  const eventsWithStats = (events || []).map(ev => ({
    ...ev,
    stats: stats?.find(s => s.event_id === ev.id) || null,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">จัดการกิจกรรม</h1>
        <p className="text-gray-500 text-sm mt-0.5">ดู แก้ไข และลบกิจกรรม (เฉพาะ Admin)</p>
      </div>
      <AdminEventsClient events={eventsWithStats} />
    </div>
  )
}
