import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-primary-600 mb-4">404</p>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">ไม่พบหน้าที่ต้องการ</h1>
        <p className="text-gray-500 mb-6">หน้านี้อาจถูกลบหรือ URL ไม่ถูกต้อง</p>
        <Link href="/" className="btn-primary">กลับหน้าหลัก</Link>
      </div>
    </div>
  )
}
