// app/(admin)/admin/events/page.tsx

import { createClient } from '@/lib/supabase/server'
import AdminEventsClient from '@/components/events/AdminEventsClient'

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string; status?: string }
}) {
  const supabase = await createClient()
  const pageSize = 20
  const query = (searchParams?.q || '').trim()
  const status = searchParams?.status || 'all'
  const page = Math.max(Number(searchParams?.page || '1'), 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let eventsQuery = supabase
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
    `, { count: 'exact' })
    .is('deleted_at', null)
    .order('start_date', { ascending: false })
    .range(from, to)

  if (query) {
    const safeQuery = query.replace(/[,()]/g, ' ')
    eventsQuery = eventsQuery.or(`title.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%`)
  }

  if (status === 'open') {
    eventsQuery = eventsQuery.eq('is_registration_open', true)
  } else if (status === 'closed') {
    eventsQuery = eventsQuery.eq('is_registration_open', false)
  }

  const { data: events, count } = await eventsQuery
  const eventIds = (events || []).map(ev => ev.id)

  const { data: stats } = await supabase
    .from('event_stats')
    .select('event_id, total_registered, total_checked_in, total_no_show, quota_remaining')
    .in('event_id', eventIds.length ? eventIds : ['00000000-0000-0000-0000-000000000000'])

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
      <AdminEventsClient
        events={eventsWithStats as any}
        totalEvents={count || 0}
        page={page}
        pageSize={pageSize}
        query={query}
        status={status}
      />
    </div>
  )
}
