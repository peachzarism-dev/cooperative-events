'use client'

import { Download, X } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  token: string
  eventTitle: string
  fullName: string
  eventDate: string
  eventLocation?: string | null
}

export default function TicketActions({
  token,
  eventTitle,
  fullName,
  eventDate,
  eventLocation,
}: Props) {
  async function downloadTicketImage() {
    const qrSvg = document.querySelector('[data-ticket-qr] svg')
    if (!qrSvg) {
      toast.error('ไม่พบ QR Code สำหรับบันทึก')
      return
    }

    const width = 900
    const height = 1280
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#ffffff'
    roundRect(ctx, 70, 70, 760, 1140, 28)
    ctx.fill()

    const header = ctx.createLinearGradient(70, 70, 830, 270)
    header.addColorStop(0, '#1e3a8a')
    header.addColorStop(1, '#2563eb')
    ctx.fillStyle = header
    roundRect(ctx, 70, 70, 760, 230, 28)
    ctx.fill()
    ctx.fillRect(70, 250, 760, 50)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#bfdbfe'
    ctx.font = '600 28px Sarabun, Arial, sans-serif'
    ctx.fillText('บัตรเข้าร่วมกิจกรรม', width / 2, 145)

    ctx.fillStyle = '#ffffff'
    ctx.font = '700 42px Sarabun, Arial, sans-serif'
    drawWrappedText(ctx, eventTitle, width / 2, 205, 660, 50, 2)

    const svgText = new XMLSerializer().serializeToString(qrSvg)
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    const qrImage = await loadImage(svgUrl)
    URL.revokeObjectURL(svgUrl)

    ctx.fillStyle = '#ffffff'
    roundRect(ctx, 250, 365, 400, 400, 24)
    ctx.fill()
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 4
    roundRect(ctx, 250, 365, 400, 400, 24)
    ctx.stroke()
    ctx.drawImage(qrImage, 310, 425, 280, 280)

    ctx.fillStyle = '#64748b'
    ctx.font = '500 24px Sarabun, Arial, sans-serif'
    ctx.fillText('ชื่อผู้ลงทะเบียน', width / 2, 850)

    ctx.fillStyle = '#111827'
    ctx.font = '700 44px Sarabun, Arial, sans-serif'
    drawWrappedText(ctx, fullName, width / 2, 910, 680, 52, 2)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#374151'
    ctx.font = '500 30px Sarabun, Arial, sans-serif'
    ctx.fillText(`วันที่: ${eventDate}`, 150, 1040)
    if (eventLocation) {
      drawWrappedText(ctx, `สถานที่: ${eventLocation}`, 150, 1100, 620, 38, 2, 'left')
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = '#94a3b8'
    ctx.font = '400 22px Sarabun, Arial, sans-serif'
    ctx.fillText(`รหัสยืนยัน: ${token.slice(0, 12)}`, width / 2, 1170)

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `ticket-${token.slice(0, 8)}.png`
    link.click()
  }

  function closePage() {
    window.close()
    setTimeout(() => {
      if (!window.closed) {
        window.location.href = '/'
      }
    }, 200)
  }

  return (
    <div className="grid grid-cols-1 gap-2 mt-4">
      <button onClick={downloadTicketImage} className="btn-primary flex items-center justify-center gap-2">
        <Download className="w-4 h-4" />
        บันทึกบัตรเป็นรูปภาพ
      </button>
      <button onClick={closePage} className="btn-secondary flex items-center justify-center gap-2">
        <X className="w-4 h-4" />
        ปิดหน้านี้
      </button>
    </div>
  )
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  align: CanvasTextAlign = 'center'
) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''

  words.forEach(word => {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = testLine
    }
  })
  if (line) lines.push(line)

  ctx.textAlign = align
  lines.slice(0, maxLines).forEach((lineText, index) => {
    ctx.fillText(lineText, x, y + index * lineHeight)
  })
}
