// ============================================================
// types/database.ts — TypeScript types สำหรับ Supabase schema
// ============================================================

export type UserRole = 'admin' | 'staff'
export type RegistrationStatus = 'active' | 'cancelled'
export type CancelledByType = 'self' | 'staff'
export type FieldType = 'text' | 'number' | 'select' | 'checkbox'
export type DrawPoolType = 'all_registered' | 'checked_in_only'
export type LogAction =
  | 'event_created' | 'event_updated' | 'event_deleted'
  | 'registration_created' | 'registration_cancelled'
  | 'checkin_completed'
  | 'draw_conducted'
  | 'user_created' | 'user_suspended' | 'user_activated'
  | 'member_imported' | 'member_updated'

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export type Profile = {
  id: string
  email: string
  full_name: string
  role: UserRole
  linked_member_id: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export type CooperativeMember = {
  id: string
  member_no: string
  full_name: string
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Event = {
  id: string
  title: string
  description: string | null
  location: string | null
  start_date: string
  end_date: string
  is_multi_day: boolean
  max_participants: number | null
  is_registration_open: boolean
  registration_round: number
  closed_message: string
  allow_public: boolean
  slug: string
  created_by: string | null
  updated_by: string | null
  deleted_at: string | null
  draw_closed_at: string | null
  draw_closed_by: string | null
  created_at: string
  updated_at: string
}

export type EventDay = {
  id: string
  event_id: string
  date: string
  label: string
  sort_order: number
  created_at: string
}

export type EventCustomField = {
  id: string
  event_id: string
  field_name: string
  field_type: FieldType
  options: string[] | null
  is_required: boolean
  sort_order: number
  created_at: string
}

export type Registration = {
  id: string
  event_id: string
  member_id: string | null
  is_member: boolean
  full_name: string
  phone: string | null
  email: string | null
  custom_field_values: Record<string, string | boolean | number> | null
  qr_token: string
  status: RegistrationStatus
  cancelled_at: string | null
  cancelled_by: CancelledByType | null
  cancelled_by_user_id: string | null
  registered_at: string
  updated_at: string
}

export type CheckIn = {
  id: string
  registration_id: string
  event_day_id: string | null
  checked_in_at: string
  checked_in_by: string | null
  note: string | null
}

export type LuckyDrawSession = {
  id: string
  event_id: string
  prize_label: string
  draw_pool: DrawPoolType
  drawn_at: string
  drawn_by: string | null
}

export type LuckyDrawWinner = {
  id: string
  session_id: string
  registration_id: string
  created_at: string
}

export type ActivityLog = {
  id: string
  actor_id: string | null
  action: LogAction
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// ============================================================
// VIEW TYPES
// ============================================================

export type EventStats = {
  event_id: string
  title: string
  max_participants: number | null
  total_registered: number
  total_cancelled: number
  total_checked_in: number
  total_no_show: number
  quota_remaining: number | null
}

// ============================================================
// JOINED / EXTENDED TYPES (for UI)
// ============================================================

export type EventWithStats = Event & {
  stats?: EventStats
  event_days?: EventDay[]
  custom_fields?: EventCustomField[]
}

export type RegistrationWithDetails = Registration & {
  event?: Pick<Event, 'id' | 'title' | 'slug' | 'start_date' | 'end_date' | 'location'>
  member?: Pick<CooperativeMember, 'member_no' | 'full_name'>
  check_ins?: CheckIn[]
}

export type CheckInWithDetails = CheckIn & {
  registration?: Pick<Registration, 'full_name' | 'is_member' | 'qr_token'>
  event_day?: EventDay
  staff?: Pick<Profile, 'full_name'>
}

// ============================================================
// FORM / INPUT TYPES
// ============================================================

export type CreateEventInput = {
  title: string
  description?: string
  location?: string
  start_date: string
  end_date: string
  is_multi_day: boolean
  max_participants?: number
  closed_message?: string
  allow_public: boolean
  event_days?: Array<{ date: string; label: string; sort_order: number }>
  custom_fields?: Array<{
    field_name: string
    field_type: FieldType
    options?: string[]
    is_required: boolean
    sort_order: number
  }>
}

export type MemberRegistrationInput = {
  event_id: string
  member_id: string
  phone?: string
  email?: string
  custom_field_values?: Record<string, string | boolean | number>
}

export type PublicRegistrationInput = {
  event_id: string
  full_name: string
  phone?: string
  email?: string
  custom_field_values?: Record<string, string | boolean | number>
}

export type CheckInInput = {
  qr_token: string
  event_id: string
  event_day_id?: string
  note?: string
}

// ============================================================
// SUPABASE DATABASE TYPE (for createClient<Database>)
// ============================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile>
        Update: Partial<Profile>
        Relationships: [
          {
            foreignKeyName: "profiles_linked_member_id_fkey"
            columns: ["linked_member_id"]
            isOneToOne: false
            referencedRelation: "cooperative_members"
            referencedColumns: ["id"]
          }
        ]
      }
      cooperative_members: {
        Row: CooperativeMember
        Insert: Partial<CooperativeMember>
        Update: Partial<CooperativeMember>
        Relationships: []
      }
      events: {
        Row: Event
        Insert: Partial<Event>
        Update: Partial<Event>
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      event_days: {
        Row: EventDay
        Insert: Partial<EventDay>
        Update: Partial<EventDay>
        Relationships: [
          {
            foreignKeyName: "event_days_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      event_custom_fields: {
        Row: EventCustomField
        Insert: Partial<EventCustomField>
        Update: Partial<EventCustomField>
        Relationships: [
          {
            foreignKeyName: "event_custom_fields_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      registrations: {
        Row: Registration
        Insert: Partial<Registration>
        Update: Partial<Registration>
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "cooperative_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_cancelled_by_user_id_fkey"
            columns: ["cancelled_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      check_ins: {
        Row: CheckIn
        Insert: Partial<CheckIn>
        Update: Partial<CheckIn>
        Relationships: [
          {
            foreignKeyName: "check_ins_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_event_day_id_fkey"
            columns: ["event_day_id"]
            isOneToOne: false
            referencedRelation: "event_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      lucky_draw_sessions: {
        Row: LuckyDrawSession
        Insert: Partial<LuckyDrawSession>
        Update: Partial<LuckyDrawSession>
        Relationships: [
          {
            foreignKeyName: "lucky_draw_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lucky_draw_sessions_drawn_by_fkey"
            columns: ["drawn_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      lucky_draw_winners: {
        Row: LuckyDrawWinner
        Insert: Partial<LuckyDrawWinner>
        Update: Partial<LuckyDrawWinner>
        Relationships: [
          {
            foreignKeyName: "lucky_draw_winners_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lucky_draw_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lucky_draw_winners_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          }
        ]
      }
      activity_logs: {
        Row: ActivityLog
        Insert: Partial<ActivityLog>
        Update: Partial<ActivityLog>
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      event_stats: { Row: EventStats; Relationships: [] }
    }
    Functions: {}
  }
}
