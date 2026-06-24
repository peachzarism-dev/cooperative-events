// app/(admin)/admin/events/page.tsx

import { createClient } from '@/lib/supabase/server'
import AdminEventsClient from '@/components/events/AdminEventsClient'

export default async function AdminEventsPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .is('deleted_at', null)
    .order('start_date', { ascending: false })

  // ดึงสถิติแยก
  const { data: stats } = await supabase
    .from('event_stats')
    .select('*')

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
