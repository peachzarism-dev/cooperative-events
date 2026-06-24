// app/(admin)/admin/dashboard/page.tsx

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateTH, formatDateTimeTH } from '@/lib/utils'
import {
  Calendar, Users, UserCheck, Shield,
  ChevronRight, TrendingUp, AlertCircle
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user!.id).single()

  // Stats
  const [
    { count: totalEvents },
    { count: openEvents },
    { count: totalRegistrations },
    { count: totalCheckins },
    { count: totalMembers },
    { count: totalStaff },
  ] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('events').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_registration_open', true),
    supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('check_ins').select('*', { count: 'exact', head: true }),
    supabase.from('cooperative_members').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  // Events with stats
  const { data: events } = await supabase
    .from('events')
    .select('id, title, start_date, is_registration_open, max_participants')
    .is('deleted_at', null)
    .order('start_date', { ascending: false })
    .limit(6)

  // Recent logs
  const { data: logs } = await supabase
    .from('activity_logs')
    .select('id, action, metadata, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(8)

  const actionLabels: Record<string, string> = {
    event_created: '➕ สร้างกิจกรรม',
    event_updated: '✏️ แก้ไขกิจกรรม',
    event_deleted: '🗑️ ลบกิจกรรม',
    registration_created: '📝 ลงทะเบียนใหม่',
    registration_cancelled: '❌ ยกเลิกการลงทะเบียน',
    checkin_completed: '✅ Check-in',
    draw_conducted: '🎁 สุ่มรางวัล',
    user_created: '👤 เพิ่มเจ้าหน้าที่',
    user_suspended: '🚫 ระงับเจ้าหน้าที่',
    user_activated: '✅ เปิดใช้งานเจ้าหน้าที่',
    member_imported: '📥 Import สมาชิก',
    member_updated: '✏️ แก้ไขข้อมูลสมาชิก',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">ภาพรวมระบบ</h1>
        <p className="text-gray-500 text-sm mt-0.5">สวัสดี, {profile?.full_name} · ผู้ดูแลระบบ</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'กิจกรรมทั้งหมด', value: totalEvents ?? 0, sub: `เปิดรับ ${openEvents ?? 0} กิจกรรม`, icon: <Calendar className="w-5 h-5" />, color: 'blue', href: '/admin/events' },
          { label: 'ผู้ลงทะเบียนรวม', value: totalRegistrations ?? 0, sub: `Check-in แล้ว ${totalCheckins ?? 0} คน`, icon: <Users className="w-5 h-5" />, color: 'green', href: '/admin/events' },
          { label: 'สมาชิกสหกรณ์', value: totalMembers ?? 0, sub: 'ในฐานข้อมูล', icon: <UserCheck className="w-5 h-5" />, color: 'yellow', href: '/admin/members' },
          { label: 'เจ้าหน้าที่ระบบ', value: totalStaff ?? 0, sub: 'บัญชีที่ใช้งาน', icon: <Shield className="w-5 h-5" />, color: 'purple', href: '/admin/users' },
          { label: 'Check-in ทั้งหมด', value: totalCheckins ?? 0, sub: 'ทุกกิจกรรม', icon: <TrendingUp className="w-5 h-5" />, color: 'teal', href: '/admin/events' },
        ].map(card => (
          <Link key={card.label} href={card.href} className="stat-card hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              card.color === 'blue' ? 'bg-primary-50 text-primary-600' :
              card.color === 'green' ? 'bg-success-50 text-success-600' :
              card.color === 'yellow' ? 'bg-amber-50 text-amber-600' :
              card.color === 'purple' ? 'bg-purple-50 text-purple-600' :
              'bg-teal-50 text-teal-600'
            }`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-3">{card.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events List */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">กิจกรรมล่าสุด</h2>
            <Link href="/admin/events" className="text-sm text-primary-600 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {events?.map(ev => (
              <Link key={ev.id} href={`/staff/events/${ev.id}/dashboard`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className={`w-2 h-2 rounded-full shrink-0 ${ev.is_registration_open ? 'bg-success-500' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{ev.title}</p>
                  <p className="text-xs text-gray-400">{formatDateTH(ev.start_date)}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">กิจกรรมล่าสุดในระบบ</h2>
            <Link href="/admin/logs" className="text-sm text-primary-600 hover:underline">ดูทั้งหมด →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {logs?.map(log => {
              const actor = (log as any).profiles?.full_name || 'ระบบ'
              const meta = log.metadata as any
              return (
                <div key={log.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">
                        {actionLabels[log.action] || log.action}
                        {meta?.title ? ` — ${meta.title}` : ''}
                        {meta?.full_name ? ` (${meta.full_name})` : ''}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{actor}</p>
                    </div>
                    <p className="text-xs text-gray-300 shrink-0 whitespace-nowrap">
                      {formatDateTimeTH(log.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
            {!logs?.length && (
              <p className="text-center text-gray-400 text-sm py-10">ยังไม่มี activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
