import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { formatDateTimeTH } from '@/lib/utils'

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', params.eventId)
    .single()

  const { data: sessions, error } = await supabase
    .from('lucky_draw_sessions')
    .select(`
      id,
      prize_label,
      draw_pool,
      drawn_at,
      lucky_draw_winners(
        registrations(
          full_name,
          is_member,
          phone,
          email,
          cooperative_members(member_no)
        )
      )
    `)
    .eq('event_id', params.eventId)
    .order('drawn_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (sessions || []).flatMap((session: any, index: number) =>
    (session.lucky_draw_winners || []).map((winner: any) => {
      const reg = winner.registrations
      return {
        'ลำดับ': index + 1,
        'ชื่อรางวัล': session.prize_label,
        'ชื่อผู้ได้รับรางวัล': reg?.full_name || '-',
        'ประเภท': reg?.is_member ? 'สมาชิกสหกรณ์' : 'บุคคลทั่วไป',
        'เลขสมาชิก': reg?.cooperative_members?.member_no || '-',
        'เบอร์โทรศัพท์': reg?.phone || '-',
        'อีเมล': reg?.email || '-',
        'กองสุ่ม': session.draw_pool === 'checked_in_only' ? 'เฉพาะผู้ที่ Check-in แล้ว' : 'ผู้ลงทะเบียนทั้งหมด',
        'เวลาที่สุ่ม': formatDateTimeTH(session.drawn_at),
      }
    })
  )

  const wb = XLSX.utils.book_new()
  const ws = rows.length
    ? XLSX.utils.json_to_sheet(rows)
    : XLSX.utils.json_to_sheet([{ 'ข้อมูล': 'ยังไม่มีผู้ได้รับรางวัล' }])

  ws['!cols'] = [
    { wch: 6 }, { wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 12 },
    { wch: 14 }, { wch: 28 }, { wch: 28 }, { wch: 20 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'ผู้ได้รับรางวัล')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const date = new Date().toLocaleDateString('th-TH').replace(/\//g, '-')
  const filename = `${event?.title || 'event'}-รางวัล-${date}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
