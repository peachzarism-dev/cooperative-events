// app/api/otp/verify-cancel/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

declare global {
  var otpStore: Map<string, { otp: string; expires: number }> | undefined
}

export async function POST(req: NextRequest) {
  const { registrationId, otp, qrToken } = await req.json()

  if (!registrationId || !otp) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const stored = global.otpStore?.get(registrationId)

  if (!stored) {
    return NextResponse.json({ message: 'ไม่พบรหัส OTP กรุณาขอใหม่' }, { status: 400 })
  }
  if (Date.now() > stored.expires) {
    global.otpStore?.delete(registrationId)
    return NextResponse.json({ message: 'รหัส OTP หมดอายุแล้ว กรุณาขอใหม่' }, { status: 400 })
  }
  if (stored.otp !== otp) {
    return NextResponse.json({ message: 'รหัส OTP ไม่ถูกต้อง' }, { status: 400 })
  }

  // OTP ถูกต้อง — ยกเลิกการลงทะเบียน
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('registrations')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'self',
    })
    .eq('id', registrationId)
    .eq('status', 'active')

  if (error) {
    return NextResponse.json({ error: 'Cancel failed' }, { status: 500 })
  }

  // Log
  await supabase.from('activity_logs').insert({
    action: 'registration_cancelled',
    target_type: 'registration',
    target_id: registrationId,
    metadata: { cancelled_by: 'self', qr_token: qrToken },
  })

  global.otpStore?.delete(registrationId)
  return NextResponse.json({ success: true })
}
