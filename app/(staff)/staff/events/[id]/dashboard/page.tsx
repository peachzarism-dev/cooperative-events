// app/(staff)/staff/events/[id]/dashboard/page.tsx

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDateTH, formatDateTimeTH, getRegistrationUrl, percent } from '@/lib/utils'
import Link from 'next/link'
import {
  Users, UserCheck, UserX, QrCode, Gift,
  Calendar, MapPin, ToggleLeft, ToggleRight,
  Download, Settings
} from 'lucide-react'
import EventDashboardClient from '@/components/dashboard/EventDashboardClient'
import ToggleRegistrationButton from '@/components/events/ToggleRegistrationButton'
import CopyUrlInput from '@/components/ui/CopyUrlInput'
import DashboardQR from '@/components/dashboard/DashboardQR'

export default async function EventDashboardPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*, event_days(*)')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!event) notFound()

  // ดึง profile เพื่อเช็ค role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  // ดึงสถิติ
  const { data: stats } = await supabase
    .from('event_stats')
    .select('*')
    .eq('event_id', params.id)
    .single()

  // ดึง check-ins ล่าสุด
  const { data: recentCheckIns } = await supabase
    .from('check_ins')
    .select(`
      id, checked_in_at,
      registrations(full_name, is_member),
      event_days(label)
    `)
    .eq('registrations.event_id', params.id)
    .order('checked_in_at', { ascending: false })
    .limit(10)

  const registrationUrl = getRegistrationUrl(event.slug)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/staff/events" className="text-gray-400 hover:text-gray-600 text-sm">
              กิจกรรมทั้งหมด
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600 truncate max-w-xs">{event.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {event.start_date === event.end_date
                ? formatDateTH(event.start_date)
                : `${formatDateTH(event.start_date)} – ${formatDateTH(event.end_date)}`}
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />{event.location}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Link href={`/staff/events/${event.id}/edit`} className="btn-secondary flex items-center gap-2 text-sm">
            <Settings className="w-4 h-4" /> แก้ไข
          </Link>
          <Link href={`/staff/checkin/${event.id}`} className="btn-primary flex items-center gap-2 text-sm">
            <QrCode className="w-4 h-4" /> Check-in
          </Link>
          <Link href={`/staff/draw/${event.id}`} className="btn-secondary flex items-center gap-2 text-sm bg-gold-500 text-white border-gold-500 hover:bg-gold-600">
            <Gift className="w-4 h-4" /> สุ่มรางวัล
          </Link>
        </div>
      </div>

      {/* Toggle + Registration Link */}
      <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <ToggleRegistrationButton event={event} />
          <div>
            <p className="text-sm font-medium text-gray-700">
              {event.is_registration_open ? 'เปิดรับลงทะเบียนอยู่' : 'ปิดรับลงทะเบียน'}
            </p>
            <p className="text-xs text-gray-400">รอบที่ {event.registration_round}</p>
          </div>
        </div>
        <CopyUrlInput url={registrationUrl} />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="ลงทะเบียนทั้งหมด"
          value={`${stats?.total_registered ?? 0}${event.max_participants ? `/${event.max_participants}` : ''}`}
          sub="คน"
          color="blue"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Check-in แล้ว"
          value={`${stats?.total_checked_in ?? 0}`}
          sub={`${percent(stats?.total_checked_in ?? 0, stats?.total_registered ?? 0)}%`}
          color="green"
          icon={<UserCheck className="w-5 h-5" />}
        />
        <StatCard
          label="ไม่มา (No-show)"
          value={`${stats?.total_no_show ?? 0}`}
          sub={`${percent(stats?.total_no_show ?? 0, stats?.total_registered ?? 0)}%`}
          color="red"
          icon={<UserX className="w-5 h-5" />}
        />
        <StatCard
          label="โควต้าคงเหลือ"
          value={event.max_participants ? `${stats?.quota_remaining ?? 0}` : '∞'}
          sub="ที่นั่ง"
          color="yellow"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="ยกเลิกแล้ว"
          value={`${stats?.total_cancelled ?? 0}`}
          sub="คน"
          color="gray"
          icon={<UserX className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time feed + QR */}
        <div className="lg:col-span-2 space-y-4">
          {/* Multi-day breakdown */}
          {event.is_multi_day && event.event_days && event.event_days.length > 0 && (
            <EventDashboardClient eventId={event.id} eventDays={event.event_days} />
          )}

          {/* Recent check-ins */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Check-in ล่าสุด</h2>
              <Link href={`/staff/events/${event.id}/registrations`} className="text-sm text-primary-600 hover:underline">
                ดูทั้งหมด →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {!recentCheckIns?.length ? (
                <p className="text-center text-gray-400 text-sm py-8">ยังไม่มีการ Check-in</p>
              ) : recentCheckIns.map(ci => {
                const reg = (ci as any).registrations
                const day = (ci as any).event_days
                return (
                  <div key={ci.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-8 h-8 rounded-full bg-success-100 flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4 text-success-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{reg?.full_name}</p>
                      <p className="text-xs text-gray-400">
                        {day?.label ? `${day.label} · ` : ''}
                        {formatDateTimeTH(ci.checked_in_at)}
                      </p>
                    </div>
                    <span className={reg?.is_member ? 'badge-blue' : 'badge-gray'}>
                      {reg?.is_member ? 'สมาชิก' : 'บุคคลทั่วไป'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* QR ลิงก์ลงทะเบียน */}
          <div className="card p-5 text-center">
            <p className="text-sm font-semibold text-gray-700 mb-3">QR ลิงก์ลงทะเบียน</p>
            <DashboardQR slug={event.slug} />
            <p className="text-xs text-gray-400 mt-3">สแกนเพื่อเข้าสู่หน้าลงทะเบียน</p>
          </div>

          {/* Export */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Export ข้อมูล</p>
            <ExportButton eventId={event.id} eventTitle={event.title} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub: string; color: string; icon: React.ReactNode
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-primary-50 text-primary-600',
    green: 'bg-success-50 text-success-600',
    red: 'bg-danger-50 text-danger-600',
    yellow: 'bg-amber-50 text-amber-600',
    gray: 'bg-gray-50 text-gray-500',
  }
  return (
    <div className="stat-card">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
      <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function ExportButton({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  return (
    <a
      href={`/api/export/${eventId}`}
      className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
    >
      <Download className="w-4 h-4" />
      ดาวน์โหลด Excel (.xlsx)
    </a>
  )
}
