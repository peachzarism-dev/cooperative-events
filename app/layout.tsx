import type { Metadata } from 'next'
import { Sarabun } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sarabun',
})

export const metadata: Metadata = {
  title: 'ระบบลงทะเบียนกิจกรรมสหกรณ์',
  description: 'ลงทะเบียนเข้าร่วมกิจกรรมของสหกรณ์',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
