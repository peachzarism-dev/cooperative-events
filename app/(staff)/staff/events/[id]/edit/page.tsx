import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EventForm from '@/components/events/EventForm'

export default async function EditEventPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*, event_days(*), event_custom_fields(*)')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!event) notFound()

  // เรียงลำดับ
  const sortedEvent = {
    ...event,
    event_days: event.event_days?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [],
    event_custom_fields: event.event_custom_fields?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [],
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">แก้ไขกิจกรรม</h1>
        <p className="text-gray-500 text-sm mt-0.5">{event.title}</p>
      </div>
      <EventForm mode="edit" event={sortedEvent as any} />
    </div>
  )
}
