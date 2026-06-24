// app/(staff)/staff/draw/[id]/page.tsx

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LuckyDraw from '@/components/draw/LuckyDraw'

export default async function DrawPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, title')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!event) notFound()

  const { data: drawStatus } = await supabase
    .from('events')
    .select('draw_closed_at')
    .eq('id', params.id)
    .maybeSingle()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">สุ่มรางวัล</h1>
        <p className="text-gray-500 text-sm mt-0.5">{event.title}</p>
      </div>
      <LuckyDraw
        eventId={event.id}
        eventTitle={event.title}
        initialDrawClosedAt={(drawStatus as any)?.draw_closed_at || null}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  )
}
