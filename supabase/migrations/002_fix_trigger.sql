-- ============================================================
-- 002_fix_trigger.sql
-- แก้ไข handle_new_user trigger ให้ทนทานต่อ metadata ที่ไม่สมบูรณ์
-- รัน SQL นี้ใน Supabase SQL Editor หากเคยรัน 001 ไปแล้ว
-- ============================================================

-- 1. แก้ไข trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role user_role := 'staff';
  _raw_role TEXT;
BEGIN
  -- ดึง role จาก metadata อย่างปลอดภัย (ไม่ crash ถ้าไม่มี key)
  _raw_role := NEW.raw_user_meta_data->>'role';
  IF _raw_role IN ('admin', 'staff') THEN
    _role := _raw_role::user_role;
  END IF;

  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    _role
  )
  ON CONFLICT (id) DO NOTHING;  -- ป้องกัน duplicate

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. สร้าง profile ให้ user ที่มีอยู่แล้วแต่ยังไม่มี profile
-- (กรณีที่ trigger เคย error ทำให้ profile ไม่ถูกสร้าง)
INSERT INTO profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  'staff'::user_role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. ตรวจสอบผลลัพธ์
SELECT
  u.email,
  p.role,
  p.full_name,
  p.is_active
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;
