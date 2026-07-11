'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import type { Event } from '@/types/database'

export default function ToggleRegistrationButton({ event }: { event: Event }) {
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(event.is_registration_open)
  const router = useRouter()
  const supabase = createClient()

  async function toggle() {
    setLoading(true)
    const newValue = !isOpen

    const updates: Partial<Event> = { is_registration_open: newValue }
    if (newValue && !isOpen) {
      // เปิดรอบใหม่ → เพิ่ม round
      updates.registration_round = event.registration_round + 1
    }

    const { error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', event.id)

    if (error) {
      toast.error('เกิดข้อผิดพลาด')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('activity_logs').insert({
        actor_id: user?.id,
        action: 'event_updated',
        target_type: 'event',
        target_id: event.id,
        metadata: {
          title: event.title,
          registration_open: newValue,
          registration_round: updates.registration_round || event.registration_round,
        },
      })
      setIsOpen(newValue)
      toast.success(newValue ? 'เปิดรับลงทะเบียนแล้ว' : 'ปิดรับลงทะเบียนแล้ว')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
        isOpen
          ? 'bg-success-100 text-success-700 hover:bg-success-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : isOpen ? (
        <ToggleRight className="w-5 h-5" />
      ) : (
        <ToggleLeft className="w-5 h-5" />
      )}
      {isOpen ? 'เปิดรับอยู่' : 'ปิดรับอยู่'}
    </button>
  )
}
