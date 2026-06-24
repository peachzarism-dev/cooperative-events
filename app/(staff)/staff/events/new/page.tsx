import EventForm from '@/components/events/EventForm'

export default function NewEventPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">สร้างกิจกรรมใหม่</h1>
        <p className="text-gray-500 text-sm mt-0.5">กรอกข้อมูลกิจกรรมที่ต้องการสร้าง</p>
      </div>
      <EventForm mode="create" />
    </div>
  )
}
