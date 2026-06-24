// lib/excel/export.ts — Export ข้อมูลเป็น Excel 3 sheets

import * as XLSX from 'xlsx'
import { formatDateTimeTH } from '@/lib/utils'
import type { RegistrationWithDetails } from '@/types/database'

interface ExportRow {
  ลำดับ: number
  เลขสมาชิก: string
  ชื่อ_นามสกุล: string
  ประเภท: string
  เบอร์โทรศัพท์: string
  อีเมล: string
  วันที่ลงทะเบียน: string
  สถานะ: string
  เวลา_CheckIn: string
  หมายเหตุ: string
}

export function exportRegistrationsToExcel(
  registrations: RegistrationWithDetails[],
  eventTitle: string
) {
  const active = registrations.filter(r => r.status === 'active')
  const checkedIn = active.filter(r => r.check_ins && r.check_ins.length > 0)
  const noShow = active.filter(r => !r.check_ins || r.check_ins.length === 0)

  const toRow = (r: RegistrationWithDetails, i: number): ExportRow => ({
    ลำดับ: i + 1,
    เลขสมาชิก: r.member?.member_no || '-',
    ชื่อ_นามสกุล: r.full_name,
    ประเภท: r.is_member ? 'สมาชิกสหกรณ์' : 'บุคคลทั่วไป',
    เบอร์โทรศัพท์: r.phone || '-',
    อีเมล: r.email || '-',
    วันที่ลงทะเบียน: formatDateTimeTH(r.registered_at),
    สถานะ: r.status === 'cancelled' ? 'ยกเลิก' : r.check_ins?.length ? 'Check-in แล้ว' : 'ยังไม่ Check-in',
    เวลา_CheckIn: r.check_ins?.[0]?.checked_in_at ? formatDateTimeTH(r.check_ins[0].checked_in_at) : '-',
    หมายเหตุ: r.status === 'cancelled' ? `ยกเลิกโดย ${r.cancelled_by === 'self' ? 'ตัวเอง' : 'เจ้าหน้าที่'}` : '',
  })

  const wb = XLSX.utils.book_new()

  // Sheet 1: ผู้ลงทะเบียนทั้งหมด (active)
  const ws1 = XLSX.utils.json_to_sheet(active.map(toRow))
  styleSheet(ws1)
  XLSX.utils.book_append_sheet(wb, ws1, 'ผู้ลงทะเบียนทั้งหมด')

  // Sheet 2: Check-in แล้ว
  const ws2 = XLSX.utils.json_to_sheet(checkedIn.map(toRow))
  styleSheet(ws2)
  XLSX.utils.book_append_sheet(wb, ws2, 'Check-in แล้ว')

  // Sheet 3: ไม่มา (No-show)
  const ws3 = XLSX.utils.json_to_sheet(noShow.map(toRow))
  styleSheet(ws3)
  XLSX.utils.book_append_sheet(wb, ws3, 'ไม่มา (No-show)')

  // Download
  const date = new Date().toLocaleDateString('th-TH').replace(/\//g, '-')
  XLSX.writeFile(wb, `${eventTitle}-${date}.xlsx`)
}

function styleSheet(ws: XLSX.WorkSheet) {
  // ปรับความกว้างคอลัมน์
  ws['!cols'] = [
    { wch: 6 },   // ลำดับ
    { wch: 12 },  // เลขสมาชิก
    { wch: 28 },  // ชื่อ
    { wch: 16 },  // ประเภท
    { wch: 14 },  // เบอร์โทร
    { wch: 28 },  // อีเมล
    { wch: 20 },  // วันที่ลงทะเบียน
    { wch: 16 },  // สถานะ
    { wch: 20 },  // เวลา check-in
    { wch: 24 },  // หมายเหตุ
  ]
}
