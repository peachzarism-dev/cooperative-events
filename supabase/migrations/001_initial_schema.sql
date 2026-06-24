-- ============================================================
-- 001_initial_schema.sql
-- ระบบลงทะเบียนกิจกรรมสหกรณ์
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'staff');
CREATE TYPE registration_status AS ENUM ('active', 'cancelled');
CREATE TYPE cancelled_by_type AS ENUM ('self', 'staff');
CREATE TYPE field_type AS ENUM ('text', 'number', 'select', 'checkbox');
CREATE TYPE draw_pool_type AS ENUM ('all_registered', 'checked_in_only');
CREATE TYPE log_action AS ENUM (
  'event_created', 'event_updated', 'event_deleted',
  'registration_created', 'registration_cancelled',
  'checkin_completed',
  'draw_conducted',
  'user_created', 'user_suspended', 'user_activated',
  'member_imported', 'member_updated'
);

-- ============================================================
-- TABLE: profiles (extends Supabase Auth users)
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'staff',
  linked_member_id UUID,                        -- FK added after cooperative_members
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: cooperative_members
-- ============================================================

CREATE TABLE cooperative_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_no     TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from profiles to cooperative_members
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_member
  FOREIGN KEY (linked_member_id) REFERENCES cooperative_members(id) ON DELETE SET NULL;

-- ============================================================
-- TABLE: events
-- ============================================================

