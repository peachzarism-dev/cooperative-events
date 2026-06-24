'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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

export default function AdminEventsClient({ events: initialEvents }: { events: EventWithStats[] }) {
  const supabase = createClient()
  const [events, setEvents] = useState(initialEvents)
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    (e.location || '').toLowerCase().includes(search.toLowerCase())
  )

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
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            placeholder="ค้นหากิจกรรม..."
          />
        </div>
        <Link href="/staff/events/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> สร้างกิจกรรมใหม่
        </Link>
      </div>

      {/* Events Grid */}
      {!filtered.length ? (
        <div className="card p-16 text-center">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">ไม่พบกิจกรรม</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(ev => (
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
    </div>
  )
}
