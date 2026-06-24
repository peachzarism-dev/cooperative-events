'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EventDay } from '@/types/database'

interface DayStats { event_day_id: string; count: number }

export default function EventDashboardClient({
  eventId,
  eventDays,
}: {
  eventId: string
  eventDays: EventDay[]
}) {
  const supabase = createClient()
  const [dayStats, setDayStats] = useState<Record<string, number>>({})

  async function fetchDayStats() {
    const { data } = await supabase
      .from('check_ins')
      .select('event_day_id')
      .in('event_day_id', eventDays.map(d => d.id))

    const counts: Record<string, number> = {}
    data?.forEach(ci => {
      counts[ci.event_day_id!] = (counts[ci.event_day_id!] || 0) + 1
    })
    setDayStats(counts)
  }

  useEffect(() => {
    fetchDayStats()

    // Subscribe realtime
    const channel = supabase
      .channel(`dashboard-${eventId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'check_ins',
      }, () => fetchDayStats())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId])

  const maxCount = Math.max(...Object.values(dayStats), 1)

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-800 mb-4">Check-in รายวัน</h2>
      <div className="space-y-3">
        {eventDays
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(day => {
            const count = dayStats[day.id] || 0
            const pct = Math.round((count / maxCount) * 100)
            return (
              <div key={day.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{day.label}</span>
                  <span className="text-gray-500">{count} คน</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
