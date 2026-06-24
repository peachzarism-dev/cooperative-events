'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, User, UserCheck, ChevronRight, Loader2, X } from 'lucide-react'
import type { Event, EventCustomField, CooperativeMember } from '@/types/database'
import { cn } from '@/lib/utils'

interface Props {
  event: Event
  customFields: EventCustomField[]
}

type Step = 'choose-type' | 'search-member' | 'confirm-member' | 'public-form' | 'success'

export default function RegistrationForm({ event, customFields }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('choose-type')
  const [isMember, setIsMember] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CooperativeMember[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedMember, setSelectedMember] = useState<CooperativeMember | null>(null)
  const [loading, setLoading] = useState(false)

  // ฟอร์มข้อมูล
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    custom_fields: {} as Record<string, string | boolean>,
  })

  // ─── ค้นหาสมาชิก ───────────────────────────────────────────
  async function searchMembers() {
    if (searchQuery.trim().length < 2) return
    setSearching(true)
    const q = searchQuery.trim()
    const { data } = await supabase
      .from('cooperative_members')
      .select('*')
      .eq('is_active', true)
      .or(`full_name.ilike.%${q}%,member_no.ilike.%${q}%`)
      .limit(10)
    setSearchResults(data || [])
    setSearching(false)
  }

  // ─── เลือกสมาชิก ───────────────────────────────────────────
  async function selectMember(member: CooperativeMember) {
    // ตรวจสอบว่าเคยลงทะเบียนแล้วหรือยัง
    const { data: existing } = await supabase
      .from('registrations')
      .select('id, status')
      .eq('event_id', event.id)
      .eq('member_id', member.id)
      .single()

    if (existing?.status === 'active') {
      toast.error('ท่านเคยลงทะเบียนกิจกรรมนี้แล้ว', {
        description: 'หากต้องการยกเลิก กรุณาคลิกที่ลิงก์ในอีเมลที่ได้รับ หรือติดต่อเจ้าหน้าที่',
        duration: 6000,
      })
      return
    }

    setSelectedMember(member)
    setFormData(prev => ({
      ...prev,
      full_name: member.full_name,
      phone: member.phone || '',
      email: member.email || '',
    }))
    setStep('confirm-member')
  }

  // ─── ตรวจสอบ email ซ้ำ (บุคคลทั่วไป) ──────────────────────
  async function checkEmailDuplicate(email: string): Promise<boolean> {
    if (!email) return false
    const { data } = await supabase
      .from('registrations')
      .select('id, status')
      .eq('event_id', event.id)
      .eq('email', email)
      .eq('status', 'active')
      .single()
    return !!data
  }

  // ─── Submit ─────────────────────────────────────────────────
  async function handleSubmit() {
    setLoading(true)

    try {
      // ตรวจสอบ email ซ้ำสำหรับบุคคลทั่วไป
      if (!isMember && formData.email) {
        const isDuplicate = await checkEmailDuplicate(formData.email)
        if (isDuplicate) {
          toast.error('อีเมลนี้เคยลงทะเบียนกิจกรรมนี้แล้ว', {
            description: 'หากต้องการยกเลิก กรุณาคลิกที่ลิงก์ในอีเมลที่ได้รับ',
            duration: 6000,
          })
          setLoading(false)
          return
        }
      }

      const payload = {
        event_id: event.id,
        member_id: selectedMember?.id || null,
        is_member: isMember,
        full_name: formData.full_name,
        phone: formData.phone || null,
        email: formData.email || null,
        custom_field_values: Object.keys(formData.custom_fields).length > 0
          ? formData.custom_fields
          : null,
      }

      const { data: reg, error } = await supabase
        .from('registrations')
        .insert(payload)
        .select('qr_token')
        .single()

      if (error) throw error

      // ส่ง email ผ่าน API route
      if (formData.email) {
        await fetch('/api/registrations/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            fullName: formData.full_name,
            eventTitle: event.title,
            eventDate: event.start_date,
            eventLocation: event.location,
            qrToken: reg.qr_token,
          }),
        })
      }

      setStep('success')
      setTimeout(() => {
        router.push(`/confirm/${reg.qr_token}`)
      }, 1500)
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ─── RENDER ─────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <div className="card p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
          <UserCheck className="w-8 h-8 text-success-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">ลงทะเบียนสำเร็จ!</h2>
        <p className="text-gray-500 text-sm">กำลังพาท่านไปยังหน้า QR Code...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Step 1: เลือกประเภทผู้ลงทะเบียน */}
      {step === 'choose-type' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">เริ่มต้นลงทะเบียน</h2>
          <p className="text-gray-500 text-sm mb-6">กรุณาเลือกประเภทของท่าน</p>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => { setIsMember(true); setStep('search-member') }}
              className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary-200 bg-primary-50 hover:border-primary-500 hover:bg-primary-100 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-primary-900">สมาชิกสหกรณ์</p>
                <p className="text-sm text-primary-600">ค้นหารายชื่อจากระบบสมาชิก</p>
              </div>
              <ChevronRight className="w-5 h-5 text-primary-400" />
            </button>

            {event.allow_public && (
              <button
                onClick={() => { setIsMember(false); setStep('public-form') }}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-600 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">บุคคลทั่วไป</p>
                  <p className="text-sm text-gray-500">กรอกข้อมูลของท่านเอง</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: ค้นหาสมาชิก */}
      {step === 'search-member' && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setStep('choose-type')} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800">ค้นหาสมาชิก</h2>
          </div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchMembers()}
              className="input flex-1"
              placeholder="ชื่อ-นามสกุล หรือ เลขสมาชิก"
              autoFocus
            />
            <button onClick={searchMembers} disabled={searching} className="btn-primary px-4">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {searchResults.map((member, i) => (
                <button
                  key={member.id}
                  onClick={() => selectMember(member)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 text-left hover:bg-primary-50 transition-colors',
                    i !== 0 && 'border-t border-gray-100'
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    <span className="text-primary-700 font-semibold text-sm">
                      {member.full_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{member.full_name}</p>
                    <p className="text-xs text-gray-500">เลขสมาชิก: {member.member_no}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </button>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !searching && (
            <p className="text-center text-gray-500 text-sm py-6">
              ไม่พบข้อมูลสมาชิก กรุณาตรวจสอบชื่อหรือเลขสมาชิก
            </p>
          )}
        </div>
      )}

      {/* Step 3: ยืนยันสมาชิก + กรอกข้อมูลเพิ่ม */}
      {(step === 'confirm-member' || step === 'public-form') && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => setStep(isMember ? 'search-member' : 'choose-type')}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800">
              {isMember ? 'ยืนยันข้อมูลการลงทะเบียน' : 'กรอกข้อมูลผู้ลงทะเบียน'}
            </h2>
          </div>

          {/* แสดงข้อมูลสมาชิกที่เลือก */}
          {isMember && selectedMember && (
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-200 flex items-center justify-center">
                  <span className="text-primary-800 font-bold">{selectedMember.full_name.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold text-primary-900">{selectedMember.full_name}</p>
                  <p className="text-sm text-primary-600">เลขสมาชิก: {selectedMember.member_no}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* ชื่อ-นามสกุล (บุคคลทั่วไปเท่านั้น) */}
            {!isMember && (
              <div>
                <label className="label">ชื่อ-นามสกุล <span className="text-danger-500">*</span></label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
                  className="input"
                  placeholder="กรอกชื่อ-นามสกุล"
                  required
                />
              </div>
            )}

            {/* เบอร์โทรศัพท์ */}
            <div>
              <label className="label">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                className="input"
                placeholder="08X-XXX-XXXX"
              />
            </div>

            {/* อีเมล */}
            <div>
              <label className="label">อีเมล <span className="text-gray-400 font-normal text-xs">(สำหรับรับ QR Code)</span></label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                className="input"
                placeholder="email@example.com"
              />
            </div>

            {/* Custom Fields */}
            {customFields
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(field => (
                <div key={field.id}>
                  <label className="label">
                    {field.field_name}
                    {field.is_required && <span className="text-danger-500 ml-1">*</span>}
                  </label>
                  {field.field_type === 'text' && (
                    <input
                      type="text"
                      value={(formData.custom_fields[field.id] as string) || ''}
                      onChange={e => setFormData(p => ({
                        ...p,
                        custom_fields: { ...p.custom_fields, [field.id]: e.target.value }
                      }))}
                      className="input"
                      required={field.is_required}
                    />
                  )}
                  {field.field_type === 'number' && (
                    <input
                      type="number"
                      value={(formData.custom_fields[field.id] as string) || ''}
                      onChange={e => setFormData(p => ({
                        ...p,
                        custom_fields: { ...p.custom_fields, [field.id]: e.target.value }
                      }))}
                      className="input"
                      required={field.is_required}
                    />
                  )}
                  {field.field_type === 'select' && field.options && (
                    <select
                      value={(formData.custom_fields[field.id] as string) || ''}
                      onChange={e => setFormData(p => ({
                        ...p,
                        custom_fields: { ...p.custom_fields, [field.id]: e.target.value }
                      }))}
                      className="input"
                      required={field.is_required}
                    >
                      <option value="">-- เลือก --</option>
                      {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  {field.field_type === 'checkbox' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.custom_fields[field.id] as boolean) || false}
                        onChange={e => setFormData(p => ({
                          ...p,
                          custom_fields: { ...p.custom_fields, [field.id]: e.target.checked }
                        }))}
                        className="w-4 h-4 rounded text-primary-600"
                      />
                      <span className="text-sm text-gray-700">ยืนยัน</span>
                    </label>
                  )}
                </div>
              ))}

            <button
              onClick={handleSubmit}
              disabled={loading || (!isMember && !formData.full_name)}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังลงทะเบียน...
                </span>
              ) : (
                'ยืนยันการลงทะเบียน'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
