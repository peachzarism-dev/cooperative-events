'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Gift, Lock, Shuffle, Trophy, Unlock,
  Users, UserCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  eventId: string
  eventTitle: string
  initialDrawClosedAt?: string | null
  isAdmin: boolean
}

interface Participant {
  id: string
  full_name: string
  is_member: boolean
  member_no?: string
}

interface DrawWinner extends Participant {
  session_id: string
  prize_label: string
  draw_pool: 'checked_in_only' | 'all_registered'
  drawn_at: string
}

export default function LuckyDraw({
  eventId,
  eventTitle,
  initialDrawClosedAt,
  isAdmin,
}: Props) {
  const supabase = createClient()
  const [pool, setPool] = useState<'checked_in_only' | 'all_registered'>('checked_in_only')
  const [prizeName, setPrizeName] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [winners, setWinners] = useState<DrawWinner[]>([])
  const [rolling, setRolling] = useState(false)
  const [winner, setWinner] = useState<DrawWinner | null>(null)
  const [displayName, setDisplayName] = useState('???')
  const [drawClosedAt, setDrawClosedAt] = useState<string | null>(initialDrawClosedAt || null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchWinners()
  }, [eventId])

  useEffect(() => {
    fetchParticipants()
  }, [pool, winners])

  async function fetchWinners() {
    const { data, error } = await supabase
      .from('lucky_draw_sessions')
      .select(`
        id,
        prize_label,
        draw_pool,
        drawn_at,
        lucky_draw_winners(
          registrations(
            id,
            full_name,
            is_member,
            cooperative_members(member_no)
          )
        )
      `)
      .eq('event_id', eventId)
      .order('drawn_at')

    if (error) {
      toast.error('โหลดประวัติผู้ได้รับรางวัลไม่สำเร็จ')
      return
    }

    const loaded = (data || []).flatMap((session: any) =>
      (session.lucky_draw_winners || []).map((item: any) => {
        const reg = item.registrations
        return {
          id: reg.id,
          full_name: reg.full_name,
          is_member: reg.is_member,
          member_no: reg.cooperative_members?.member_no,
          session_id: session.id,
          prize_label: session.prize_label,
          draw_pool: session.draw_pool,
          drawn_at: session.drawn_at,
        } as DrawWinner
      })
    )
    setWinners(loaded)
  }

  async function fetchParticipants() {
    const winnerIds = new Set(winners.map(w => w.id))

    if (pool === 'checked_in_only') {
      const { data } = await supabase
        .from('check_ins')
        .select('registrations(id, full_name, is_member, cooperative_members(member_no))')
        .eq('registrations.event_id', eventId)
        .eq('registrations.status', 'active')

      const byId = new Map<string, Participant>()
      ;(data || []).forEach((ci: any) => {
        const reg = ci.registrations
        if (!reg || winnerIds.has(reg.id)) return
        byId.set(reg.id, {
          id: reg.id,
          full_name: reg.full_name,
          is_member: reg.is_member,
          member_no: reg.cooperative_members?.member_no,
        })
      })
      setParticipants(Array.from(byId.values()))
      return
    }

    const { data } = await supabase
      .from('registrations')
      .select('id, full_name, is_member, cooperative_members(member_no)')
      .eq('event_id', eventId)
      .eq('status', 'active')

    const list: Participant[] = (data || [])
      .filter((reg: any) => !winnerIds.has(reg.id))
      .map((reg: any) => ({
        id: reg.id,
        full_name: reg.full_name,
        is_member: reg.is_member,
        member_no: reg.cooperative_members?.member_no,
      }))
    setParticipants(list)
  }

  async function startDraw() {
    if (drawClosedAt) {
      toast.error('การสุ่มรางวัลถูกปิดแล้ว')
      return
    }
    if (!participants.length) return

    setRolling(true)
    setWinner(null)

    let elapsed = 0
    const duration = 4000
    const fastInterval = 80
    const slowInterval = 300

    intervalRef.current = setInterval(() => {
      elapsed += fastInterval
      const randomParticipant = participants[Math.floor(Math.random() * participants.length)]
      setDisplayName(randomParticipant.full_name)

      if (elapsed >= duration) {
        clearInterval(intervalRef.current!)
        let slowCount = 0
        const slow = setInterval(() => {
          slowCount++
          const randomSlow = participants[Math.floor(Math.random() * participants.length)]
          setDisplayName(randomSlow.full_name)
          if (slowCount >= 5) {
            clearInterval(slow)
            const finalWinner = participants[Math.floor(Math.random() * participants.length)]
            setDisplayName(finalWinner.full_name)
            setRolling(false)
            saveWinner(finalWinner)
          }
        }, slowInterval)
      }
    }, fastInterval)
  }

  async function saveWinner(selected: Participant) {
    const { data: { user } } = await supabase.auth.getUser()
    const prizeLabel = prizeName.trim() || 'รางวัล'
    const drawnAt = new Date().toISOString()

    const { data: session, error: sessionError } = await supabase
      .from('lucky_draw_sessions')
      .insert({
        event_id: eventId,
        prize_label: prizeLabel,
        draw_pool: pool,
        drawn_by: user?.id,
      })
      .select('id, drawn_at')
      .single()

    if (sessionError || !session) {
      toast.error('บันทึกผลรางวัลไม่สำเร็จ')
      return
    }

    const { error: winnerError } = await supabase.from('lucky_draw_winners').insert({
      session_id: session.id,
      registration_id: selected.id,
    })

    if (winnerError) {
      toast.error('บันทึกผู้ได้รับรางวัลไม่สำเร็จ')
      return
    }

    const savedWinner: DrawWinner = {
      ...selected,
      session_id: session.id,
      prize_label: prizeLabel,
      draw_pool: pool,
      drawn_at: session.drawn_at || drawnAt,
    }

    setWinner(savedWinner)
    setWinners(prev => [...prev, savedWinner])
    setParticipants(prev => prev.filter(p => p.id !== selected.id))
    toast.success('บันทึกผลรางวัลแล้ว')
  }

  async function updateDrawStatus(action: 'close' | 'reopen') {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/draw/${eventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด')
      setDrawClosedAt(data.drawClosedAt)
      toast.success(action === 'close' ? 'จบการจับรางวัลแล้ว' : 'เปิดให้สุ่มรางวัลต่อแล้ว')
    } catch (err: any) {
      toast.error(err.message || 'อัปเดตสถานะไม่สำเร็จ')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const drawDisabled = rolling || participants.length === 0 || !!drawClosedAt

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-800">ตั้งค่าการสุ่ม</h2>
          <a
            href={`/api/export/${eventId}/draw`}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </a>
        </div>

        {drawClosedAt && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            การจับรางวัลถูกจบแล้ว ปุ่มสุ่มถูกปิดไว้
          </div>
        )}

        <div>
          <label className="label">ชื่อรางวัล</label>
          <input
            type="text"
            value={prizeName}
            onChange={e => setPrizeName(e.target.value)}
            className="input"
            placeholder="เช่น รางวัลที่ 1, ของรางวัลพิเศษ"
            disabled={!!drawClosedAt}
          />
        </div>
        <div>
          <label className="label">สุ่มจาก</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPool('checked_in_only')}
              disabled={!!drawClosedAt}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all',
                pool === 'checked_in_only'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300',
                drawClosedAt && 'opacity-60 cursor-not-allowed'
              )}
            >
              <UserCheck className="w-4 h-4" />
              เฉพาะผู้ที่ Check-in แล้ว
            </button>
            <button
              onClick={() => setPool('all_registered')}
              disabled={!!drawClosedAt}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all',
                pool === 'all_registered'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300',
                drawClosedAt && 'opacity-60 cursor-not-allowed'
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

        {(winner?.prize_label || prizeName) && (
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            {winner?.prize_label || prizeName}
          </p>
        )}

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
            ยินดีด้วย!
          </motion.div>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={startDraw}
            disabled={drawDisabled}
            className={cn(
              'flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-base transition-all',
              winner
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-gold-500 hover:bg-gold-600 text-white',
              drawDisabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Shuffle className={cn('w-5 h-5', rolling && 'animate-spin')} />
            {rolling ? 'กำลังสุ่ม...' : winner ? 'สุ่มรางวัลถัดไป' : 'เริ่มสุ่มรางวัล'}
          </button>

          {!drawClosedAt ? (
            <button
              onClick={() => updateDrawStatus('close')}
              disabled={updatingStatus || rolling}
              className="btn-secondary flex items-center gap-2 px-5 py-3"
            >
              <Lock className="w-4 h-4" />
              จบการจับรางวัล
            </button>
          ) : isAdmin ? (
            <button
              onClick={() => updateDrawStatus('reopen')}
              disabled={updatingStatus}
              className="btn-primary flex items-center gap-2 px-5 py-3"
            >
              <Unlock className="w-4 h-4" />
              เปิดให้สุ่มต่อ
            </button>
          ) : null}
        </div>

        {participants.length === 0 && (
          <p className="text-gray-400 text-sm">ไม่มีผู้เข้าร่วมในกองสุ่มแล้ว</p>
        )}
      </div>

      {winners.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold-500" />
            รายชื่อผู้ได้รับรางวัล ({winners.length} คน)
          </h2>
          <div className="space-y-2">
            {winners.map((w, i) => (
              <div key={w.session_id} className="flex items-center gap-3 p-3 bg-gold-50 rounded-xl">
                <span className="w-7 h-7 rounded-full bg-gold-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">{w.full_name}</p>
                  <p className="text-xs text-gray-500">{w.prize_label}</p>
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
