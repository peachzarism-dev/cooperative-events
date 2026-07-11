'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { Upload, Search, UserPlus, Edit2, ToggleLeft, ToggleRight, Download } from 'lucide-react'
import type { CooperativeMember } from '@/types/database'
import { formatDateTH } from '@/lib/utils'

export default function MembersClient({ initialMembers }: { initialMembers: CooperativeMember[] }) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [members, setMembers] = useState(initialMembers)
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', email: '' })
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMember, setNewMember] = useState({ member_no: '', full_name: '', phone: '', email: '' })

  const filtered = members.filter(m =>
    m.full_name.includes(search) ||
    m.member_no.includes(search) ||
    (m.email || '').includes(search)
  )

  // ─── Import CSV ─────────────────────────────────────────────
  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        const rows = data.map(row => ({
          member_no: row['เลขสมาชิก'] || row['member_no'] || '',
          full_name: row['ชื่อ-นามสกุล'] || row['full_name'] || '',
          phone: row['เบอร์โทร'] || row['phone'] || null,
          email: row['อีเมล'] || row['email'] || null,
          is_active: true,
        })).filter(r => r.member_no && r.full_name)

        const { data: inserted, error } = await supabase
          .from('cooperative_members')
          .upsert(rows, { onConflict: 'member_no' })
          .select()

        if (error) {
          toast.error('Import ไม่สำเร็จ: ' + error.message)
        } else {
          const { data: { user } } = await supabase.auth.getUser()
          await supabase.from('activity_logs').insert({
            actor_id: user?.id,
            action: 'member_imported',
            target_type: 'member',
            metadata: {
              file_name: file.name,
              total_rows: rows.length,
              imported_rows: inserted?.length || 0,
            },
          })
          toast.success(`Import สำเร็จ ${inserted?.length || 0} รายการ`)
          const { data: refreshed } = await supabase
            .from('cooperative_members').select('*').order('member_no')
          setMembers(refreshed || [])
        }
        setImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
    })
  }

  // ─── Template CSV ────────────────────────────────────────────
  function downloadTemplate() {
    const csv = 'เลขสมาชิก,ชื่อ-นามสกุล,เบอร์โทร,อีเมล\nCM001,นายตัวอย่าง ใจดี,0812345678,example@email.com'
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'template-members.csv'; a.click()
  }

  // ─── Add member ─────────────────────────────────────────────
  async function addMember() {
    if (!newMember.member_no || !newMember.full_name) {
      toast.error('กรุณากรอกเลขสมาชิกและชื่อ-นามสกุล')
      return
    }
    const { data, error } = await supabase
      .from('cooperative_members')
      .insert({ ...newMember, is_active: true })
      .select().single()

    if (error) { toast.error('เพิ่มสมาชิกไม่สำเร็จ: ' + error.message); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activity_logs').insert({
      actor_id: user?.id,
      action: 'member_updated',
      target_type: 'member',
      target_id: data.id,
      metadata: {
        full_name: data.full_name,
        member_no: data.member_no,
        change: 'created',
      },
    })
    setMembers(prev => [data, ...prev])
    setNewMember({ member_no: '', full_name: '', phone: '', email: '' })
    setShowAddForm(false)
    toast.success('เพิ่มสมาชิกสำเร็จ')
  }

  // ─── Edit ────────────────────────────────────────────────────
  async function saveEdit(id: string) {
    const member = members.find(m => m.id === id)
    const { error } = await supabase
      .from('cooperative_members')
      .update(editForm)
      .eq('id', id)
    if (error) { toast.error('บันทึกไม่สำเร็จ'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activity_logs').insert({
      actor_id: user?.id,
      action: 'member_updated',
      target_type: 'member',
      target_id: id,
      metadata: {
        full_name: editForm.full_name,
        member_no: member?.member_no,
        change: 'updated',
      },
    })
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...editForm } : m))
    setEditingId(null)
    toast.success('บันทึกสำเร็จ')
  }

  // ─── Toggle active ───────────────────────────────────────────
  async function toggleActive(member: CooperativeMember) {
    const { error } = await supabase
      .from('cooperative_members')
      .update({ is_active: !member.is_active })
      .eq('id', member.id)
    if (error) { toast.error('เกิดข้อผิดพลาด'); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activity_logs').insert({
      actor_id: user?.id,
      action: 'member_updated',
      target_type: 'member',
      target_id: member.id,
      metadata: {
        full_name: member.full_name,
        member_no: member.member_no,
        change: member.is_active ? 'suspended' : 'activated',
      },
    })
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: !m.is_active } : m))
    toast.success(member.is_active ? 'ระงับสมาชิกแล้ว' : 'เปิดใช้งานสมาชิกแล้ว')
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input flex-1"
            placeholder="ค้นหาชื่อ, เลขสมาชิก, อีเมล..."
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Template CSV
          </button>
          <label className={`btn-secondary flex items-center gap-2 text-sm cursor-pointer ${importing ? 'opacity-50' : ''}`}>
            <Upload className="w-4 h-4" />
            {importing ? 'กำลัง Import...' : 'Import CSV'}
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={importing} />
          </label>
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4" /> เพิ่มสมาชิก
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">เพิ่มสมาชิกใหม่</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">เลขสมาชิก *</label>
              <input type="text" value={newMember.member_no}
                onChange={e => setNewMember(p => ({ ...p, member_no: e.target.value }))}
                className="input" placeholder="CM001" />
            </div>
            <div>
              <label className="label">ชื่อ-นามสกุล *</label>
              <input type="text" value={newMember.full_name}
                onChange={e => setNewMember(p => ({ ...p, full_name: e.target.value }))}
                className="input" placeholder="นายตัวอย่าง ใจดี" />
            </div>
            <div>
              <label className="label">เบอร์โทร</label>
              <input type="tel" value={newMember.phone}
                onChange={e => setNewMember(p => ({ ...p, phone: e.target.value }))}
                className="input" placeholder="08X-XXX-XXXX" />
            </div>
            <div>
              <label className="label">อีเมล</label>
              <input type="email" value={newMember.email}
                onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))}
                className="input" placeholder="email@example.com" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addMember} className="btn-primary">เพิ่มสมาชิก</button>
            <button onClick={() => setShowAddForm(false)} className="btn-secondary">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            แสดง <strong>{filtered.length}</strong> จาก {members.length} รายการ
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">เลขสมาชิก</th>
                <th className="text-left px-4 py-3">ชื่อ-นามสกุล</th>
                <th className="text-left px-4 py-3">เบอร์โทร</th>
                <th className="text-left px-4 py-3">อีเมล</th>
                <th className="text-left px-4 py-3">สถานะ</th>
                <th className="text-left px-4 py-3">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(member => (
                <tr key={member.id} className={`hover:bg-gray-50 ${!member.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs">{member.member_no}</td>
                  <td className="px-4 py-3">
                    {editingId === member.id ? (
                      <input value={editForm.full_name}
                        onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                        className="input py-1 text-sm" />
                    ) : (
                      <span className="font-medium text-gray-800">{member.full_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {editingId === member.id ? (
                      <input value={editForm.phone}
                        onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                        className="input py-1 text-sm" />
                    ) : member.phone || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {editingId === member.id ? (
                      <input value={editForm.email}
                        onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                        className="input py-1 text-sm" />
                    ) : member.email || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {member.is_active
                      ? <span className="badge-success">ใช้งาน</span>
                      : <span className="badge-danger">ระงับ</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {editingId === member.id ? (
                        <>
                          <button onClick={() => saveEdit(member.id)} className="text-success-600 hover:text-success-700 text-xs font-medium">บันทึก</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">ยกเลิก</button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(member.id)
                              setEditForm({ full_name: member.full_name, phone: member.phone || '', email: member.email || '' })
                            }}
                            className="text-gray-400 hover:text-primary-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleActive(member)} className="text-gray-400 hover:text-gray-600">
                            {member.is_active
                              ? <ToggleRight className="w-4 h-4 text-success-500" />
                              : <ToggleLeft className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="text-center text-gray-400 text-sm py-10">ไม่พบข้อมูลสมาชิก</p>
          )}
        </div>
      </div>
    </div>
  )
}
