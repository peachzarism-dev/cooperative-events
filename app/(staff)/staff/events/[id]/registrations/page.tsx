import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RegistrationsList from '@/components/registration/RegistrationsList'

export default async function RegistrationsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, title, is_multi_day, event_days(*)')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!event) notFound()

  const { data: registrations } = await supabase
    .from('registrations')
    .select(`
      *,
      cooperative_members(member_no),
      check_ins(id, checked_in_at, event_days(label))
    `)
    .eq('event_id', params.id)
    .order('registered_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">รายชื่อผู้ลงทะเบียน</h1>
        <p className="text-gray-500 text-sm mt-0.5">{event.title}</p>
      </div>
      <RegistrationsList
        initialRegistrations={registrations as any || []}
        eventId={event.id}
        eventTitle={event.title}
      />
    </div>
  )
}
