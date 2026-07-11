// app/(admin)/admin/logs/page.tsx

import { createClient } from '@/lib/supabase/server'
import { formatDateTimeTH } from '@/lib/utils'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  event_created:          { label: '➕ สร้างกิจกรรม',           color: 'blue' },
  event_updated:          { label: '✏️ แก้ไขกิจกรรม',           color: 'yellow' },
  event_deleted:          { label: '🗑️ ลบกิจกรรม',             color: 'red' },
  registration_created:   { label: '📝 ลงทะเบียนใหม่',          color: 'green' },
  registration_cancelled: { label: '❌ ยกเลิกการลงทะเบียน',    color: 'red' },
  checkin_completed:      { label: '✅ Check-in',               color: 'green' },
  draw_conducted:         { label: '🎁 สุ่มรางวัล',             color: 'purple' },
  user_created:           { label: '👤 เพิ่มเจ้าหน้าที่',        color: 'blue' },
  user_suspended:         { label: '🚫 ระงับเจ้าหน้าที่',        color: 'red' },
  user_activated:         { label: '✅ เปิดใช้งานเจ้าหน้าที่',   color: 'green' },
  member_imported:        { label: '📥 Import สมาชิก',          color: 'blue' },
  member_updated:         { label: '✏️ แก้ไขข้อมูลสมาชิก',      color: 'yellow' },
}

export default async function ActivityLogsPage() {
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from('activity_logs')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Activity Logs</h1>
        <p className="text-gray-500 text-sm mt-0.5">บันทึกการดำเนินการทั้งหมดในระบบ</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                <th className="text-left px-5 py-3">เวลา</th>
                <th className="text-left px-5 py-3">ผู้ดำเนินการ</th>
                <th className="text-left px-5 py-3">การดำเนินการ</th>
                <th className="text-left px-5 py-3">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!logs?.length ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400">ยังไม่มีข้อมูล</td>
                </tr>
              ) : logs.map(log => {
                const actor = (log as any).profiles
                const meta = log.metadata as any
                const actionInfo = ACTION_LABELS[log.action]
                const colorClass =
                  actionInfo?.color === 'blue' ? 'bg-primary-50 text-primary-700' :
                  actionInfo?.color === 'green' ? 'bg-success-50 text-success-700' :
                  actionInfo?.color === 'red' ? 'bg-danger-50 text-danger-700' :
                  actionInfo?.color === 'yellow' ? 'bg-amber-50 text-amber-700' :
                  actionInfo?.color === 'purple' ? 'bg-purple-50 text-purple-700' :
                  'bg-gray-100 text-gray-600'

                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {formatDateTimeTH(log.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      {actor ? (
                        <div>
                          <p className="font-medium text-gray-700">{actor.full_name}</p>
                          <p className="text-xs text-gray-400">{actor.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">ระบบ / ผู้ใช้ทั่วไป</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${colorClass}`}>
                        {actionInfo?.label || log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {meta?.title && <span className="mr-2">กิจกรรม: {meta.title}</span>}
                      {meta?.prize_label && <span className="mr-2">รางวัล: {meta.prize_label}</span>}
                      {meta?.full_name && <span className="mr-2">ชื่อ: {meta.full_name}</span>}
                      {meta?.member_no && <span className="mr-2">เลขสมาชิก: {meta.member_no}</span>}
                      {meta?.email && <span className="mr-2">อีเมล: {meta.email}</span>}
                      {meta?.event_day && <span className="mr-2">วัน: {meta.event_day}</span>}
                      {meta?.registration_open === true && <span className="mr-2">เปิดรับลงทะเบียน</span>}
                      {meta?.registration_open === false && <span className="mr-2">ปิดรับลงทะเบียน</span>}
                      {meta?.registration_round && <span className="mr-2">รอบที่: {meta.registration_round}</span>}
                      {meta?.draw_status === 'closed' && <span className="mr-2">จบการจับรางวัล</span>}
                      {meta?.draw_status === 'reopened' && <span className="mr-2">เปิดให้สุ่มต่อ</span>}
                      {meta?.file_name && <span className="mr-2">ไฟล์: {meta.file_name}</span>}
                      {meta?.imported_rows !== undefined && <span className="mr-2">Import: {meta.imported_rows} รายการ</span>}
                      {meta?.change === 'created' && <span className="mr-2">เพิ่มข้อมูลใหม่</span>}
                      {meta?.change === 'updated' && <span className="mr-2">แก้ไขข้อมูล</span>}
                      {meta?.change === 'suspended' && <span className="mr-2">ระงับสมาชิก</span>}
                      {meta?.change === 'activated' && <span className="mr-2">เปิดใช้งานสมาชิก</span>}
                      {meta?.cancelled_by && (
                        <span>ยกเลิกโดย: {meta.cancelled_by === 'self' ? 'ตัวเอง' : 'เจ้าหน้าที่'}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {logs && logs.length >= 200 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 text-center">
            แสดง 200 รายการล่าสุด
          </div>
        )}
      </div>
    </div>
  )
}
