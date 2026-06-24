// lib/utils/index.ts

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** สร้าง slug สั้นสำหรับ URL กิจกรรม */
export function generateSlug(_title: string): string {
  return Date.now().toString(36)
}

/** แปลงวันที่เป็นภาษาไทย */
export function formatDateTH(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTimeTH(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** คำนวณ % */
export function percent(part: number, total: number): string {
  if (total === 0) return '0'
  return ((part / total) * 100).toFixed(1)
}

/** ตัด string ให้สั้นลง */
export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str
}

/** สร้าง URL สำหรับหน้าลงทะเบียน */
export function getRegistrationUrl(slug: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${base}/events/${encodeURIComponent(slug)}`
}

/** สร้าง URL สำหรับดู QR Code */
export function getQrPageUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${base}/confirm/${token}`
}
