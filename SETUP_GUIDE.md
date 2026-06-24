# คู่มือการติดตั้งและพัฒนา — ระบบลงทะเบียนกิจกรรมสหกรณ์
## Hands-on Guide สำหรับผู้เริ่มต้นใช้ Vercel + Supabase

---

## 📋 สิ่งที่ต้องเตรียมก่อนเริ่ม

| สิ่งที่ต้องมี | ลิงก์ | หมายเหตุ |
|---|---|---|
| Node.js 18+ | https://nodejs.org | ดาวน์โหลด LTS |
| Git | https://git-scm.com | ระบบจัดการโค้ด |
| VS Code | https://code.visualstudio.com | Editor แนะนำ |
| บัญชี GitHub | https://github.com | สำหรับเชื่อม Vercel |
| บัญชี Supabase | https://supabase.com | ฐานข้อมูล (Free tier) |
| บัญชี Vercel | https://vercel.com | Deploy (Free tier) |
| บัญชี Resend | https://resend.com | ส่ง Email (Free 100/day) |

---

## ขั้นตอนที่ 1 — ตั้งค่า Supabase

### 1.1 สร้าง Project ใหม่

1. เข้า https://supabase.com → **Sign In** หรือ **Start your project**
2. คลิก **New Project**
3. กรอกข้อมูล:
   - **Name**: `cooperative-events`
   - **Database Password**: ตั้งรหัสผ่านแข็งแกร่ง (เก็บไว้ด้วย!)
   - **Region**: `Southeast Asia (Singapore)` — ใกล้ไทยสุด
4. คลิก **Create new project** → รอประมาณ 2 นาที

### 1.2 รัน Migration (สร้างตารางทั้งหมด)

1. ใน Supabase Dashboard → เมนูซ้าย **SQL Editor**
2. คลิก **New query**
3. เปิดไฟล์ `supabase/migrations/001_initial_schema.sql` ในโปรเจกต์
4. Copy ทั้งหมด → Paste ใน SQL Editor
5. คลิก **Run** (หรือ Ctrl+Enter)
6. ตรวจสอบว่าด้านล่างแสดง **"Success. No rows returned"**

### 1.3 รัน Seed Data (ข้อมูลตัวอย่าง)

1. สร้าง query ใหม่อีกอัน
2. เปิดไฟล์ `supabase/seed/001_seed.sql`
3. Copy → Paste → **Run**

### 1.4 เก็บ API Keys

1. ใน Supabase → เมนู **Project Settings** (icon ฟันเฟือง)
2. เลือก **API**
3. คัดลอกค่าเหล่านี้ไว้ (จะใช้ใน .env.local):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ ห้าม expose!

### 1.5 สร้างบัญชี Admin คนแรก

1. ใน Supabase → **Authentication** → **Users** → **Add user**
2. กรอก Email และ Password
3. เปิด **SQL Editor** → รัน query นี้ (แทน UUID ด้วย id จริงของ user ที่เพิ่งสร้าง):

```sql
-- หา UUID ของ user ที่เพิ่งสร้าง
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- อัปเดต role เป็น admin (แทน 'UUID-HERE' ด้วยค่าจริง)
UPDATE profiles 
SET role = 'admin', full_name = 'ผู้ดูแลระบบ'
WHERE id = 'UUID-HERE';
```

### 1.6 ตั้งค่า Auth Email Templates (optional)

1. Supabase → **Authentication** → **Email Templates**
2. ปรับแต่ง template ของ Confirm signup ให้เป็นภาษาไทย

---

## ขั้นตอนที่ 2 — ตั้งค่า Resend (Email)

### 2.1 สมัครและรับ API Key

1. เข้า https://resend.com → **Sign up** (ใช้ GitHub หรือ Email)
2. Dashboard → **API Keys** → **Create API Key**
3. ตั้งชื่อ `cooperative-events` → **Add**
4. คัดลอก key เก็บไว้ (แสดงครั้งเดียวเท่านั้น!)

### 2.2 ตั้งค่า Domain (แนะนำ แต่ไม่บังคับสำหรับทดสอบ)

