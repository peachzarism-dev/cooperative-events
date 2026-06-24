// app/(public)/confirm/[token]/page.tsx — หน้าแสดง QR Code

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDateTH } from '@/lib/utils'
import { Calendar, MapPin, CheckCircle, XCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import TicketActions from '@/components/registration/TicketActions'

// Dynamic import เพื่อให้ qrcode.react โหลดแบบ client-side
const QRDisplay = dynamic(() => import('@/components/registration/QRDisplay'), {
  ssr: false,
  loading: () => (
    <div className="w-[200px] h-[200px] bg-gray-100 rounded-2xl animate-pulse mx-auto" />
  ),
})

export default async function ConfirmPage({ params }: { params: { token: string } }) {
  const supabase = await createClient()

  const { data: reg } = await supabase
    .from('registrations')
    .select(`*, events(title, start_date, end_date, location), check_ins(checked_in_at)`)
    .eq('qr_token', params.token)
    .single()

  if (!reg) notFound()

  const event = reg.events as any
  const isCheckedIn = reg.check_ins && (reg.check_ins as any[]).length > 0
  const isCancelled = reg.status === 'cancelled'
  const eventDate = event?.start_date
    ? event.start_date === event.end_date
      ? formatDateTH(event.start_date)
      : `${formatDateTH(event.start_date)} — ${formatDateTH(event.end_date)}`
    : '-'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="card overflow-hidden">
          {/* Header */}
          <div className={`p-5 text-center ${isCancelled ? 'bg-gray-100' : 'bg-gradient-to-r from-primary-700 to-primary-500'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isCancelled ? 'text-gray-500' : 'text-primary-200'}`}>
              บัตรเข้าร่วมกิจกรรม
            </p>
            <h1 className={`text-lg font-bold ${isCancelled ? 'text-gray-600' : 'text-white'}`}>
              {event?.title}
            </h1>
          </div>

          <div className="p-6">
            {/* Status Badge */}
            {isCancelled ? (
              <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-xl p-3 mb-5">
                <XCircle className="w-5 h-5 text-gray-500" />
                <span className="text-gray-600 font-medium">ยกเลิกการลงทะเบียนแล้ว</span>
              </div>
            ) : isCheckedIn ? (
              <div className="flex items-center justify-center gap-2 bg-success-50 rounded-xl p-3 mb-5">
                <CheckCircle className="w-5 h-5 text-success-600" />
                <span className="text-success-700 font-medium">Check-in แล้ว ✓</span>
              </div>
            ) : null}

            {/* QR Code */}
            {!isCancelled && (
              <div className="flex justify-center mb-5">
                <QRDisplay token={params.token} size={200} />
              </div>
            )}

            {/* ข้อมูลผู้ลงทะเบียน */}
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">ชื่อผู้ลงทะเบียน</p>
                <p className="font-semibold text-gray-800 text-lg">{reg.full_name}</p>
                {reg.is_member && (
                  <span className="badge-blue mt-1">สมาชิกสหกรณ์</span>
                )}
              </div>

              <hr className="border-gray-100" />

              {event?.start_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{eventDate}</span>
                </div>
              )}
              {event?.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>

            {!isCancelled && (
              <p className="text-center text-gray-400 text-xs mt-5">
                กรุณาแสดง QR Code นี้ต่อเจ้าหน้าที่ในวันงาน
              </p>
            )}
          </div>
        </div>

        {!isCancelled && (
          <TicketActions
            token={params.token}
            eventTitle={event?.title || 'กิจกรรม'}
            fullName={reg.full_name}
            eventDate={eventDate}
            eventLocation={event?.location}
          />
        )}

        {/* Cancel link */}
        {!isCancelled && !isCheckedIn && (
          <p className="text-center text-sm text-gray-400 mt-4">
            ต้องการยกเลิก?{' '}
            <a href={`/confirm/${params.token}/cancel`} className="text-danger-500 hover:underline">
              คลิกที่นี่
            </a>
          </p>
        )}
      </div>
    </div>
  )
}
