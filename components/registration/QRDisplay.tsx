'use client'

import { QRCodeSVG } from 'qrcode.react'
import { getQrPageUrl } from '@/lib/utils'

interface Props {
  token: string
  size?: number
}

export default function QRDisplay({ token, size = 200 }: Props) {
  const url = getQrPageUrl(token)
  return (
    <div className="p-3 bg-white rounded-2xl shadow-inner border border-gray-100">
      <QRCodeSVG
        value={url}
        size={size}
        level="M"
        includeMargin={false}
        bgColor="#ffffff"
        fgColor="#1e3a8a"
      />
    </div>
  )
}