สำหรับทดสอบในเครื่อง ใช้ email ทดสอบของ Resend ได้เลย:
- **From**: `onboarding@resend.dev`
- ส่งได้เฉพาะไปยัง email ของตัวเองก่อน (สำหรับ Free plan)

สำหรับ Production ต้อง verify domain:
1. Resend → **Domains** → **Add Domain**
2. ใส่ domain ของคุณ → Add DNS records ตามที่ระบุ

---

## ขั้นตอนที่ 3 — ตั้งค่าโปรเจกต์ในเครื่อง

### 3.1 Copy โค้ดและติดตั้ง Dependencies

```bash
# เข้าไปในโฟลเดอร์โปรเจกต์
cd cooperative-events

# ติดตั้ง packages ทั้งหมด
npm install

# ตรวจสอบว่าติดตั้งครบ
npm list --depth=0
```

### 3.2 สร้างไฟล์ Environment Variables

```bash
# Copy template
cp .env.local.example .env.local
```

เปิดไฟล์ `.env.local` แล้วใส่ค่าจริง:

```env
# จาก Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Service role key (ห้าม expose ใน client!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# จาก Resend → API Keys
RESEND_API_KEY=re_xxxxxxxxxxxx

# URL เว็บ (ตอน dev ใช้ localhost)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email ผู้ส่ง
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=ระบบลงทะเบียนกิจกรรม
```

### 3.3 รันในโหมด Development

```bash
npm run dev
```

เปิด browser → http://localhost:3000
ควรจะ redirect ไปหน้า `/login` อัตโนมัติ

### 3.4 ทดสอบ Login

1. ใส่ Email/Password ที่สร้างใน Supabase Auth (ขั้นตอน 1.5)
2. ควร redirect ไป `/admin/dashboard`

---

## ขั้นตอนที่ 4 — Deploy บน Vercel

### 4.1 Push โค้ดขึ้น GitHub

```bash
# เริ่มต้น git repository
git init
git add .
git commit -m "feat: initial commit — cooperative events system"

# สร้าง repo บน GitHub แล้ว push
git remote add origin https://github.com/YOUR_USERNAME/cooperative-events.git
git branch -M main
git push -u origin main
```

> ⚠️ ตรวจสอบให้แน่ใจว่า `.env.local` อยู่ใน `.gitignore` แล้ว (Next.js ทำให้อัตโนมัติ)

### 4.2 สร้าง `.gitignore`

```
# ตรวจสอบว่ามีบรรทัดนี้ใน .gitignore
.env.local
.env*.local
node_modules/
.next/
```

### 4.3 Import โปรเจกต์บน Vercel

1. เข้า https://vercel.com → **Sign in with GitHub**
2. คลิก **Add New Project**
3. เลือก repository `cooperative-events`
4. ใน **Configure Project**:
   - **Framework Preset**: Next.js (detect อัตโนมัติ)
   - **Root Directory**: `./` (ปล่อยว่าง)
5. เปิด **Environment Variables** → ใส่ค่าทั้งหมดจาก `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY       = eyJhbGci...
RESEND_API_KEY                  = re_xxxx
NEXT_PUBLIC_APP_URL             = https://your-project.vercel.app
RESEND_FROM_EMAIL               = noreply@yourdomain.com
RESEND_FROM_NAME                = ระบบลงทะเบียนกิจกรรม
```

6. คลิก **Deploy** → รอประมาณ 2-3 นาที
7. เมื่อ deploy สำเร็จ จะได้ URL เช่น `https://cooperative-events-xxx.vercel.app`

### 4.4 อัปเดต NEXT_PUBLIC_APP_URL

หลัง deploy ครั้งแรกแล้ว:
1. Vercel → Project → **Settings** → **Environment Variables**
2. แก้ `NEXT_PUBLIC_APP_URL` เป็น URL จริงของ Vercel
3. **Redeploy** → Settings → **Deployments** → **Redeploy**

### 4.5 ตั้งค่า Supabase Auth Redirect URLs

1. Supabase → **Authentication** → **URL Configuration**
2. เพิ่ม **Redirect URLs**:
   - `http://localhost:3000/**`
   - `https://your-project.vercel.app/**`

---

## ขั้นตอนที่ 5 — การใช้งานระบบ

### 5.1 สร้างกิจกรรมแรก (Admin/Staff)

