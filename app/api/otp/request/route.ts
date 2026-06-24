// app/api/otp/request/route.ts — ขอ OTP

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendOtpEmail } from '@/lib/email'

// เก็บ OTP ใน memory (production ควรใช้ Redis หรือ Supabase table)
// ใช้ global map เพื่อให้ persist ระหว่าง requests
declare global {
  var otpStore: Map<string, { otp: string; expires: number }> | undefined
}
if (!global.otpStore) global.otpStore = new Map()

export async function POST(req: NextRequest) {
  const { registrationId, email, fullName } = await req.json()

  if (!registrationId || !email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // ตรวจสอบว่า registration นี้มีจริง
  const supabase = await createAdminClient()
  const { data: reg } = await supabase
    .from('registrations')
    .select('id, status')
    .eq('id', registrationId)
    .single()

  if (!reg || reg.status === 'cancelled') {
    return NextResponse.json({ error: 'Registration not found or already cancelled' }, { status: 404 })
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expires = Date.now() + 10 * 60 * 1000 // 10 นาที

  global.otpStore!.set(registrationId, { otp, expires })

  // ส่ง email
  try {
    await sendOtpEmail({ to: email, fullName, otp, eventTitle: 'กิจกรรม' })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('OTP email error:', err)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}
