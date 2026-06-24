// app/(staff)/staff/draw/page.tsx

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDateTH } from '@/lib/utils'
import { Gift, ChevronRight, Calendar } from 'lucide-react'

export default async function DrawIndexPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, title, start_date, location')
    .is('deleted_at', null)
    .order('start_date', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">สุ่มรางวัล</h1>
        <p className="text-gray-500 text-sm mt-0.5">เลือกกิจกรรมที่ต้องการสุ่มรางวัล</p>
      </div>

      <div className="grid gap-3">
        {!events?.length ? (
          <div className="card p-12 text-center">
            <Gift className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">ไม่มีกิจกรรม</p>
          </div>
        ) : events.map(ev => (
          <Link
            key={ev.id}
            href={`/staff/draw/${ev.id}`}
            className="card p-4 flex items-center gap-4 hover:shadow-md transition-all hover:border-amber-200"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{ev.title}</p>
              <p className="text-sm text-gray-400 mt-0.5">
                {formatDateTH(ev.start_date)}
                {ev.location ? ` · ${ev.location}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="bg-amber-500 text-white text-xs py-1.5 px-3 rounded-lg font-medium">เริ่มสุ่ม</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
