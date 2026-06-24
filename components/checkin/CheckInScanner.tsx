'use client'

import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, QrCode, Camera } from 'lucide-react'
import type { EventDay } from '@/types/database'
import { formatDateTimeTH } from '@/lib/utils'

interface Props {
  eventId: string
  eventTitle: string
  isMultiDay: boolean
  eventDays: EventDay[]
}

type ScanResult = {
  type: 'success' | 'already' | 'error'
  name?: string
  message: string
  time?: string
}

export default function CheckInScanner({ eventId, eventTitle, isMultiDay, eventDays }: Props) {
  const supabase = createClient()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState<string>(eventDays[0]?.id || '')
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [manualToken, setManualToken] = useState('')

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop()
      }
    }
  }, [])

  async function startScanner() {
    const qr = new Html5Qrcode('qr-reader')
    scannerRef.current = qr
    setScanning(true)

    await qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        // extract token from URL
        const token = decodedText.includes('/confirm/')
          ? decodedText.split('/confirm/')[1].split('/')[0]
          : decodedText

        await processCheckIn(token)
        await qr.stop()
        setScanning(false)
        scannerRef.current = null
      },
      () => {}
    )
  }

  async function processCheckIn(token: string) {
    // หา registration
    const { data: reg } = await supabase
      .from('registrations')
      .select('id, full_name, status, event_id')
      .eq('qr_token', token)
      .single()

    if (!reg) {
      setLastResult({ type: 'error', message: 'ไม่พบข้อมูลการลงทะเบียน' })
      return
    }
    if (reg.event_id !== eventId) {
      setLastResult({ type: 'error', message: 'QR Code นี้ไม่ได้เป็นของกิจกรรมนี้' })
      return
    }
    if (reg.status === 'cancelled') {
      setLastResult({ type: 'error', message: 'การลงทะเบียนนี้ถูกยกเลิกแล้ว', name: reg.full_name })
      return
    }

    // เช็คว่า check-in ซ้ำไหม
    const query = supabase
      .from('check_ins')
      .select('id')
      .eq('registration_id', reg.id)

    if (isMultiDay && selectedDayId) {
      query.eq('event_day_id', selectedDayId)
    }

    const { data: existing } = await query.single()

    if (existing) {
      setLastResult({
        type: 'already',
        name: reg.full_name,
        message: 'Check-in ซ้ำ — ท่านนี้ Check-in ไปแล้ว'
      })
      return
    }

    // ดึง user ปัจจุบัน
    const { data: { user } } = await supabase.auth.getUser()

    // บันทึก check-in
    const { error } = await supabase.from('check_ins').insert({
      registration_id: reg.id,
      event_day_id: isMultiDay && selectedDayId ? selectedDayId : null,
      checked_in_by: user?.id,
    })

    if (error) {
      setLastResult({ type: 'error', message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' })
      return
    }

    setLastResult({
      type: 'success',
      name: reg.full_name,
      message: 'Check-in สำเร็จ!',
      time: formatDateTimeTH(new Date().toISOString()),
    })
  }

  async function handleManualCheckin() {
    if (!manualToken.trim()) return
    await processCheckIn(manualToken.trim())
    setManualToken('')
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="card p-4">
        <h1 className="font-bold text-gray-800 text-lg">{eventTitle}</h1>

        {isMultiDay && eventDays.length > 0 && (
          <div className="mt-3">
            <label className="label">เลือกวัน</label>
            <select
              value={selectedDayId}
              onChange={e => setSelectedDayId(e.target.value)}
              className="input"
            >
              {eventDays.map(day => (
                <option key={day.id} value={day.id}>{day.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Result Display */}
      {lastResult && (
        <div className={`card p-5 flex items-start gap-4 ${
          lastResult.type === 'success' ? 'border-success-300 bg-success-50' :
          lastResult.type === 'already' ? 'border-amber-300 bg-amber-50' :
          'border-danger-300 bg-danger-50'
        }`}>
          {lastResult.type === 'success' ? (
            <CheckCircle className="w-8 h-8 text-success-600 shrink-0" />
          ) : lastResult.type === 'already' ? (
            <AlertCircle className="w-8 h-8 text-amber-500 shrink-0" />
          ) : (
            <XCircle className="w-8 h-8 text-danger-500 shrink-0" />
          )}
          <div>
            {lastResult.name && (
              <p className="font-bold text-gray-800 text-lg">{lastResult.name}</p>
            )}
            <p className={`font-medium ${
              lastResult.type === 'success' ? 'text-success-700' :
              lastResult.type === 'already' ? 'text-amber-700' :
              'text-danger-700'
            }`}>{lastResult.message}</p>
            {lastResult.time && (
              <p className="text-xs text-gray-400 mt-0.5">{lastResult.time}</p>
            )}
          </div>
        </div>
      )}

      {/* Scanner */}
      <div className="card p-5">
        <div id="qr-reader" className="rounded-xl overflow-hidden" />

        {!scanning ? (
          <button
            onClick={startScanner}
            className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            เปิดกล้องสแกน QR Code
          </button>
        ) : (
          <button
            onClick={async () => {
              await scannerRef.current?.stop()
              setScanning(false)
            }}
            className="btn-secondary w-full mt-4"
          >
            หยุดสแกน
          </button>
        )}
      </div>

      {/* Manual input */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">หรือกรอก Token ด้วยตัวเอง</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualToken}
            onChange={e => setManualToken(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualCheckin()}
            className="input flex-1 font-mono text-sm"
            placeholder="วาง QR token ที่นี่..."
          />
          <button onClick={handleManualCheckin} className="btn-primary px-4">
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
