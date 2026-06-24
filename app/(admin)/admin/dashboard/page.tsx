// app/(admin)/admin/events/page.tsx

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateTH } from '@/lib/utils'
import { Calendar, Users, Plus, ChevronRight } from 'lucide-react'

// 1. กำหนด Interface เพื่อระบุโครงสร้างข้อมูลให้ชัดเจน ป้องกัน Type Error
interface AdminEvent {
  id: string | number;
  title: string;
  start_date: string;
  is_registration_open: boolean;
  max_participants: number | null;
}

interface EventStat {
  event_id: string | number;
  // เพิ่ม field อื่นๆ ของ stats ที่คุณมีตรงนี้ได้ เช่น total_registered: number;
  [key: string]: any; 
}

export default async function AdminEventsPage() {
  const supabase = await createClient()

  // ดึงข้อมูลกิจกรรมทั้งหมด
  const { data: eventsData } = await supabase
    .from('events')
    .select('id, title, start_date, is_registration_open, max_participants')
    .is('deleted_at', null)
    .order('start_date', { ascending: false })

  const events = eventsData as AdminEvent[] | null

  // สมมติว่ามีตัวแปร stats ดึงมาจากฐานข้อมูล (อ้างอิงตามโค้ดเดิมของคุณ)
  // หมายเหตุ: ตรงนี้ปรับให้สอดคล้องกับวิธีดึงข้อมูล stats จริงในไฟล์ของคุณได้เลยครับ
  const { data: statsData } = await supabase
    .from('event_stats') // เปลี่ยนชื่อ table ให้ตรงกับระบบจริงของคุณ
    .select('*')

  const stats = statsData as EventStat[] | null

  // 2. แก้ไขจุดเชื่อมโยงข้อมูลโดยระบุ Type (ev: any) หรือ (ev: AdminEvent) 
  // เพื่อป้องกันข้อผิดพลาด Spread types may only be created from object types
  const eventsWithStats = (events || []).map((ev: any) => ({
    ...ev,
    stats: stats?.find(s => s.event_id === ev.id) || null,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">จัดการกิจกรรม</h1>
          <p className="text-gray-500 text-sm mt-0.5">สร้างและแก้ไขกิจกรรมทั้งหมดในระบบ</p>
        </div>
        <Link 
          href="/admin/events/create" 
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          สร้างกิจกรรมใหม่
        </Link>
      </div>

      {/* Events List/Table */}
      <div className="card divide-y divide-gray-100 overflow-hidden">
        {eventsWithStats.length > 0 ? (
          eventsWithStats.map(ev => (
            <Link 
              key={ev.id} 
              href={`/admin/events/${ev.id}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${ev.is_registration_open ? 'bg-success-500' : 'bg-gray-300'}`} />
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-800 hover:text-primary-600 transition-colors">{ev.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateTH(ev.start_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      จำกัด {ev.max_participants ? `${ev.max_participants} คน` : 'ไม่จำกัด'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-50">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  ev.is_registration_open 
                    ? 'bg-success-50 text-success-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {ev.is_registration_open ? 'เปิดลงทะเบียน' : 'ปิดลงทะเบียน'}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">
            ยังไม่มีข้อมูลกิจกรรมในระบบ
          </div>
        )}
      </div>
    </div>
  )
}