1. Login → ไปที่ `/staff/events/new`
2. กรอก:
   - ชื่อกิจกรรม
   - วันที่เริ่ม-สิ้นสุด
   - สถานที่
   - จำนวนผู้เข้าร่วมสูงสุด
   - เลือกประเภท: Single-day / Multi-day
3. Toggle **"เปิดรับลงทะเบียน"** → คลิก **สร้างกิจกรรม**
4. ระบบจะ generate URL และ QR Code อัตโนมัติ

### 5.2 แชร์ลิงก์ลงทะเบียน

1. ไปที่ `/staff/events/[id]/dashboard`
2. ดู **QR ลิงก์ลงทะเบียน** หรือ copy URL
3. แชร์ให้ผู้เข้าร่วม

### 5.3 Check-in วันงาน (Staff)

1. ไปที่ `/staff/checkin/[id]`
2. คลิก **"เปิดกล้องสแกน QR Code"**
3. สแกน QR Code ของผู้เข้าร่วม
4. ระบบแสดงผลทันที ✅ / ⚠️ / ❌

### 5.4 Import สมาชิกสหกรณ์ (Admin)

1. ดาวน์โหลด Template CSV จาก `/admin/members`
2. กรอกข้อมูลตาม format:
   ```
   เลขสมาชิก,ชื่อ-นามสกุล,เบอร์โทร,อีเมล
   CM001,นายสมชาย ใจดี,0812345678,somchai@email.com
   ```
3. Upload ไฟล์ CSV → ระบบ Import อัตโนมัติ

---

## ขั้นตอนที่ 6 — การอัปเดตโค้ดหลัง Deploy

เมื่อต้องการแก้ไขโค้ด:

```bash
# แก้ไขไฟล์ที่ต้องการ

# Push ขึ้น GitHub
git add .
git commit -m "fix: แก้ไข..."
git push

# Vercel จะ deploy อัตโนมัติ (ใช้เวลา ~2 นาที)
```

---

## 🔧 คำสั่ง npm ที่ใช้บ่อย

```bash
npm run dev      # รันในโหมด development
npm run build    # build สำหรับ production
npm run start    # รัน production build ในเครื่อง
npm run lint     # ตรวจสอบโค้ด
```

---

## ❗ ปัญหาที่พบบ่อยและวิธีแก้

### ปัญหา: Login แล้วไม่ redirect
**สาเหตุ**: Profile ยังไม่ถูกสร้าง หรือ role ไม่ถูกต้อง
**แก้**: รัน SQL ใน Supabase:
```sql
SELECT * FROM profiles WHERE email = 'your@email.com';
-- ถ้าไม่มี profile ให้ insert เอง
INSERT INTO profiles (id, email, full_name, role)
SELECT id, email, 'Admin', 'admin' FROM auth.users WHERE email = 'your@email.com';
```

### ปัญหา: ส่ง email ไม่ได้
**สาเหตุ**: RESEND_API_KEY ผิด หรือ domain ยังไม่ verify
**แก้**: ตรวจสอบ key ใน Resend dashboard และใช้ `onboarding@resend.dev` สำหรับทดสอบ

