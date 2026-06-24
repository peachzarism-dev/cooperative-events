'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, CheckCircle } from 'lucide-react'

type Step = 'confirm' | 'otp' | 'done'

export default function CancelPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('confirm')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [regData, setRegData] = useState<{ id: string; full_name: string; email: string } | null>(null)

  // ─── ขอ OTP ─────────────────────────────────────────────────
  async function requestOtp() {
    setLoading(true)
    const { data: reg } = await supabase
      .from('registrations')
      .select('id, full_name, email, status')
      .eq('qr_token', token)
      .single()

    if (!reg) {
      toast.error('ไม่พบข้อมูลการลงทะเบียน')
      setLoading(false)
      return
    }
    if (reg.status === 'cancelled') {
      toast.error('การลงทะเบียนนี้ถูกยกเลิกแล้ว')
      setLoading(false)
      return
    }
    if (!reg.email) {
      toast.error('ไม่พบอีเมลในระบบ กรุณาติดต่อเจ้าหน้าที่เพื่อยกเลิก')
      setLoading(false)
      return
    }

    setRegData({ id: reg.id, full_name: reg.full_name, email: reg.email })

    // ส่ง OTP ผ่าน API
    const res = await fetch('/api/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: reg.id, email: reg.email, fullName: reg.full_name }),
    })

    if (res.ok) {
      setStep('otp')
      toast.success(`ส่งรหัส OTP ไปยัง ${reg.email} แล้ว`)
    } else {
      toast.error('ไม่สามารถส่ง OTP ได้ กรุณาลองใหม่')
    }
    setLoading(false)
  }

  // ─── ยืนยัน OTP + ยกเลิก ────────────────────────────────────
  async function confirmCancel() {
    if (!regData || otp.length !== 6) return
    setLoading(true)

    const res = await fetch('/api/otp/verify-cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: regData.id, otp, qrToken: token }),
    })

    if (res.ok) {
      setStep('done')
    } else {
      const err = await res.json()
      toast.error(err.message || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm card p-8">
        {step === 'confirm' && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-danger-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-danger-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">ยกเลิกการลงทะเบียน</h1>
            <p className="text-gray-500 text-sm mb-6">
              ระบบจะส่งรหัส OTP ไปยังอีเมลที่ท่านลงทะเบียนไว้ เพื่อยืนยันการยกเลิก
            </p>
            <button
              onClick={requestOtp}
              disabled={loading}
              className="btn-danger w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'รับรหัส OTP เพื่อยกเลิก'}
            </button>
            <button
              onClick={() => router.back()}
              className="btn-secondary w-full mt-3"
            >
              ย้อนกลับ
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-800 mb-2">กรอกรหัส OTP</h1>
            <p className="text-gray-500 text-sm mb-1">
              ระบบส่งรหัส 6 หลักไปยัง
            </p>
            <p className="text-primary-600 font-medium mb-6">{regData?.email}</p>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input text-center text-2xl font-bold tracking-widest mb-6"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
            <button
              onClick={confirmCancel}
              disabled={loading || otp.length !== 6}
              className="btn-danger w-full mb-3"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'ยืนยันการยกเลิก'}
            </button>
            <button onClick={() => setOtp('')} className="text-sm text-gray-400 hover:text-gray-600">
              ส่ง OTP ใหม่อีกครั้ง
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-success-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">ยกเลิกสำเร็จ</h1>
            <p className="text-gray-500 text-sm">
              การลงทะเบียนของท่านถูกยกเลิกเรียบร้อยแล้ว
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
