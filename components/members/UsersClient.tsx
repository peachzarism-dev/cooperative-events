'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { UserPlus, ToggleLeft, ToggleRight, Shield, User } from 'lucide-react'
import type { Profile } from '@/types/database'
import { formatDateTimeTH } from '@/lib/utils'

export default function UsersClient({ initialUsers }: { initialUsers: Profile[] }) {
  const supabase = createClient()
  const [users, setUsers] = useState(initialUsers)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function addStaff() {
    if (!form.email || !form.full_name || !form.password) {
      toast.error('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setLoading(true)

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: 'staff' }),
    })

    if (res.ok) {
      const { profile } = await res.json()
      setUsers(prev => [profile, ...prev])
      setForm({ email: '', full_name: '', password: '' })
      setShowAdd(false)
      toast.success('เพิ่มเจ้าหน้าที่สำเร็จ')
    } else {
      const err = await res.json()
      toast.error('เพิ่มไม่สำเร็จ: ' + (err.error || 'เกิดข้อผิดพลาด'))
    }
    setLoading(false)
  }

  async function toggleUser(user: Profile) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !user.is_active })
      .eq('id', user.id)

    if (error) { toast.error('เกิดข้อผิดพลาด'); return }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
    toast.success(user.is_active ? 'ระงับผู้ใช้แล้ว' : 'เปิดใช้งานแล้ว')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> เพิ่มเจ้าหน้าที่
        </button>
      </div>

      {showAdd && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">เพิ่มเจ้าหน้าที่ใหม่</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">ชื่อ-นามสกุล *</label>
              <input type="text" value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                className="input" placeholder="ชื่อเจ้าหน้าที่" />
            </div>
            <div>
              <label className="label">อีเมล *</label>
              <input type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="input" placeholder="staff@example.com" />
            </div>
            <div>
              <label className="label">รหัสผ่าน *</label>
              <input type="password" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="input" placeholder="อย่างน้อย 8 ตัวอักษร" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addStaff} disabled={loading} className="btn-primary">
              {loading ? 'กำลังสร้าง...' : 'สร้างบัญชี'}
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">ยกเลิก</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <th className="text-left px-5 py-3">ชื่อ</th>
              <th className="text-left px-5 py-3">อีเมล</th>
              <th className="text-left px-5 py-3">บทบาท</th>
              <th className="text-left px-5 py-3">เข้าสู่ระบบล่าสุด</th>
              <th className="text-left px-5 py-3">สถานะ</th>
              <th className="text-left px-5 py-3">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(user => (
              <tr key={user.id} className={`hover:bg-gray-50 ${!user.is_active ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3 font-medium text-gray-800">{user.full_name}</td>
                <td className="px-5 py-3 text-gray-500">{user.email}</td>
                <td className="px-5 py-3">
                  {user.role === 'admin'
                    ? <span className="badge-blue flex items-center gap-1 w-fit"><Shield className="w-3 h-3" />Admin</span>
                    : <span className="badge-gray flex items-center gap-1 w-fit"><User className="w-3 h-3" />Staff</span>}
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {user.last_login ? formatDateTimeTH(user.last_login) : 'ยังไม่เคย'}
                </td>
                <td className="px-5 py-3">
                  {user.is_active
                    ? <span className="badge-success">ใช้งาน</span>
                    : <span className="badge-danger">ระงับ</span>}
                </td>
                <td className="px-5 py-3">
                  {user.role !== 'admin' && (
                    <button onClick={() => toggleUser(user)} title={user.is_active ? 'ระงับ' : 'เปิดใช้งาน'}>
                      {user.is_active
                        ? <ToggleRight className="w-5 h-5 text-success-500 hover:text-success-700" />
                        : <ToggleLeft className="w-5 h-5 text-gray-400 hover:text-gray-600" />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
