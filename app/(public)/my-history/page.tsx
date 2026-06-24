'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTH, formatDateTimeTH } from '@/lib/utils'
import { Search, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'

interface Registration {
  id: string
  full_name: string
  status: string
  registered_at: string
  check_ins: { checked_in_at: string }[]
  events: { title: string; start_date: string; end_date: string; location: string | null }
}

export default function MyHistoryPage() {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [queryType, setQueryType] = useState<'email' | 'member_no'>('email')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Registration[] | null>(null)
  const [searched, setSearched] = useState(false)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)

    if (queryType === 'email') {
      const { data } = await supabase
        .from('registrations')
        .select(`
          id, full_name, status, registered_at,
          check_ins(checked_in_at),
          events(title, start_date, end_date, location)
        `)
        .eq('email', query.trim())
        .order('registered_at', { ascending: false })
      setResults((data as any) || [])
    } else {
      // ค้นหาจากเลขสมาชิก
      const { data: member } = await supabase
        .from('cooperative_members')
        .select('id')
        .eq('member_no', query.trim())
        .single()

      if (member) {
        const { data } = await supabase
          .from('registrations')
          .select(`
            id, full_name, status, registered_at,
            check_ins(checked_in_at),
            events(title, start_date, end_date, location)
          `)
          .eq('member_id', member.id)
          .order('registered_at', { ascending: false })
        setResults((data as any) || [])
      } else {
        setResults([])
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Calendar className="w-12 h-12 text-primary-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-800">ประวัติการเข้าร่วมกิจกรรม</h1>
          <p className="text-gray-500 mt-1 text-sm">ค้นหาด้วยอีเมลหรือเลขสมาชิก</p>
        </div>

        {/* Search */}
        <div className="card p-5 mb-6">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setQueryType('email')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                queryType === 'email'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ค้นหาด้วยอีเมล
            </button>
            <button
              onClick={() => setQueryType('member_no')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                queryType === 'member_no'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ค้นหาด้วยเลขสมาชิก
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type={queryType === 'email' ? 'email' : 'text'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              className="input flex-1"
              placeholder={queryType === 'email' ? 'email@example.com' : 'CM001'}
            />
            <button onClick={search} disabled={loading} className="btn-primary px-5">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        {searched && (
          <>
            {loading ? (
              <div className="text-center py-12 text-gray-400">กำลังค้นหา...</div>
            ) : !results?.length ? (
              <div className="card p-10 text-center">
                <p className="text-gray-500">ไม่พบประวัติการลงทะเบียน</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">พบ {results.length} รายการ</p>
                {results.map(reg => {
                  const event = (reg as any).events
                  const isCheckedIn = reg.check_ins?.length > 0
                  const isCancelled = reg.status === 'cancelled'
                  return (
                    <div key={reg.id} className={`card p-4 ${isCancelled ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{event?.title}</h3>
                          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {event?.start_date === event?.end_date
                              ? formatDateTH(event?.start_date)
                              : `${formatDateTH(event?.start_date)} – ${formatDateTH(event?.end_date)}`}
                          </p>
                          {event?.location && (
                            <p className="text-sm text-gray-400 mt-0.5">📍 {event.location}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            ลงทะเบียน {formatDateTimeTH(reg.registered_at)}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {isCancelled ? (
                            <span className="badge-danger flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> ยกเลิก
                            </span>
                          ) : isCheckedIn ? (
                            <span className="badge-success flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Check-in แล้ว
                            </span>
                          ) : (
                            <span className="badge-gray flex items-center gap-1">
                              <Clock className="w-3 h-3" /> รอ Check-in
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
