'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'
import {
  LayoutDashboard, Calendar, Users, QrCode,
  Gift, UserCog, FileText, LogOut, ChevronRight, Menu, X
} from 'lucide-react'
import { useState } from 'react'

interface Props { profile: Profile }

const staffNav = [
  { href: '/staff/dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
  { href: '/staff/events', label: 'กิจกรรม', icon: Calendar },
]

const adminNav = [
  { href: '/admin/dashboard', label: 'ภาพรวมระบบ', icon: LayoutDashboard },
  { href: '/admin/events', label: 'จัดการกิจกรรม', icon: Calendar },
  { href: '/admin/users', label: 'จัดการเจ้าหน้าที่', icon: UserCog },
  { href: '/admin/members', label: 'ฐานข้อมูลสมาชิก', icon: Users },
  { href: '/admin/logs', label: 'Activity Logs', icon: FileText },
]

export default function StaffSidebar({ profile }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = profile.role === 'admin'
  const navItems = isAdmin ? adminNav : staffNav

  // เพิ่ม staff nav สำหรับ admin ด้วย
  const allNav = isAdmin
    ? [...adminNav, { href: '/staff/events', label: 'สร้าง/แก้ไขกิจกรรม (Staff View)', icon: Calendar }]
    : staffNav

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm leading-tight">ระบบลงทะเบียน</p>
            <p className="text-xs text-gray-400">กิจกรรมสหกรณ์</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {(isAdmin ? adminNav : staffNav).map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          )
        })}

        {/* Quick links สำหรับ staff */}
        {!isAdmin && (
          <div className="pt-4 mt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-2">
              จัดการ
            </p>
            {[
              { href: '/staff/checkin', label: 'Check-in', icon: QrCode },
              { href: '/staff/draw', label: 'สุ่มรางวัล', icon: Gift },
            ].map(item => {
              const Icon = item.icon
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    active
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <span className="text-primary-700 font-semibold text-xs">
              {profile.full_name.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{profile.full_name}</p>
            <p className="text-xs text-gray-400">
              {profile.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-gray-200 bg-white shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white border border-gray-200 rounded-xl shadow flex items-center justify-center"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-50 shadow-xl">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}
