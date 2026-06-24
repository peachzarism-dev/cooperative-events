'use client'

import { QRCodeSVG } from 'qrcode.react'
import { getRegistrationUrl } from '@/lib/utils'

export default function DashboardQR({ slug }: { slug: string }) {
  const url = getRegistrationUrl(slug)
  return (
    <div className="flex justify-center">
      <div className="p-3 bg-white rounded-2xl shadow-inner border border-gray-100">
        <QRCodeSVG
          value={url}
          size={160}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#1e3a8a"
        />
      </div>
    </div>
  )
}
