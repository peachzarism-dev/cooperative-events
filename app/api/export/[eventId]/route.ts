// app/api/export/[eventId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { formatDateTimeTH } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const supabase = await createClient()

  // ตรวจสอบว่า login แล้ว
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ดึงข้อมูล
  const { data: event } = await supabase
    .from('events').select('title').eq('id', params.eventId).single()

  const { data: registrations } = await supabase
    .from('registrations')
    .select(`
      *, 
      cooperative_members(member_no),
      check_ins(checked_in_at, event_days(label))
    `)
    .eq('event_id', params.eventId)
    .order('registered_at')

  if (!registrations) return NextResponse.json({ error: 'No data' }, { status: 404 })

  const toRow = (r: any, i: number) => ({
    'ลำดับ': i + 1,
    'เลขสมาชิก': r.cooperative_members?.member_no || '-',
    'ชื่อ-นามสกุล': r.full_name,
    'ประเภท': r.is_member ? 'สมาชิกสหกรณ์' : 'บุคคลทั่วไป',
    'เบอร์โทรศัพท์': r.phone || '-',
    'อีเมล': r.email || '-',
    'วันที่ลงทะเบียน': formatDateTimeTH(r.registered_at),
    'สถานะ': r.status === 'cancelled' ? 'ยกเลิก' : r.check_ins?.length ? 'Check-in แล้ว' : 'ยังไม่ Check-in',
    'เวลา Check-in': r.check_ins?.[0]?.checked_in_at
      ? formatDateTimeTH(r.check_ins[0].checked_in_at) : '-',
    'วัน Check-in': r.check_ins?.[0]?.event_days?.label || '-',
    'หมายเหตุ': r.status === 'cancelled'
      ? `ยกเลิกโดย${r.cancelled_by === 'self' ? 'ตัวเอง' : 'เจ้าหน้าที่'}` : '',
  })

  const active = registrations.filter(r => r.status === 'active')
  const checkedIn = active.filter(r => r.check_ins?.length > 0)
  const noShow = active.filter(r => !r.check_ins?.length)

  const wb = XLSX.utils.book_new()

  const addSheet = (data: any[], name: string) => {
    const ws = data.length > 0
      ? XLSX.utils.json_to_sheet(data)
      : XLSX.utils.json_to_sheet([{ 'ข้อมูล': 'ไม่มีข้อมูล' }])
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 28 }, { wch: 16 },
      { wch: 14 }, { wch: 28 }, { wch: 20 }, { wch: 16 },
      { wch: 20 }, { wch: 20 }, { wch: 24 }
    ]
    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  addSheet(active.map(toRow), 'ผู้ลงทะเบียนทั้งหมด')
  addSheet(checkedIn.map(toRow), 'Check-in แล้ว')
  addSheet(noShow.map(toRow), 'ไม่มา (No-show)')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const date = new Date().toLocaleDateString('th-TH').replace(/\//g, '-')
  const filename = `${event?.title || 'event'}-${date}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
