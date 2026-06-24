-- ============================================================
-- 003_draw_controls.sql
-- เพิ่มสถานะจบการสุ่มรางวัล โดยไม่ลบประวัติผู้ได้รับรางวัลเดิม
-- ============================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS draw_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS draw_closed_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_draw_closed
  ON events(draw_closed_at)
  WHERE deleted_at IS NULL;
