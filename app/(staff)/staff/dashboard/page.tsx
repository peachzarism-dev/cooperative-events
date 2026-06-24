// app/(staff)/staff/dashboard/page.tsx

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateTH } from '@/lib/utils'
import { Calendar, Users, UserCheck, Plus, ChevronRight, QrCode, Gift } from 'lucide-react'

export default async function StaffDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('full_name, role').eq('id', user!.id).single()

  // กิจกรรมทั้งหมด (ไม่ถูกลบ)
  const { data: events } = await supabase
    .from('events')
    .select('id, title, start_date, is_registration_open, is_multi_day, max_participants')
    .is('deleted_at', null)
    .order('start_date', { ascending: false })
    .limit(5)

  // สถิติรวม
  const { count: totalEvents } = await supabase
    .from('events').select('*', { count: 'exact', head: true }).is('deleted_at', null)

  const { count: totalRegistrations } = await supabase
    .from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'active')

  const { count: totalCheckins } = await supabase
    .from('check_ins').select('*', { count: 'exact', head: true })

  const { count: openEvents } = await supabase
    .from('events').select('*', { count: 'exact', head: true })
    .is('deleted_at', null).eq('is_registration_open', true)

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          สวัสดี, {(profile as any)?.full_name || user?.email || ''} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {(profile as any)?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'} · ภาพรวมระบบลงทะเบียนกิจกรรม
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'กิจกรรมทั้งหมด', value: totalEvents ?? 0, icon: <Calendar className="w-5 h-5" />, color: 'blue' },
          { label: 'กำลังเปิดรับสมัคร', value: openEvents ?? 0, icon: <Calendar className="w-5 h-5" />, color: 'green' },
          { label: 'ผู้ลงทะเบียนรวม', value: totalRegistrations ?? 0, icon: <Users className="w-5 h-5" />, color: 'yellow' },
          { label: 'Check-in รวม', value: totalCheckins ?? 0, icon: <UserCheck className="w-5 h-5" />, color: 'purple' },
        ].map(card => (
          <div key={card.label} className="stat-card">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              card.color === 'blue' ? 'bg-primary-50 text-primary-600' :
              card.color === 'green' ? 'bg-success-50 text-success-600' :
              card.color === 'yellow' ? 'bg-amber-50 text-amber-600' :
              'bg-purple-50 text-purple-600'
            }`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-800 mt-3">{card.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/staff/events/new"
          className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center group-hover:bg-primary-700 transition-colors">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">สร้างกิจกรรมใหม่</p>
            <p className="text-xs text-gray-400">เพิ่มกิจกรรมและเปิดรับสมัคร</p>
          </div>
        </Link>

        <Link href="/staff/events"
          className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 rounded-xl bg-success-600 flex items-center justify-center group-hover:bg-success-700 transition-colors">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Check-in กิจกรรม</p>
            <p className="text-xs text-gray-400">สแกน QR Code ผู้เข้าร่วม</p>
          </div>
        </Link>

        <Link href="/staff/events"
          className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center group-hover:bg-amber-600 transition-colors">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">สุ่มรางวัล</p>
            <p className="text-xs text-gray-400">Lucky Draw สำหรับผู้เข้าร่วม</p>
          </div>
        </Link>
      </div>

      {/* Recent Events */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">กิจกรรมล่าสุด</h2>
          <Link href="/staff/events" className="text-sm text-primary-600 hover:underline">
            ดูทั้งหมด →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {!events?.length ? (
            <p className="text-center text-gray-400 text-sm py-10">ยังไม่มีกิจกรรม</p>
          ) : events.map(ev => (
            <Link
              key={ev.id}
              href={`/staff/events/${ev.id}/dashboard`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${ev.is_registration_open ? 'bg-success-500' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{ev.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDateTH(ev.start_date)}
                  {ev.max_participants ? ` · รับ ${ev.max_participants} คน` : ''}
                </p>
              </div>
              <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                ev.is_registration_open ? 'bg-success-50 text-success-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {ev.is_registration_open ? 'เปิดรับ' : 'ปิดรับ'}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
