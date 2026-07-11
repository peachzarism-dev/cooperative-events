import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = await createClient()
  const { action } = await req.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (action === 'close') {
    const { data: event } = await supabase
      .from('events')
      .select('title')
      .eq('id', params.eventId)
      .single()

    const { error } = await supabase
      .from('events')
      .update({
        draw_closed_at: new Date().toISOString(),
        draw_closed_by: user.id,
      } as any)
      .eq('id', params.eventId)
      .is('deleted_at', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('activity_logs').insert({
      actor_id: user.id,
      action: 'event_updated',
      target_type: 'event',
      target_id: params.eventId,
      metadata: { title: event?.title, draw_status: 'closed' },
    })

    return NextResponse.json({ drawClosedAt: new Date().toISOString() })
  }

  if (action === 'reopen') {
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { data: event } = await supabase
      .from('events')
      .select('title')
      .eq('id', params.eventId)
      .single()

    const { error } = await supabase
      .from('events')
      .update({
        draw_closed_at: null,
        draw_closed_by: null,
      } as any)
      .eq('id', params.eventId)
      .is('deleted_at', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('activity_logs').insert({
      actor_id: user.id,
      action: 'event_updated',
      target_type: 'event',
      target_id: params.eventId,
      metadata: { title: event?.title, draw_status: 'reopened' },
    })

    return NextResponse.json({ drawClosedAt: null })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
