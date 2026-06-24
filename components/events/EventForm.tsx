'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { generateSlug } from '@/lib/utils'
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react'
import type { Event, EventDay, EventCustomField, CreateEventInput } from '@/types/database'

interface Props {
  event?: Event & { event_days?: EventDay[]; event_custom_fields?: EventCustomField[] }
  mode: 'create' | 'edit'
}

interface CustomFieldDraft {
  id?: string
  field_name: string
  field_type: 'text' | 'number' | 'select' | 'checkbox'
  options: string
  is_required: boolean
  sort_order: number
}

interface EventDayDraft {
  id?: string
  date: string
  label: string
  sort_order: number
}

export default function EventForm({ event, mode }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    start_date: event?.start_date || '',
    end_date: event?.end_date || '',
    is_multi_day: event?.is_multi_day || false,
    max_participants: event?.max_participants?.toString() || '',
    is_registration_open: event?.is_registration_open ?? false,
    closed_message: event?.closed_message || 'ขณะนี้ปิดรับการลงทะเบียนแล้ว',
    allow_public: event?.allow_public ?? true,
  })

  const [eventDays, setEventDays] = useState<EventDayDraft[]>(
    event?.event_days?.map(d => ({ id: d.id, date: d.date, label: d.label, sort_order: d.sort_order })) || []
  )

  const [customFields, setCustomFields] = useState<CustomFieldDraft[]>(
    event?.event_custom_fields?.map(f => ({
      id: f.id,
      field_name: f.field_name,
      field_type: f.field_type,
      options: f.options?.join(',') || '',
      is_required: f.is_required,
      sort_order: f.sort_order,
    })) || []
  )

  function addDay() {
    setEventDays(prev => [...prev, {
      date: form.start_date || '',
      label: `วันที่ ${prev.length + 1}`,
      sort_order: prev.length,
    }])
  }

  function addField() {
    setCustomFields(prev => [...prev, {
      field_name: '',
      field_type: 'text',
      options: '',
      is_required: false,
      sort_order: prev.length,
    }])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const slug = mode === 'create' ? generateSlug(form.title) : event!.slug

      const eventPayload = {
        title: form.title,
        description: form.description || null,
        location: form.location || null,
        start_date: form.start_date,
        end_date: form.end_date,
        is_multi_day: form.is_multi_day,
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        is_registration_open: form.is_registration_open,
        closed_message: form.closed_message,
        allow_public: form.allow_public,
        slug,
        ...(mode === 'create' ? { created_by: user?.id } : { updated_by: user?.id }),
      }

      let eventId = event?.id
      if (mode === 'create') {
        const { data, error } = await supabase.from('events').insert(eventPayload).select('id').single()
        if (error) throw error
        eventId = data.id
      } else {
        const { error } = await supabase.from('events').update(eventPayload).eq('id', eventId!)
        if (error) throw error
        // ลบวันเดิมและ fields เดิม
        await supabase.from('event_days').delete().eq('event_id', eventId!)
        await supabase.from('event_custom_fields').delete().eq('event_id', eventId!)
      }

      // บันทึกวันกิจกรรม (multi-day)
      if (form.is_multi_day && eventDays.length > 0) {
        await supabase.from('event_days').insert(
          eventDays.map((d, i) => ({ event_id: eventId!, date: d.date, label: d.label, sort_order: i }))
        )
      }

      // บันทึก custom fields
      if (customFields.length > 0) {
        await supabase.from('event_custom_fields').insert(
          customFields
            .filter(f => f.field_name.trim())
            .map((f, i) => ({
              event_id: eventId!,
              field_name: f.field_name,
              field_type: f.field_type,
              options: f.field_type === 'select' && f.options
                ? f.options.split(',').map(o => o.trim()).filter(Boolean)
                : null,
              is_required: f.is_required,
              sort_order: i,
            }))
        )
      }

      toast.success(mode === 'create' ? 'สร้างกิจกรรมสำเร็จ' : 'บันทึกการแก้ไขสำเร็จ')
      router.push(`/staff/events/${eventId}/dashboard`)
      router.refresh()
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* ข้อมูลพื้นฐาน */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 text-lg">ข้อมูลกิจกรรม</h2>

        <div>
          <label className="label">ชื่อกิจกรรม *</label>
          <input type="text" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="input" required placeholder="ชื่อกิจกรรม" />
        </div>

        <div>
          <label className="label">รายละเอียด</label>
          <textarea value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="input min-h-[100px] resize-y" placeholder="รายละเอียดกิจกรรม..." />
        </div>

        <div>
          <label className="label">สถานที่</label>
          <input type="text" value={form.location}
            onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            className="input" placeholder="ชื่อสถานที่, ห้องประชุม..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">วันเริ่มกิจกรรม *</label>
            <input type="date" value={form.start_date}
              onChange={e => setForm(p => ({ ...p, start_date: e.target.value, end_date: p.end_date || e.target.value }))}
              className="input" required />
          </div>
          <div>
            <label className="label">วันสิ้นสุดกิจกรรม *</label>
            <input type="date" value={form.end_date} min={form.start_date}
              onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
              className="input" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">จำนวนผู้เข้าร่วมสูงสุด</label>
            <input type="number" value={form.max_participants}
              onChange={e => setForm(p => ({ ...p, max_participants: e.target.value }))}
              className="input" placeholder="ไม่จำกัด" min="1" />
          </div>
        </div>

        {/* Toggle options */}
        <div className="space-y-3">
          <ToggleField
            label="กิจกรรมหลายวัน"
            desc="สามารถ check-in แยกรายวันได้"
            checked={form.is_multi_day}
            onChange={v => setForm(p => ({ ...p, is_multi_day: v }))}
          />
          <ToggleField
            label="เปิดรับลงทะเบียน"
            desc="ผู้เข้าร่วมสามารถลงทะเบียนได้"
            checked={form.is_registration_open}
            onChange={v => setForm(p => ({ ...p, is_registration_open: v }))}
          />
          <ToggleField
            label="เปิดรับบุคคลทั่วไป"
            desc="ไม่ใช่เฉพาะสมาชิกสหกรณ์"
            checked={form.allow_public}
            onChange={v => setForm(p => ({ ...p, allow_public: v }))}
          />
        </div>

        {!form.is_registration_open && (
          <div>
            <label className="label">ข้อความเมื่อปิดรับลงทะเบียน</label>
            <textarea value={form.closed_message}
              onChange={e => setForm(p => ({ ...p, closed_message: e.target.value }))}
              className="input" rows={2} />
          </div>
        )}
      </div>

      {/* Multi-day config */}
      {form.is_multi_day && (
        <div className="card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">วันกิจกรรม</h2>
            <button type="button" onClick={addDay} className="btn-secondary text-sm flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> เพิ่มวัน
            </button>
          </div>
          {eventDays.map((day, i) => (
            <div key={i} className="flex gap-2 items-center">
              <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
              <input type="date" value={day.date} min={form.start_date} max={form.end_date}
                onChange={e => setEventDays(prev => prev.map((d, idx) => idx === i ? { ...d, date: e.target.value } : d))}
                className="input w-40" />
              <input type="text" value={day.label}
                onChange={e => setEventDays(prev => prev.map((d, idx) => idx === i ? { ...d, label: e.target.value } : d))}
                className="input flex-1" placeholder={`วันที่ ${i + 1}`} />
              <button type="button" onClick={() => setEventDays(prev => prev.filter((_, idx) => idx !== i))}
                className="text-danger-400 hover:text-danger-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Custom Fields */}
      <div className="card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">ฟิลด์เพิ่มเติมในฟอร์ม</h2>
            <p className="text-xs text-gray-400 mt-0.5">ข้อมูลพิเศษที่ต้องการเก็บจากผู้ลงทะเบียน</p>
          </div>
          <button type="button" onClick={addField} className="btn-secondary text-sm flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> เพิ่มฟิลด์
          </button>
        </div>
        {customFields.map((field, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex gap-2">
              <input type="text" value={field.field_name}
                onChange={e => setCustomFields(prev => prev.map((f, idx) => idx === i ? { ...f, field_name: e.target.value } : f))}
                className="input flex-1" placeholder="ชื่อฟิลด์ (เช่น หน่วยงาน, ขนาดเสื้อ)" />
              <select value={field.field_type}
                onChange={e => setCustomFields(prev => prev.map((f, idx) => idx === i ? { ...f, field_type: e.target.value as any } : f))}
                className="input w-32">
                <option value="text">ข้อความ</option>
                <option value="number">ตัวเลข</option>
                <option value="select">เลือก</option>
                <option value="checkbox">Checkbox</option>
              </select>
              <button type="button" onClick={() => setCustomFields(prev => prev.filter((_, idx) => idx !== i))}
                className="text-danger-400 hover:text-danger-600 p-2">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {field.field_type === 'select' && (
              <input type="text" value={field.options}
                onChange={e => setCustomFields(prev => prev.map((f, idx) => idx === i ? { ...f, options: e.target.value } : f))}
                className="input text-sm" placeholder="ตัวเลือก1,ตัวเลือก2,ตัวเลือก3 (คั่นด้วยคอมมา)" />
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={field.is_required}
                onChange={e => setCustomFields(prev => prev.map((f, idx) => idx === i ? { ...f, is_required: e.target.checked } : f))}
                className="w-4 h-4 rounded" />
              <span className="text-gray-600">บังคับกรอก</span>
            </label>
          </div>
        ))}
        {customFields.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-4">ยังไม่มีฟิลด์เพิ่มเติม</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 px-6 py-2.5">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'create' ? 'สร้างกิจกรรม' : 'บันทึกการแก้ไข'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary px-6 py-2.5">
          ยกเลิก
        </button>
      </div>
    </form>
  )
}

function ToggleField({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}
