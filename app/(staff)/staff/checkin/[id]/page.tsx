// app/(staff)/staff/checkin/[id]/page.tsx

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CheckInScanner from '@/components/checkin/CheckInScanner'

export default async function CheckInPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*, event_days(*)')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!event) notFound()

  const eventDays = event.event_days?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Check-in</h1>
        <p className="text-gray-500 text-sm mt-0.5">สแกน QR Code ผู้เข้าร่วมกิจกรรม</p>
      </div>
      <CheckInScanner
        eventId={event.id}
        eventTitle={event.title}
        isMultiDay={event.is_multi_day}
        eventDays={eventDays}
      />
    </div>
  )
}
