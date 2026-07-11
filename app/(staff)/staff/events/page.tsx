// app/(staff)/staff/events/page.tsx

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateTH } from '@/lib/utils'
import { Plus, Calendar, ToggleLeft, ToggleRight, ChevronRight, Search } from 'lucide-react'

export default async function StaffEventsPage({
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
      location,
      start_date,
      end_date,
      is_multi_day,
      is_registration_open,
      registration_round,
      max_participants,
      event_stats(total_registered, total_checked_in)
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
  const totalEvents = count || 0
  const totalPages = Math.max(Math.ceil(totalEvents / pageSize), 1)
  const firstItem = totalEvents === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalEvents)

  function pageHref(nextPage: number) {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (status !== 'all') params.set('status', status)
    if (nextPage > 1) params.set('page', nextPage.toString())
    return `/staff/events${params.toString() ? `?${params.toString()}` : ''}`
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">กิจกรรมทั้งหมด</h1>
          <p className="text-gray-500 text-sm mt-0.5">จัดการกิจกรรมและดูสถิติการลงทะเบียน</p>
        </div>
        <Link href="/staff/events/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          สร้างกิจกรรมใหม่
        </Link>
      </div>

      <form className="card p-4 mb-4 flex flex-wrap items-center gap-2">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          name="q"
          defaultValue={query}
          className="input flex-1 min-w-[220px]"
          placeholder="ค้นหากิจกรรม..."
        />
        <select name="status" defaultValue={status} className="input w-36">
          <option value="all">ทั้งหมด</option>
          <option value="open">เปิดรับ</option>
          <option value="closed">ปิดรับ</option>
        </select>
        <button type="submit" className="btn-primary text-sm px-4">ค้นหา</button>
        {(query || status !== 'all') && (
          <Link href="/staff/events" className="btn-secondary text-sm px-4">ล้าง</Link>
        )}
      </form>

      <div className="text-sm text-gray-500 px-1 mb-4">
        แสดง <strong>{firstItem}-{lastItem}</strong> จาก {totalEvents} กิจกรรม
      </div>

      {/* Events Grid */}
      {!events?.length ? (
        <div className="card p-16 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">ยังไม่มีกิจกรรม</p>
          <Link href="/staff/events/new" className="btn-primary inline-flex items-center gap-2 mt-4">
            <Plus className="w-4 h-4" /> สร้างกิจกรรมแรก
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map(event => {
            const stats = (event as any).event_stats?.[0]
            const isOpen = event.is_registration_open
            return (
              <div key={event.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isOpen ? (
                        <span className="badge-success"><ToggleRight className="w-3 h-3" />เปิดรับ</span>
                      ) : (
                        <span className="badge-gray"><ToggleLeft className="w-3 h-3" />ปิดรับ</span>
                      )}
                      {event.is_multi_day && <span className="badge-blue">หลายวัน</span>}
                      <span className="badge-gray text-xs">รอบ {event.registration_round}</span>
                    </div>
                    <h2 className="font-semibold text-gray-800 text-lg truncate">{event.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {event.start_date === event.end_date
                          ? formatDateTH(event.start_date)
                          : `${formatDateTH(event.start_date)} – ${formatDateTH(event.end_date)}`}
                      </span>
                      {event.location && <span className="truncate">📍 {event.location}</span>}
                    </div>
                  </div>

                  {/* Stats mini */}
                  {stats && (
                    <div className="hidden sm:flex items-center gap-6 shrink-0 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-800">
                          {stats.total_registered}
                          {event.max_participants ? <span className="text-sm text-gray-400">/{event.max_participants}</span> : ''}
                        </p>
                        <p className="text-xs text-gray-400">ลงทะเบียน</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-success-600">{stats.total_checked_in}</p>
                        <p className="text-xs text-gray-400">Check-in</p>
                      </div>
                    </div>
                  )}

                  <Link
                    href={`/staff/events/${event.id}/dashboard`}
                    className="btn-secondary flex items-center gap-1 shrink-0"
                  >
                    ดูข้อมูล <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card px-5 py-3 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-400">หน้า {page} จาก {totalPages}</p>
        <div className="flex gap-2">
          <Link
            href={pageHref(page - 1)}
            className={`btn-secondary text-sm px-4 ${page <= 1 ? 'opacity-50 pointer-events-none' : ''}`}
          >
            ก่อนหน้า
          </Link>
          <Link
            href={pageHref(page + 1)}
            className={`btn-secondary text-sm px-4 ${page >= totalPages ? 'opacity-50 pointer-events-none' : ''}`}
          >
            ถัดไป
          </Link>
        </div>
      </div>
    </div>
  )
}
