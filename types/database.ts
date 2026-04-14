export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// DATABASE
// ============================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string
          role: 'admin' | 'client'
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email: string
          role?: 'admin' | 'client'
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string
          role?: 'admin' | 'client'
          avatar_url?: string | null
          created_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          profile_id: string
          company_name: string
          website: string | null
          phone: string | null
          status: 'active' | 'inactive'
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          company_name: string
          website?: string | null
          phone?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          company_name?: string
          website?: string | null
          phone?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          client_id: string
          title: string
          description: string | null
          status: ProjectStatus
          start_date: string | null
          launch_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          description?: string | null
          status?: ProjectStatus
          start_date?: string | null
          launch_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          description?: string | null
          status?: ProjectStatus
          start_date?: string | null
          launch_date?: string | null
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          project_id: string | null
          client_id: string
          name: string
          file_url: string
          category: DocumentCategory
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          client_id: string
          name: string
          file_url: string
          category?: DocumentCategory
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          client_id?: string
          name?: string
          file_url?: string
          category?: DocumentCategory
          uploaded_by?: string
          created_at?: string
        }
      }
      project_updates: {
        Row: {
          id: string
          project_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          message?: string
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      get_my_role: {
        Args: Record<string, never>
        Returns: 'admin' | 'client'
      }
    }
    Enums: {
      user_role: 'admin' | 'client'
      client_status: 'active' | 'inactive'
      project_status: ProjectStatus
      document_category: DocumentCategory
    }
  }
}

// ============================================================
// ENUM TYPES
// ============================================================

export type UserRole = 'admin' | 'client'
export type ClientStatus = 'active' | 'inactive'
export type ProjectStatus = 'briefing' | 'design' | 'development' | 'review' | 'live'
export type DocumentCategory = 'contract' | 'invoice' | 'briefing' | 'handover' | 'other'

// ============================================================
// ROW TYPES (Kurzform)
// ============================================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// Fertige Row-Typen für den direkten Import
export type Profile       = Tables<'profiles'>
export type Client        = Tables<'clients'>
export type Project       = Tables<'projects'>
export type Document      = Tables<'documents'>
export type ProjectUpdate = Tables<'project_updates'>

// ============================================================
// JOINED / EXTENDED TYPES
// ============================================================

// Projekt mit zugehörigem Client (für Admin-Übersicht)
export type ProjectWithClient = Project & {
  client: Client
}

// Projekt mit Updates und Dokumenten (für Kundenportal)
export type ProjectDetail = Project & {
  client: Client
  project_updates: ProjectUpdate[]
  documents: Document[]
}

// Client mit allen Projekten (für Admin-Detailansicht)
export type ClientWithProjects = Client & {
  profile: Profile
  projects: Project[]
}
