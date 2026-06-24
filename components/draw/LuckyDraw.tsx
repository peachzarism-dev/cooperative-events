'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Trophy, Shuffle, Users, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  eventId: string
  eventTitle: string
}

interface Participant {
  id: string
  full_name: string
  is_member: boolean
  member_no?: string
}

export default function LuckyDraw({ eventId, eventTitle }: Props) {
  const supabase = createClient()
  const [pool, setPool] = useState<'checked_in_only' | 'all_registered'>('checked_in_only')
  const [prizeName, setPrizeName] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [winners, setWinners] = useState<Participant[]>([])
  const [rolling, setRolling] = useState(false)
  const [winner, setWinner] = useState<Participant | null>(null)
  const [displayName, setDisplayName] = useState('???')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchParticipants()
  }, [pool])

  async function fetchParticipants() {
    if (pool === 'checked_in_only') {
      const { data } = await supabase
        .from('check_ins')
        .select('registrations(id, full_name, is_member, cooperative_members(member_no))')
        .eq('registrations.event_id', eventId)
        .eq('registrations.status', 'active')

      const list: Participant[] = (data || [])
        .map((ci: any) => ci.registrations)
        .filter(Boolean)
        .map((r: any) => ({
          id: r.id,
          full_name: r.full_name,
          is_member: r.is_member,
          member_no: r.cooperative_members?.member_no,
        }))

      // ตัด winner ออก
      setParticipants(list.filter(p => !winners.find(w => w.id === p.id)))
    } else {
      const { data } = await supabase
        .from('registrations')
        .select('id, full_name, is_member, cooperative_members(member_no)')
        .eq('event_id', eventId)
        .eq('status', 'active')

      const list: Participant[] = (data || []).map((r: any) => ({
        id: r.id,
        full_name: r.full_name,
        is_member: r.is_member,
        member_no: r.cooperative_members?.member_no,
      }))
      setParticipants(list.filter(p => !winners.find(w => w.id === p.id)))
    }
  }

  async function startDraw() {
    if (!participants.length) return
    setRolling(true)
    setWinner(null)

    let elapsed = 0
    const duration = 4000
    const fastInterval = 80
    const slowInterval = 300

    intervalRef.current = setInterval(() => {
      elapsed += fastInterval
      const rnd = participants[Math.floor(Math.random() * participants.length)]
      setDisplayName(rnd.full_name)

      if (elapsed >= duration) {
        clearInterval(intervalRef.current!)
        // ชะลอลงก่อนจบ
        let slowCount = 0
        const slow = setInterval(() => {
          slowCount++
          const rnd2 = participants[Math.floor(Math.random() * participants.length)]
          setDisplayName(rnd2.full_name)
          if (slowCount >= 5) {
            clearInterval(slow)
            const finalWinner = participants[Math.floor(Math.random() * participants.length)]
            setDisplayName(finalWinner.full_name)
            setWinner(finalWinner)
            setRolling(false)
            saveWinner(finalWinner)
          }
        }, slowInterval)
      }
    }, fastInterval)
  }

  async function saveWinner(w: Participant) {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: session } = await supabase
      .from('lucky_draw_sessions')
      .insert({
        event_id: eventId,
        prize_label: prizeName || 'รางวัล',
        draw_pool: pool,
        drawn_by: user?.id,
      })
      .select('id')
      .single()

    if (session) {
      await supabase.from('lucky_draw_winners').insert({
        session_id: session.id,
        registration_id: w.id,
      })
    }
    setWinners(prev => [...prev, w])
    setParticipants(prev => prev.filter(p => p.id !== w.id))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Settings */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">ตั้งค่าการสุ่ม</h2>
        <div>
          <label className="label">ชื่อรางวัล</label>
          <input
            type="text"
            value={prizeName}
            onChange={e => setPrizeName(e.target.value)}
            className="input"
            placeholder="เช่น รางวัลที่ 1, ของรางวัลพิเศษ"
          />
        </div>
        <div>
          <label className="label">สุ่มจาก</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPool('checked_in_only')}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all',
                pool === 'checked_in_only'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              <UserCheck className="w-4 h-4" />
              เฉพาะผู้ที่ Check-in แล้ว
            </button>
            <button
              onClick={() => setPool('all_registered')}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all',
                pool === 'all_registered'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              <Users className="w-4 h-4" />
              ผู้ลงทะเบียนทั้งหมด
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          ผู้เข้าร่วมในกองสุ่ม: <strong className="text-gray-800">{participants.length}</strong> คน
        </p>
      </div>

      {/* Draw Stage */}
      <div className="card p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center',
            winner ? 'bg-gold-400' : 'bg-primary-100'
          )}>
            {winner
              ? <Trophy className="w-10 h-10 text-white" />
              : <Gift className="w-10 h-10 text-primary-600" />}
          </div>
        </div>

        {prizeName && (
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{prizeName}</p>
        )}

        {/* Name display */}
        <div className={cn(
          'min-h-[80px] flex items-center justify-center rounded-2xl px-6 py-4',
          winner ? 'bg-gold-50 border-2 border-gold-300' : 'bg-gray-50'
        )}>
          <AnimatePresence mode="wait">
            <motion.p
              key={displayName}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.05 }}
              className={cn(
                'text-2xl font-bold',
                rolling && 'text-gray-400',
                winner && 'text-gold-700 text-3xl'
              )}
            >
              {displayName}
            </motion.p>
          </AnimatePresence>
        </div>

        {winner && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-gold-600 font-semibold text-lg"
          >
            🎉 ยินดีด้วย! 🎉
          </motion.div>
        )}

        <button
          onClick={startDraw}
          disabled={rolling || participants.length === 0}
          className={cn(
            'flex items-center gap-2 mx-auto px-8 py-3 rounded-xl font-semibold text-base transition-all',
            winner
              ? 'bg-primary-600 hover:bg-primary-700 text-white'
              : 'bg-gold-500 hover:bg-gold-600 text-white',
            (rolling || !participants.length) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Shuffle className={cn('w-5 h-5', rolling && 'animate-spin')} />
          {rolling ? 'กำลังสุ่ม...' : winner ? 'สุ่มรางวัลถัดไป' : 'เริ่มสุ่มรางวัล'}
        </button>

        {participants.length === 0 && (
          <p className="text-gray-400 text-sm">ไม่มีผู้เข้าร่วมในกองสุ่มแล้ว</p>
        )}
      </div>

      {/* Winners list */}
      {winners.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold-500" />
            รายชื่อผู้ได้รับรางวัล ({winners.length} คน)
          </h2>
          <div className="space-y-2">
            {winners.map((w, i) => (
              <div key={w.id} className="flex items-center gap-3 p-3 bg-gold-50 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-gold-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-800">{w.full_name}</p>
                  {w.member_no && <p className="text-xs text-gray-400">เลขสมาชิก: {w.member_no}</p>}
                </div>
                {w.is_member && <span className="badge-blue ml-auto">สมาชิก</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
