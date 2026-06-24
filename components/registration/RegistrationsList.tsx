'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, CheckCircle, XCircle, Clock, UserX, Download } from 'lucide-react'
import { formatDateTimeTH } from '@/lib/utils'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type FilterType = 'all' | 'active' | 'checked_in' | 'no_show' | 'cancelled'

interface Registration {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  is_member: boolean
  status: string
  registered_at: string
  cancelled_at: string | null
  cancelled_by: string | null
  cooperative_members: { member_no: string } | null
  check_ins: { id: string; checked_in_at: string; event_days: { label: string } | null }[]
}

interface Props {
  initialRegistrations: Registration[]
  eventId: string
  eventTitle: string
}

export default function RegistrationsList({ initialRegistrations, eventId, eventTitle }: Props) {
  const supabase = createClient()
  const [registrations, setRegistrations] = useState(initialRegistrations)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const filtered = registrations.filter(r => {
    const matchSearch =
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.phone || '').includes(search) ||
      (r.cooperative_members?.member_no || '').includes(search)

    const isCheckedIn = r.check_ins?.length > 0
    const matchFilter =
      filter === 'all' ||
      (filter === 'active' && r.status === 'active') ||
      (filter === 'checked_in' && r.status === 'active' && isCheckedIn) ||
      (filter === 'no_show' && r.status === 'active' && !isCheckedIn) ||
      (filter === 'cancelled' && r.status === 'cancelled')

    return matchSearch && matchFilter
  })

  async function cancelRegistration(reg: Registration) {
    const confirmed = confirm(`ยืนยันยกเลิกการลงทะเบียนของ "${reg.full_name}"?`)
    if (!confirmed) return

    setCancellingId(reg.id)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('registrations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'staff',
        cancelled_by_user_id: user?.id,
      })
      .eq('id', reg.id)

    if (error) {
      toast.error('ยกเลิกไม่สำเร็จ')
    } else {
      setRegistrations(prev =>
        prev.map(r => r.id === reg.id
          ? { ...r, status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'staff' }
          : r
        )
      )
      // Log
      await supabase.from('activity_logs').insert({
        actor_id: user?.id,
        action: 'registration_cancelled',
        target_type: 'registration',
        target_id: reg.id,
        metadata: { cancelled_by: 'staff', full_name: reg.full_name, event_id: eventId },
      })
      toast.success(`ยกเลิกการลงทะเบียนของ ${reg.full_name} แล้ว`)
    }
    setCancellingId(null)
  }

  const counts = {
    all: registrations.length,
    active: registrations.filter(r => r.status === 'active').length,
    checked_in: registrations.filter(r => r.status === 'active' && r.check_ins?.length > 0).length,
    no_show: registrations.filter(r => r.status === 'active' && !r.check_ins?.length).length,
    cancelled: registrations.filter(r => r.status === 'cancelled').length,
  }

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: `ทั้งหมด (${counts.all})` },
    { key: 'active', label: `ลงทะเบียน (${counts.active})` },
    { key: 'checked_in', label: `Check-in แล้ว (${counts.checked_in})` },
    { key: 'no_show', label: `ไม่มา (${counts.no_show})` },
    { key: 'cancelled', label: `ยกเลิก (${counts.cancelled})` },
  ]

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
            placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร, เลขสมาชิก..."
          />
        </div>
        <a
          href={`/api/export/${eventId}`}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" /> Export Excel
        </a>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 flex-wrap">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              filter === tab.key
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-4 py-3">ชื่อ-นามสกุล</th>
                <th className="text-left px-4 py-3">ติดต่อ</th>
                <th className="text-left px-4 py-3">ประเภท</th>
                <th className="text-left px-4 py-3">วันที่ลงทะเบียน</th>
                <th className="text-left px-4 py-3">สถานะ</th>
                <th className="text-left px-4 py-3">Check-in</th>
                <th className="text-left px-4 py-3">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : filtered.map(reg => {
                const isCheckedIn = reg.check_ins?.length > 0
                const isCancelled = reg.status === 'cancelled'
                return (
                  <tr key={reg.id} className={cn('hover:bg-gray-50 transition-colors', isCancelled && 'opacity-50')}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{reg.full_name}</p>
                      {reg.cooperative_members?.member_no && (
                        <p className="text-xs text-gray-400">#{reg.cooperative_members.member_no}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <p>{reg.phone || '-'}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[160px]">{reg.email || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {reg.is_member
                        ? <span className="badge-blue">สมาชิก</span>
                        : <span className="badge-gray">บุคคลทั่วไป</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDateTimeTH(reg.registered_at)}
                    </td>
                    <td className="px-4 py-3">
                      {isCancelled ? (
                        <span className="badge-danger flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" />
                          ยกเลิก{reg.cancelled_by === 'staff' ? ' (Staff)' : ''}
                        </span>
                      ) : isCheckedIn ? (
                        <span className="badge-success flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" /> Check-in
                        </span>
                      ) : (
                        <span className="badge-gray flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" /> รอ Check-in
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {isCheckedIn && reg.check_ins[0] ? (
                        <div>
                          <p>{formatDateTimeTH(reg.check_ins[0].checked_in_at)}</p>
                          {reg.check_ins[0].event_days && (
                            <p className="text-gray-300">{reg.check_ins[0].event_days.label}</p>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {!isCancelled && !isCheckedIn && (
                        <button
                          onClick={() => cancelRegistration(reg)}
                          disabled={cancellingId === reg.id}
                          className="flex items-center gap-1 text-xs text-danger-500 hover:text-danger-700 font-medium disabled:opacity-50"
                          title="ยกเลิกการลงทะเบียน"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          {cancellingId === reg.id ? 'กำลังยกเลิก...' : 'ยกเลิก'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          แสดง {filtered.length} จาก {registrations.length} รายการ
        </div>
      </div>
    </div>
  )
}