### ปัญหา: กล้องไม่ทำงานบนมือถือ
**สาเหตุ**: browser ต้องการ HTTPS สำหรับกล้อง
**แก้**: ใช้ URL จาก Vercel (https://) แทน localhost

### ปัญหา: QR Scanner ไม่เห็นหน้าต่าง
**สาเหตุ**: ต้องรอ library โหลด
**แก้**: refresh หน้าและรออีกครั้ง

### ปัญหา: RLS Policy ทำให้ query ไม่ได้ข้อมูล
**สาเหตุ**: Row Level Security บล็อก
**แก้**: ตรวจสอบว่า user มี role ถูกต้องใน profiles table

---

## 📁 โครงสร้างไฟล์ทั้งหมด

```
cooperative-events/
├── app/
│   ├── (admin)/                    ← หน้า Admin (login required, role=admin)
│   │   ├── layout.tsx
│   │   └── admin/
│   │       ├── dashboard/page.tsx  ← ภาพรวมระบบ
│   │       ├── events/page.tsx     ← จัดการกิจกรรม + ลบ
│   │       ├── users/page.tsx      ← จัดการ Staff
│   │       ├── members/page.tsx    ← ฐานข้อมูลสมาชิก
│   │       └── logs/page.tsx       ← Activity logs
│   ├── (staff)/                    ← หน้า Staff (login required)
│   │   ├── layout.tsx
│   │   └── staff/
│   │       ├── dashboard/page.tsx
│   │       ├── events/
│   │       │   ├── page.tsx        ← รายการกิจกรรม
│   │       │   ├── new/page.tsx    ← สร้างกิจกรรม
│   │       │   └── [id]/
│   │       │       ├── dashboard/page.tsx      ← Dashboard + สถิติ
│   │       │       ├── edit/page.tsx           ← แก้ไขกิจกรรม
│   │       │       └── registrations/page.tsx  ← รายชื่อผู้ลงทะเบียน
│   │       ├── checkin/
│   │       │   ├── page.tsx        ← เลือกกิจกรรม
│   │       │   └── [id]/page.tsx   ← สแกน QR
│   │       └── draw/
│   │           ├── page.tsx        ← เลือกกิจกรรม
│   │           └── [id]/page.tsx   ← สุ่มรางวัล
│   ├── (public)/                   ← หน้าสาธารณะ (ไม่ต้อง login)
│   │   ├── events/[slug]/
│   │   │   └── page.tsx            ← หน้าลงทะเบียน
│   │   ├── confirm/[token]/
│   │   │   ├── page.tsx            ← แสดง QR Code
│   │   │   └── cancel/page.tsx     ← ยกเลิกการลงทะเบียน
│   │   └── my-history/page.tsx     ← ประวัติกิจกรรม
│   ├── api/
│   │   ├── admin/users/route.ts    ← สร้าง Staff user
│   │   ├── export/[eventId]/route.ts ← Export Excel
│   │   ├── otp/
│   │   │   ├── request/route.ts    ← ขอ OTP
│   │   │   └── verify-cancel/route.ts ← ยืนยัน OTP + ยกเลิก
│   │   └── registrations/
│   │       └── send-email/route.ts ← ส่ง email QR
│   ├── login/page.tsx
│   ├── layout.tsx                  ← Root layout
│   ├── page.tsx                    ← Redirect
│   ├── not-found.tsx
│   └── globals.css
├── components/
│   ├── checkin/CheckInScanner.tsx  ← สแกน QR Check-in
│   ├── dashboard/EventDashboardClient.tsx ← Realtime multi-day
│   ├── draw/LuckyDraw.tsx          ← สุ่มรางวัล
│   ├── events/
│   │   ├── AdminEventsClient.tsx   ← รายการ + ลบ (Admin)
│   │   ├── EventForm.tsx           ← ฟอร์มสร้าง/แก้ไข
│   │   └── ToggleRegistrationButton.tsx
│   ├── members/
│   │   ├── MembersClient.tsx       ← จัดการสมาชิก
│   │   └── UsersClient.tsx         ← จัดการ Staff
│   ├── registration/
│   │   ├── QRDisplay.tsx           ← แสดง QR Code
│   │   ├── RegistrationForm.tsx    ← ฟอร์มลงทะเบียน
│   │   └── RegistrationsList.tsx   ← รายชื่อ + ยกเลิก
│   └── ui/StaffSidebar.tsx         ← Sidebar navigation
├── lib/
│   ├── email/index.ts              ← ส่ง email ด้วย Resend
│   ├── excel/export.ts             ← Export Excel
│   ├── supabase/
│   │   ├── client.ts               ← Browser client
│   │   └── server.ts               ← Server client + Admin client
│   └── utils/index.ts              ← Helper functions
├── types/database.ts               ← TypeScript types
├── middleware.ts                   ← Auth protection
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   └── seed/001_seed.sql
└── .env.local.example
```

---

## 🔐 Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` ไม่ถูก expose ใน client code
- [ ] `.env.local` อยู่ใน `.gitignore`
- [ ] RLS เปิดอยู่ในทุกตาราง (Migration รัน SQL แล้ว)
- [ ] Admin account ใช้ password แข็งแกร่ง
- [ ] Vercel Environment Variables ตั้งค่าครบ
