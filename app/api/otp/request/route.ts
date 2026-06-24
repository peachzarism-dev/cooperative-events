// app/api/otp/request/route.ts — ขอ OTP

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendOtpEmail } from '@/lib/email'

// เก็บ OTP ใน module-level Map
const otpStore = new Map<string, { otp: string; expires: number }>()

export async function POST(req: NextRequest) {
  const { registrationId, email, fullName } = await req.json()

  if (!registrationId || !email) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  const { data: reg } = await supabase
    .from('registrations')
    .select('id, status, events(title)')
    .eq('id', registrationId)
    .single()

  if (!reg || reg.status === 'cancelled') {
    return NextResponse.json({ error: 'Registration not found or already cancelled' }, { status: 404 })
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expires = Date.now() + 10 * 60 * 1000

  otpStore.set(registrationId, { otp, expires })

  try {
    const eventTitle = (reg.events as any)?.title || 'กิจกรรม'
    await sendOtpEmail({ to: email, fullName, otp, eventTitle })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('OTP email error:', err)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}
