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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">สุ่มรางวัล</h1>
        <p className="text-gray-500 text-sm mt-0.5">{event.title}</p>
      </div>
      <LuckyDraw eventId={event.id} eventTitle={event.title} />
    </div>
  )
}
