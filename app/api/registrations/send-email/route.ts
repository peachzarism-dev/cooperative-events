// app/api/registrations/send-email/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { sendRegistrationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, fullName, eventTitle, eventDate, eventLocation, qrToken } = body

  if (!email || !qrToken) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    await sendRegistrationEmail({ to: email, fullName, eventTitle, eventDate, eventLocation, qrToken })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Email send error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