CREATE TABLE events (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                 TEXT NOT NULL,
  description           TEXT,
  location              TEXT,
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  is_multi_day          BOOLEAN NOT NULL DEFAULT FALSE,
  max_participants      INTEGER,                         -- NULL = unlimited
  is_registration_open  BOOLEAN NOT NULL DEFAULT FALSE,
  registration_round    INTEGER NOT NULL DEFAULT 1,
  closed_message        TEXT NOT NULL DEFAULT 'ขณะนี้ปิดรับการลงทะเบียนแล้ว',
  allow_public          BOOLEAN NOT NULL DEFAULT TRUE,   -- อนุญาตบุคคลทั่วไป
  slug                  TEXT NOT NULL UNIQUE,
  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  deleted_at            TIMESTAMPTZ,                    -- soft delete (admin only)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: event_days (multi-day support)
-- ============================================================

CREATE TABLE event_days (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  label       TEXT NOT NULL,               -- เช่น "วันที่ 1 — อบรมภาคทฤษฎี"
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: event_custom_fields
-- ============================================================

CREATE TABLE event_custom_fields (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  field_name  TEXT NOT NULL,
  field_type  field_type NOT NULL DEFAULT 'text',
  options     JSONB,                       -- ["ตัวเลือก A", "ตัวเลือก B"] สำหรับ select
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: registrations
-- ============================================================

CREATE TABLE registrations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id             UUID REFERENCES cooperative_members(id) ON DELETE SET NULL,
  is_member             BOOLEAN NOT NULL DEFAULT FALSE,
  full_name             TEXT NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  custom_field_values   JSONB,            -- { "field_id": "value", ... }
  qr_token              TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status                registration_status NOT NULL DEFAULT 'active',
  cancelled_at          TIMESTAMPTZ,
  cancelled_by          cancelled_by_type,
  cancelled_by_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  registered_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: check_ins
-- ============================================================

CREATE TABLE check_ins (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id   UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  event_day_id      UUID REFERENCES event_days(id) ON DELETE SET NULL,   -- NULL = single-day
  checked_in_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_in_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note              TEXT
);

-- Prevent duplicate check-in per day
CREATE UNIQUE INDEX uq_checkin_per_day
  ON check_ins (registration_id, COALESCE(event_day_id, '00000000-0000-0000-0000-000000000000'::UUID));

-- ============================================================
-- TABLE: lucky_draw_sessions
-- ============================================================

CREATE TABLE lucky_draw_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  prize_label     TEXT NOT NULL,
  draw_pool       draw_pool_type NOT NULL DEFAULT 'checked_in_only',
  drawn_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  drawn_by        UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLE: lucky_draw_winners
-- ============================================================

CREATE TABLE lucky_draw_winners (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id            UUID NOT NULL REFERENCES lucky_draw_sessions(id) ON DELETE CASCADE,
  registration_id       UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: activity_logs
-- ============================================================

CREATE TABLE activity_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action        log_action NOT NULL,
  target_type   TEXT,                     -- 'event' | 'registration' | 'user' | 'member'
  target_id     UUID,
  metadata      JSONB,                    -- ข้อมูลเพิ่มเติม เช่น ชื่อกิจกรรม
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_events_slug ON events(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_dates ON events(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_member ON registrations(member_id);
CREATE INDEX idx_registrations_email ON registrations(email);
CREATE INDEX idx_registrations_qr ON registrations(qr_token);
CREATE INDEX idx_registrations_status ON registrations(event_id, status);
CREATE INDEX idx_checkins_registration ON check_ins(registration_id);
CREATE INDEX idx_members_member_no ON cooperative_members(member_no);
CREATE INDEX idx_members_full_name ON cooperative_members USING GIN (to_tsvector('simple', full_name));
CREATE INDEX idx_logs_actor ON activity_logs(actor_id);
CREATE INDEX idx_logs_target ON activity_logs(target_type, target_id);
CREATE INDEX idx_logs_created ON activity_logs(created_at DESC);

-- ============================================================
-- VIEWS
-- ============================================================

-- สถิติรายกิจกรรม
CREATE VIEW event_stats AS
SELECT
  e.id AS event_id,
  e.title,
  e.max_participants,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'active')                          AS total_registered,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'cancelled')                       AS total_cancelled,
  COUNT(DISTINCT ci.registration_id)                                                AS total_checked_in,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'active')
    - COUNT(DISTINCT ci.registration_id)                                            AS total_no_show,
  e.max_participants - COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'active')     AS quota_remaining
FROM events e
LEFT JOIN registrations r ON r.event_id = e.id
LEFT JOIN check_ins ci ON ci.registration_id = r.id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.title, e.max_participants;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON cooperative_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- สร้าง profile อัตโนมัติเมื่อ user สมัครผ่าน Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role user_role := 'staff';
  _raw_role TEXT;
BEGIN
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
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooperative_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE lucky_draw_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lucky_draw_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is staff or admin?
CREATE OR REPLACE FUNCTION is_staff_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --- profiles ---
CREATE POLICY "profiles: users see own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles: admin sees all" ON profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "profiles: admin manages" ON profiles
  FOR ALL USING (is_admin());

-- --- cooperative_members ---
CREATE POLICY "members: staff/admin read" ON cooperative_members
  FOR SELECT USING (is_staff_or_admin());

CREATE POLICY "members: admin write" ON cooperative_members
  FOR ALL USING (is_admin());

-- Public search (for registration page)
CREATE POLICY "members: public search active" ON cooperative_members
  FOR SELECT USING (is_active = TRUE);

-- --- events ---
CREATE POLICY "events: public read active" ON events
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "events: staff create/update" ON events
  FOR INSERT WITH CHECK (is_staff_or_admin());

CREATE POLICY "events: staff update" ON events
  FOR UPDATE USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());

CREATE POLICY "events: admin delete" ON events
  FOR DELETE USING (is_admin());

-- --- event_days ---
CREATE POLICY "event_days: public read" ON event_days
  FOR SELECT USING (TRUE);

CREATE POLICY "event_days: staff write" ON event_days
  FOR ALL USING (is_staff_or_admin());

-- --- event_custom_fields ---
CREATE POLICY "custom_fields: public read" ON event_custom_fields
  FOR SELECT USING (TRUE);

CREATE POLICY "custom_fields: staff write" ON event_custom_fields
  FOR ALL USING (is_staff_or_admin());

-- --- registrations ---
CREATE POLICY "registrations: public insert" ON registrations
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "registrations: staff/admin read" ON registrations
  FOR SELECT USING (is_staff_or_admin());

CREATE POLICY "registrations: public read own by token" ON registrations
  FOR SELECT USING (TRUE);   -- filtered by qr_token in application layer

CREATE POLICY "registrations: staff update" ON registrations
  FOR UPDATE USING (is_staff_or_admin());

-- --- check_ins ---
CREATE POLICY "checkins: staff write" ON check_ins
  FOR ALL USING (is_staff_or_admin());

CREATE POLICY "checkins: staff read" ON check_ins
  FOR SELECT USING (is_staff_or_admin());

-- --- lucky_draw ---
CREATE POLICY "draw_sessions: staff write" ON lucky_draw_sessions
  FOR ALL USING (is_staff_or_admin());

CREATE POLICY "draw_sessions: staff read" ON lucky_draw_sessions
  FOR SELECT USING (is_staff_or_admin());

CREATE POLICY "draw_winners: staff write" ON lucky_draw_winners
  FOR ALL USING (is_staff_or_admin());

CREATE POLICY "draw_winners: staff read" ON lucky_draw_winners
  FOR SELECT USING (is_staff_or_admin());

-- --- activity_logs ---
CREATE POLICY "logs: admin read" ON activity_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "logs: system write" ON activity_logs
  FOR INSERT WITH CHECK (TRUE);
