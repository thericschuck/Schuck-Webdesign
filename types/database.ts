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
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          profile_id: string
          company_name: string
          website: string | null
          phone: string | null
          status: 'active' | 'inactive' | 'pending'
          address_street: string | null
          address_city: string | null
          address_zip: string | null
          address_country: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          company_name: string
          website?: string | null
          phone?: string | null
          status?: 'active' | 'inactive' | 'pending'
          address_street?: string | null
          address_city?: string | null
          address_zip?: string | null
          address_country?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          company_name?: string
          website?: string | null
          phone?: string | null
          status?: 'active' | 'inactive' | 'pending'
          address_street?: string | null
          address_city?: string | null
          address_zip?: string | null
          address_country?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clients_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
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
          internal_notes: string | null
          milestones: Json
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
          internal_notes?: string | null
          milestones?: Json
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
          internal_notes?: string | null
          milestones?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          }
        ]
      }
      documents: {
        Row: {
          id: string
          project_id: string | null
          client_id: string
          name: string
          file_url: string
          category: DocumentCategory
          folder: string | null
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
          folder?: string | null
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
          folder?: string | null
          uploaded_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'documents_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documents_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documents_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      meetings: {
        Row: {
          id: string
          project_id: string
          title: string
          meeting_date: string
          duration_minutes: number | null
          notes: string | null
          action_items: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          meeting_date: string
          duration_minutes?: number | null
          notes?: string | null
          action_items?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          meeting_date?: string
          duration_minutes?: number | null
          notes?: string | null
          action_items?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meetings_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      messages: {
        Row: {
          id: string
          project_id: string
          sender_id: string
          sender_role: 'admin' | 'client'
          content: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          sender_id: string
          sender_role: 'admin' | 'client'
          content: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          sender_id?: string
          sender_role?: 'admin' | 'client'
          content?: string
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      change_requests: {
        Row: {
          id: string
          project_id: string
          submitted_by: string
          title: string
          description: string | null
          admin_notes: string | null
          status: 'open' | 'in_progress' | 'done' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          submitted_by: string
          title: string
          description?: string | null
          admin_notes?: string | null
          status?: 'open' | 'in_progress' | 'done' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          submitted_by?: string
          title?: string
          description?: string | null
          admin_notes?: string | null
          status?: 'open' | 'in_progress' | 'done' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'change_requests_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          project_id: string | null
          client_id: string | null
          rating: number
          text: string
          reviewer_name: string | null
          reviewer_company: string | null
          status: 'pending' | 'approved' | 'rejected'
          approved_at: string | null
          published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          client_id?: string | null
          rating: number
          text: string
          reviewer_name?: string | null
          reviewer_company?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          approved_at?: string | null
          published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          client_id?: string | null
          rating?: number
          text?: string
          reviewer_name?: string | null
          reviewer_company?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          approved_at?: string | null
          published?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reviews_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      contact_submissions: {
        Row: {
          id: string
          name: string
          email: string
          type: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          type: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          type?: string
          message?: string
          read?: boolean
          created_at?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'project_updates_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: 'admin' | 'client'
      }
    }
    Enums: {
      user_role: 'admin' | 'client'
      client_status: 'active' | 'inactive' | 'pending'
      project_status: ProjectStatus
      document_category: DocumentCategory
    }
    CompositeTypes: Record<string, never>
  }
}

// ============================================================
// ENUM TYPES
// ============================================================

export type UserRole = 'admin' | 'client'
export type ClientStatus = 'active' | 'inactive' | 'pending'
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

export type ProjectWithClient = Project & {
  client: Client
}

export type ProjectDetail = Project & {
  client: Client
  project_updates: ProjectUpdate[]
  documents: Document[]
}

export type ClientWithProjects = Client & {
  profile: Profile
  projects: Project[]
}
