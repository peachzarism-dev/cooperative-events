// lib/email/index.ts — ส่ง email ด้วย Nodemailer (Gmail SMTP)

import nodemailer from 'nodemailer'
import { getQrPageUrl, formatDateTH } from '@/lib/utils'

// 1. สร้าง Transporter สำหรับเชื่อมต่อกับ Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // อีเมล Gmail ของคุณ (เช่น your_gmail@gmail.com)
    pass: process.env.EMAIL_PASS, // รหัสผ่านแอป 16 หลัก (App Password)
  },
})

// ตั้งค่าชื่อผู้ส่ง โดยใช้เมล์เราเป็นตัวส่งหลัก
const FROM = `"${process.env.RESEND_FROM_NAME || 'ระบบลงทะเบียน'}" <${process.env.EMAIL_USER}>`

// ─── ส่ง QR Code หลังลงทะเบียนสำเร็จ ────────────────────────
export async function sendRegistrationEmail(opts: {
  to: string
  fullName: string
  eventTitle: string
  eventDate: string
  eventLocation: string | null
  qrToken: string
}) {
  const qrUrl = getQrPageUrl(opts.qrToken)
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/confirm/${opts.qrToken}/cancel`

  const html = `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Sarabun',sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#1e40af,#2563eb);padding:32px 24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">ลงทะเบียนสำเร็จ ✅</h1>
      <p style="color:#bfdbfe;margin:8px 0 0;font-size:15px">${opts.eventTitle}</p>
    </div>
    <div style="padding:32px 24px">
      <p style="color:#374151;font-size:16px;margin:0 0 16px">เรียน คุณ${opts.fullName}</p>
      <p style="color:#6b7280;font-size:15px;margin:0 0 24px;line-height:1.6">
        ท่านได้ลงทะเบียนเข้าร่วมกิจกรรม <strong style="color:#1e40af">${opts.eventTitle}</strong> เรียบร้อยแล้ว
      </p>
      <div style="background:#eff6ff;border-radius:12px;padding:20px 24px;margin-bottom:28px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;width:90px">📅 วันที่</td>
              <td style="color:#1e3a8a;font-size:14px;font-weight:600">${formatDateTH(opts.eventDate)}</td></tr>
          ${opts.eventLocation ? `<tr><td style="color:#6b7280;font-size:13px;padding:4px 0">📍 สถานที่</td>
              <td style="color:#1e3a8a;font-size:14px;font-weight:600">${opts.eventLocation}</td></tr>` : ''}
        </table>
      </div>
      <p style="color:#374151;font-size:15px;font-weight:600;margin:0 0 12px;text-align:center">
        QR Code สำหรับ Check-in วันงาน
      </p>
      <div style="text-align:center;margin-bottom:24px">
        <a href="${qrUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:15px;font-weight:600">
          ดู QR Code ของฉัน →
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0 0 8px">
        กรุณาแสดง QR Code ต่อเจ้าหน้าที่ในวันงาน
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
      <p style="color:#9ca3af;font-size:13px;text-align:center">
        หากต้องการยกเลิกการลงทะเบียน 
        <a href="${cancelUrl}" style="color:#ef4444">คลิกที่นี่</a>
      </p>
    </div>
  </div>
</body>
</html>`

  // เปลี่ยนมาใช้ transporter.sendMail ของ nodemailer
  return transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: `✅ ลงทะเบียนสำเร็จ — ${opts.eventTitle}`,
    html,
  })
}

// ─── ส่ง OTP สำหรับยกเลิกการลงทะเบียน ────────────────────────
export async function sendOtpEmail(opts: {
  to: string
  fullName: string
  otp: string
  eventTitle: string
}) {
  const html = `
<!DOCTYPE html>
<html lang="th">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Sarabun',sans-serif">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:28px 24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:20px">ยืนยันการยกเลิกการลงทะเบียน</h1>
    </div>
    <div style="padding:32px 24px;text-align:center">
      <p style="color:#374151;font-size:15px;margin:0 0 8px">เรียน คุณ${opts.fullName}</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 28px">รหัส OTP สำหรับยกเลิกการลงทะเบียนกิจกรรม<br><strong>${opts.eventTitle}</strong></p>
      <div style="background:#fef2f2;border:2px dashed #fca5a5;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="font-size:40px;font-weight:700;color:#dc2626;letter-spacing:12px;margin:0">${opts.otp}</p>
        <p style="color:#9ca3af;font-size:12px;margin:8px 0 0">รหัสนี้จะหมดอายุใน 10 นาที</p>
      </div>
      <p style="color:#9ca3af;font-size:13px">หากท่านไม่ได้ขอยกเลิก กรุณาเพิกเฉยต่ออีเมลนี้</p>
    </div>
  </div>
</body>
</html>`

  // เปลี่ยนมาใช้ transporter.sendMail ของ nodemailer
  return transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: `🔐 รหัส OTP ยืนยันการยกเลิก — ${opts.eventTitle}`,
    html,
  })
}