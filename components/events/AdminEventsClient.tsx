'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { formatDateTH } from '@/lib/utils'
import {
  Calendar, Users, UserCheck, Trash2, Settings,
  BarChart2, ToggleRight, ToggleLeft, Plus, Search
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Event } from '@/types/database'

interface EventWithStats extends Event {
  stats: {
    total_registered: number
    total_checked_in: number
    total_no_show: number
    quota_remaining: number | null
  } | null
}

export default function AdminEventsClient({
  events: initialEvents,
  totalEvents,
  page,
  pageSize,
  query,
  status,
}: {
  events: EventWithStats[]
  totalEvents: number
  page: number
  pageSize: number
  query: string
  status: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [events, setEvents] = useState(initialEvents)
  const [search, setSearch] = useState(query)
  const [statusFilter, setStatusFilter] = useState(status)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setEvents(initialEvents)
    setSearch(query)
    setStatusFilter(status)
  }, [initialEvents, query, status])

  const totalPages = Math.max(Math.ceil(totalEvents / pageSize), 1)
  const firstItem = totalEvents === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalEvents)

  function goToPage(nextPage: number, nextQuery = search, nextStatus = statusFilter) {
    const params = new URLSearchParams()
    if (nextQuery.trim()) params.set('q', nextQuery.trim())
    if (nextStatus !== 'all') params.set('status', nextStatus)
    if (nextPage > 1) params.set('page', nextPage.toString())
    router.push(`/admin/events${params.toString() ? `?${params.toString()}` : ''}`)
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    goToPage(1)
  }

  async function deleteEvent(ev: EventWithStats) {
    const confirmed = confirm(
      `⚠️ ลบกิจกรรม "${ev.title}" ?\n\nการลบจะซ่อนกิจกรรมนี้ออกจากระบบ (Soft Delete)\nข้อมูลการลงทะเบียนจะยังคงอยู่`
    )
    if (!confirmed) return

    setDeletingId(ev.id)

    const res = await fetch(`/api/events/${ev.id}`, { method: 'DELETE' })

    if (!res.ok) {
      const err = await res.json()
      toast.error('ลบไม่สำเร็จ: ' + (err.error || 'เกิดข้อผิดพลาด'))
    } else {
      setEvents(prev => prev.filter(e => e.id !== ev.id))
      toast.success(`ลบกิจกรรม "${ev.title}" แล้ว`)
    }
    setDeletingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <form onSubmit={submitSearch} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto_auto]">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9"
                placeholder="ค้นหากิจกรรม..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value)
                goToPage(1, search, e.target.value)
              }}
              className="input"
            >
              <option value="all">ทั้งหมด</option>
              <option value="open">เปิดรับ</option>
              <option value="closed">ปิดรับ</option>
            </select>
            <button type="submit" className="btn-primary text-sm px-4 whitespace-nowrap">ค้นหา</button>
            {(query || status !== 'all') && (
              <button type="button" onClick={() => goToPage(1, '', 'all')} className="btn-secondary text-sm px-4 whitespace-nowrap">
                ล้าง
              </button>
            )}
          </form>
          <Link href="/staff/events/new" className="btn-primary flex items-center justify-center gap-2 text-sm whitespace-nowrap lg:justify-self-end">
          <Plus className="w-4 h-4" /> สร้างกิจกรรมใหม่
          </Link>
        </div>
      </div>

      <div className="text-sm text-gray-500 px-1">
        แสดง <strong>{firstItem}-{lastItem}</strong> จาก {totalEvents} กิจกรรม
      </div>

      {/* Events Grid */}
      {!events.length ? (
        <div className="card p-16 text-center">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">ไม่พบกิจกรรม</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map(ev => (
            <div key={ev.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {ev.is_registration_open ? (
                      <span className="badge-success flex items-center gap-1">
                        <ToggleRight className="w-3 h-3" /> เปิดรับ
                      </span>
                    ) : (
                      <span className="badge-gray flex items-center gap-1">
                        <ToggleLeft className="w-3 h-3" /> ปิดรับ
                      </span>
                    )}
                    {ev.is_multi_day && <span className="badge-blue">หลายวัน</span>}
                    {!ev.allow_public && <span className="badge-gray">สมาชิกเท่านั้น</span>}
                    <span className="badge-gray text-xs">รอบ {ev.registration_round}</span>
                  </div>
                  <h2 className="font-semibold text-gray-800 text-base">{ev.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {ev.start_date === ev.end_date
                        ? formatDateTH(ev.start_date)
                        : `${formatDateTH(ev.start_date)} – ${formatDateTH(ev.end_date)}`}
                    </span>
                    {ev.location && <span>📍 {ev.location}</span>}
                  </div>
                </div>

                {/* Stats */}
                {ev.stats && (
                  <div className="flex items-center gap-5 text-center shrink-0">
                    <div>
                      <p className="text-xl font-bold text-gray-800">
                        {ev.stats.total_registered}
                        {ev.max_participants && (
                          <span className="text-sm text-gray-400">/{ev.max_participants}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">ลงทะเบียน</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-success-600">{ev.stats.total_checked_in}</p>
                      <p className="text-xs text-gray-400">Check-in</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-danger-500">{ev.stats.total_no_show}</p>
                      <p className="text-xs text-gray-400">ไม่มา</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/staff/events/${ev.id}/dashboard`}
                    className="btn-secondary flex items-center gap-1.5 text-sm py-1.5"
                    title="ดู Dashboard"
                  >
                    <BarChart2 className="w-4 h-4" /> Dashboard
                  </Link>
                  <Link
                    href={`/staff/events/${ev.id}/edit`}
                    className="btn-secondary p-1.5"
                    title="แก้ไขกิจกรรม"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => deleteEvent(ev)}
                    disabled={deletingId === ev.id}
                    className={cn(
                      'p-1.5 rounded-lg border border-transparent transition-all',
                      'text-danger-400 hover:text-danger-600 hover:bg-danger-50 hover:border-danger-200',
                      deletingId === ev.id && 'opacity-50 cursor-not-allowed'
                    )}
                    title="ลบกิจกรรม"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-400">หน้า {page} จาก {totalPages}</p>
        <div className="flex gap-2">
          <button
            onClick={() => goToPage(page - 1, query, status)}
            disabled={page <= 1}
            className="btn-secondary text-sm px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ก่อนหน้า
          </button>
          <button
            onClick={() => goToPage(page + 1, query, status)}
            disabled={page >= totalPages}
            className="btn-secondary text-sm px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ถัดไป
          </button>
        </div>
      </div>
    </div>
  )
}
