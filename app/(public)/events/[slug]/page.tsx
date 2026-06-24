// app/(public)/events/[slug]/page.tsx — หน้าลงทะเบียนกิจกรรม

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDateTH } from '@/lib/utils'
import { MapPin, Calendar, Users, AlertCircle } from 'lucide-react'
import RegistrationForm from '@/components/registration/RegistrationForm'

export default async function EventRegistrationPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = await createClient()

  // ดึงข้อมูลกิจกรรม
  const { data: event } = await supabase
    .from('events')
    .select(`*, event_days(*), event_custom_fields(*)`)
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .single()

  if (!event) notFound()

  // นับจำนวนผู้ลงทะเบียนปัจจุบัน
  const { count: registeredCount } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('status', 'active')

  const registered = registeredCount ?? 0
  const quota = event.max_participants
  const isFull = quota !== null && registered >= quota
  const isOpen = event.is_registration_open && !isFull

  const dateRange =
    event.start_date === event.end_date
      ? formatDateTH(event.start_date)
      : `${formatDateTH(event.start_date)} — ${formatDateTH(event.end_date)}`

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-gray-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary-800 to-primary-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <p className="text-primary-200 text-sm font-medium mb-2 uppercase tracking-wide">
            ลงทะเบียนเข้าร่วมกิจกรรม
          </p>
          <h1 className="text-2xl md:text-3xl font-bold mb-4 leading-snug">
            {event.title}
          </h1>
          <div className="flex flex-col gap-2 text-primary-100 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{dateRange}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{event.location}</span>
              </div>
            )}
            {quota !== null && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 shrink-0" />
                <span>
                  ลงทะเบียนแล้ว {registered} / {quota} คน
                  {isFull && <span className="ml-2 text-red-300 font-semibold">(เต็มแล้ว)</span>}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {event.description && (
          <div className="card p-5 mb-6">
            <h2 className="font-semibold text-gray-700 mb-2">รายละเอียดกิจกรรม</h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        )}

        {/* ปิดรับลงทะเบียน */}
        {!event.is_registration_open ? (
          <div className="card p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-medium whitespace-pre-line">
              {event.closed_message}
            </p>
          </div>
        ) : isFull ? (
          <div className="card p-8 text-center">
            <Users className="w-12 h-12 text-danger-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">โควต้าเต็มแล้ว</h2>
            <p className="text-gray-500">
              ขออภัย กิจกรรมนี้มีผู้ลงทะเบียนครบจำนวน {quota} คนแล้ว
            </p>
          </div>
        ) : (
          <RegistrationForm
            event={event}
            customFields={event.event_custom_fields || []}
          />
        )}
      </div>
    </div>
  )
}
