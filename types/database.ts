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
          company_name: string | null
          client_number: string | null
          website: string | null
          phone: string | null
          status: ClientStatus
          address_street: string | null
          address_city: string | null
          address_zip: string | null
          address_country: string | null
          notes: string | null
          created_at: string
          invite_sent_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          company_name?: string | null
          client_number?: string | null
          website?: string | null
          phone?: string | null
          status?: ClientStatus
          address_street?: string | null
          address_city?: string | null
          address_zip?: string | null
          address_country?: string | null
          notes?: string | null
          created_at?: string
          invite_sent_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          company_name?: string | null
          client_number?: string | null
          website?: string | null
          phone?: string | null
          status?: ClientStatus
          address_street?: string | null
          address_city?: string | null
          address_zip?: string | null
          address_country?: string | null
          notes?: string | null
          created_at?: string
          invite_sent_at?: string | null
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
          project_number: string | null
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
          project_number?: string | null
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
          project_number?: string | null
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
      todos: {
        Row: {
          id: string
          project_id: string | null
          meeting_id: string | null
          title: string
          done: boolean
          priority: 'high' | 'medium' | 'low'
          due_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          meeting_id?: string | null
          title: string
          done?: boolean
          priority?: 'high' | 'medium' | 'low'
          due_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          meeting_id?: string | null
          title?: string
          done?: boolean
          priority?: 'high' | 'medium' | 'low'
          due_date?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'todos_project_id_fkey'
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
          phone: string | null
          type: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          type: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
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
      counters: {
        Row: {
          typ: string
          scope_key: string
          last_value: number
        }
        Insert: {
          typ: string
          scope_key?: string
          last_value?: number
        }
        Update: {
          typ?: string
          scope_key?: string
          last_value?: number
        }
        Relationships: []
      }
      pending_actions: {
        Row: {
          id: string
          tool_name: string
          tool_args: Json
          conversation: Json
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          tool_name: string
          tool_args: Json
          conversation: Json
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          tool_name?: string
          tool_args?: Json
          conversation?: Json
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          art_nr: string
          bezeichnung: string
          beschreibung: string | null
          preis_min: number | null
          preis_max: number | null
          einheit: string | null
          typ: string | null
          kategorie: string | null
          pflichtbetrieb_art_nr: string | null
          aktiv: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          art_nr: string
          bezeichnung: string
          beschreibung?: string | null
          preis_min?: number | null
          preis_max?: number | null
          einheit?: string | null
          typ?: string | null
          kategorie?: string | null
          pflichtbetrieb_art_nr?: string | null
          aktiv?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          art_nr?: string
          bezeichnung?: string
          beschreibung?: string | null
          preis_min?: number | null
          preis_max?: number | null
          einheit?: string | null
          typ?: string | null
          kategorie?: string | null
          pflichtbetrieb_art_nr?: string | null
          aktiv?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'articles_pflichtbetrieb_art_nr_fkey'
            columns: ['pflichtbetrieb_art_nr']
            isOneToOne: false
            referencedRelation: 'articles'
            referencedColumns: ['art_nr']
          }
        ]
      }
      packages: {
        Row: {
          pkt_nr: string
          paketname: string
          paketpreis: number | null
          zielgruppe: string | null
          laufzeit: string | null
          folgeprodukt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          pkt_nr: string
          paketname: string
          paketpreis?: number | null
          zielgruppe?: string | null
          laufzeit?: string | null
          folgeprodukt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          pkt_nr?: string
          paketname?: string
          paketpreis?: number | null
          zielgruppe?: string | null
          laufzeit?: string | null
          folgeprodukt?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      package_items: {
        Row: {
          pkt_nr: string
          art_nr: string
          pos: number
          menge: number | null
          ep: number | null
          gesamt: number | null
        }
        Insert: {
          pkt_nr: string
          art_nr: string
          pos: number
          menge?: number | null
          ep?: number | null
          gesamt?: number | null
        }
        Update: {
          pkt_nr?: string
          art_nr?: string
          pos?: number
          menge?: number | null
          ep?: number | null
          gesamt?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'package_items_pkt_nr_fkey'
            columns: ['pkt_nr']
            isOneToOne: false
            referencedRelation: 'packages'
            referencedColumns: ['pkt_nr']
          },
          {
            foreignKeyName: 'package_items_art_nr_fkey'
            columns: ['art_nr']
            isOneToOne: false
            referencedRelation: 'articles'
            referencedColumns: ['art_nr']
          }
        ]
      }
      leads: {
        Row: {
          id: string
          lead_number: string
          firmenname: string
          ansprechpartner: string | null
          position: string | null
          zielgruppe: string | null
          stadt: string | null
          website: string | null
          phone: string | null
          email: string | null
          quelle: string | null
          website_qualitaet: string | null
          prioritaet: LeadPrioritaet
          erstkontakt_am: string | null
          akquise_ergebnis: AkquiseErgebnis
          wiedervorlage: string | null
          notizen: string | null
          current_stage: LeadStage
          client_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_number: string
          firmenname: string
          ansprechpartner?: string | null
          position?: string | null
          zielgruppe?: string | null
          stadt?: string | null
          website?: string | null
          phone?: string | null
          email?: string | null
          quelle?: string | null
          website_qualitaet?: string | null
          prioritaet?: LeadPrioritaet
          erstkontakt_am?: string | null
          akquise_ergebnis?: AkquiseErgebnis
          wiedervorlage?: string | null
          notizen?: string | null
          current_stage?: LeadStage
          client_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_number?: string
          firmenname?: string
          ansprechpartner?: string | null
          position?: string | null
          zielgruppe?: string | null
          stadt?: string | null
          website?: string | null
          phone?: string | null
          email?: string | null
          quelle?: string | null
          website_qualitaet?: string | null
          prioritaet?: LeadPrioritaet
          erstkontakt_am?: string | null
          akquise_ergebnis?: AkquiseErgebnis
          wiedervorlage?: string | null
          notizen?: string | null
          current_stage?: LeadStage
          client_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          }
        ]
      }
      quali_calls: {
        Row: {
          id: string
          lead_id: string
          quali_call_am: string | null
          quali_ergebnis: QualiErgebnis
          wiedervorlage: string | null
          bedarf_notizen: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          quali_call_am?: string | null
          quali_ergebnis?: QualiErgebnis
          wiedervorlage?: string | null
          bedarf_notizen?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          quali_call_am?: string | null
          quali_ergebnis?: QualiErgebnis
          wiedervorlage?: string | null
          bedarf_notizen?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'quali_calls_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          }
        ]
      }
      sales_calls: {
        Row: {
          id: string
          lead_id: string
          closing_call_am: string | null
          leistungen: string | null
          angebotsvolumen: number | null
          leistungsbeginn: string | null
          sales_ergebnis: SalesErgebnis
          notizen: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          closing_call_am?: string | null
          leistungen?: string | null
          angebotsvolumen?: number | null
          leistungsbeginn?: string | null
          sales_ergebnis?: SalesErgebnis
          notizen?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          closing_call_am?: string | null
          leistungen?: string | null
          angebotsvolumen?: number | null
          leistungsbeginn?: string | null
          sales_ergebnis?: SalesErgebnis
          notizen?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sales_calls_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          }
        ]
      }
      akquise_tracking: {
        Row: {
          id: string
          datum: string
          waehlversuche: number
          gespraeche_empfang: number
          gespraeche_entscheider: number
          termine_vereinbart: number
          created_at: string
        }
        Insert: {
          id?: string
          datum: string
          waehlversuche?: number
          gespraeche_empfang?: number
          gespraeche_entscheider?: number
          termine_vereinbart?: number
          created_at?: string
        }
        Update: {
          id?: string
          datum?: string
          waehlversuche?: number
          gespraeche_empfang?: number
          gespraeche_entscheider?: number
          termine_vereinbart?: number
          created_at?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          id: string
          offer_number: string
          lead_id: string | null
          client_id: string | null
          status: OfferStatus
          total_net: number | null
          pdf_url: string | null
          valid_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          offer_number: string
          lead_id?: string | null
          client_id?: string | null
          status?: OfferStatus
          total_net?: number | null
          pdf_url?: string | null
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          offer_number?: string
          lead_id?: string | null
          client_id?: string | null
          status?: OfferStatus
          total_net?: number | null
          pdf_url?: string | null
          valid_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'offers_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offers_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          }
        ]
      }
      offer_items: {
        Row: {
          id: string
          offer_id: string
          art_nr: string | null
          pos: number
          bezeichnung: string
          menge: number
          ep: number
          gesamt: number
          created_at: string
        }
        Insert: {
          id?: string
          offer_id: string
          art_nr?: string | null
          pos: number
          bezeichnung: string
          menge?: number
          ep: number
          gesamt: number
          created_at?: string
        }
        Update: {
          id?: string
          offer_id?: string
          art_nr?: string | null
          pos?: number
          bezeichnung?: string
          menge?: number
          ep?: number
          gesamt?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'offer_items_offer_id_fkey'
            columns: ['offer_id']
            isOneToOne: false
            referencedRelation: 'offers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offer_items_art_nr_fkey'
            columns: ['art_nr']
            isOneToOne: false
            referencedRelation: 'articles'
            referencedColumns: ['art_nr']
          }
        ]
      }
      company_settings: {
        Row: {
          id: string
          company_name: string
          inhaber: string | null
          address_street: string | null
          address_zip: string | null
          address_city: string | null
          address_country: string
          email: string | null
          phone: string | null
          website: string | null
          iban: string | null
          bic: string | null
          steuernummer: string | null
          ust_id: string | null
          ust_pflichtig: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name?: string
          inhaber?: string | null
          address_street?: string | null
          address_zip?: string | null
          address_city?: string | null
          address_country?: string
          email?: string | null
          phone?: string | null
          website?: string | null
          iban?: string | null
          bic?: string | null
          steuernummer?: string | null
          ust_id?: string | null
          ust_pflichtig?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          inhaber?: string | null
          address_street?: string | null
          address_zip?: string | null
          address_city?: string | null
          address_country?: string
          email?: string | null
          phone?: string | null
          website?: string | null
          iban?: string | null
          bic?: string | null
          steuernummer?: string | null
          ust_id?: string | null
          ust_pflichtig?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string | null
          client_id: string
          project_id: string | null
          status: InvoiceStatus
          invoice_date: string | null
          service_date: string | null
          ust_pflichtig: boolean
          total_net: number
          pdf_url: string | null
          sent_at: string | null
          paid_at: string | null
          recurring_source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number?: string | null
          client_id: string
          project_id?: string | null
          status?: InvoiceStatus
          invoice_date?: string | null
          service_date?: string | null
          ust_pflichtig?: boolean
          total_net?: number
          pdf_url?: string | null
          sent_at?: string | null
          paid_at?: string | null
          recurring_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string | null
          client_id?: string
          project_id?: string | null
          status?: InvoiceStatus
          invoice_date?: string | null
          service_date?: string | null
          ust_pflichtig?: boolean
          total_net?: number
          pdf_url?: string | null
          sent_at?: string | null
          paid_at?: string | null
          recurring_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          art_nr: string | null
          pos: number
          bezeichnung: string
          menge: number
          ep: number
          gesamt: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          art_nr?: string | null
          pos: number
          bezeichnung: string
          menge?: number
          ep: number
          gesamt: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          art_nr?: string | null
          pos?: number
          bezeichnung?: string
          menge?: number
          ep?: number
          gesamt?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invoice_items_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoice_items_art_nr_fkey'
            columns: ['art_nr']
            isOneToOne: false
            referencedRelation: 'articles'
            referencedColumns: ['art_nr']
          }
        ]
      }
      credit_notes: {
        Row: {
          id: string
          credit_note_number: string
          invoice_id: string
          reason: string | null
          total_net: number
          pdf_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          credit_note_number: string
          invoice_id: string
          reason?: string | null
          total_net: number
          pdf_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          credit_note_number?: string
          invoice_id?: string
          reason?: string | null
          total_net?: number
          pdf_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'credit_notes_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          }
        ]
      }
      nodes: {
        Row: {
          id: string
          type: NodeType
          label: string
          body: string | null
          ref_id: string | null
          ref_table: string | null
          source: NodeSource
          confidence: NodeConfidence
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: NodeType
          label: string
          body?: string | null
          ref_id?: string | null
          ref_table?: string | null
          source?: NodeSource
          confidence?: NodeConfidence
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: NodeType
          label?: string
          body?: string | null
          ref_id?: string | null
          ref_table?: string | null
          source?: NodeSource
          confidence?: NodeConfidence
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      edges: {
        Row: {
          id: string
          from_id: string
          to_id: string
          type: EdgeType
          weight: number
          created_at: string
        }
        Insert: {
          id?: string
          from_id: string
          to_id: string
          type: EdgeType
          weight?: number
          created_at?: string
        }
        Update: {
          id?: string
          from_id?: string
          to_id?: string
          type?: EdgeType
          weight?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'edges_from_id_fkey'
            columns: ['from_id']
            isOneToOne: false
            referencedRelation: 'nodes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'edges_to_id_fkey'
            columns: ['to_id']
            isOneToOne: false
            referencedRelation: 'nodes'
            referencedColumns: ['id']
          }
        ]
      }
      conversation_logs: {
        Row: {
          id: string
          node_id: string | null
          messages: Json
          summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          node_id?: string | null
          messages?: Json
          summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          node_id?: string | null
          messages?: Json
          summary?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversation_logs_node_id_fkey'
            columns: ['node_id']
            isOneToOne: false
            referencedRelation: 'nodes'
            referencedColumns: ['id']
          }
        ]
      }
      integration_calls: {
        Row: {
          id: string
          service: string
          success: boolean
          error_message: string | null
          called_at: string
        }
        Insert: {
          id?: string
          service: string
          success: boolean
          error_message?: string | null
          called_at?: string
        }
        Update: {
          id?: string
          service?: string
          success?: boolean
          error_message?: string | null
          called_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: 'admin' | 'client'
      }
      get_next_number: {
        Args: { p_typ: string; p_scope?: string }
        Returns: number
      }
      issue_invoice: {
        Args: { p_id: string }
        Returns: Database['public']['Tables']['invoices']['Row']
      }
      create_credit_note: {
        Args: { p_invoice_id: string; p_reason: string | null; p_total_net: number }
        Returns: Database['public']['Tables']['credit_notes']['Row']
      }
      link_nodes: {
        Args: { p_from: string; p_to: string; p_type: string; p_weight?: number }
        Returns: Database['public']['Tables']['edges']['Row']
      }
      match_nodes: {
        Args: { query_embedding: number[]; match_count?: number }
        Returns: Database['public']['Tables']['nodes']['Row'][]
      }
    }
    Enums: {
      user_role: 'admin' | 'client'
      client_status: ClientStatus
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
export type ClientStatus = 'active' | 'inactive' | 'pending' | 'lead' | 'paused' | 'completed'
export type ProjectStatus = 'briefing' | 'design' | 'development' | 'review' | 'live'
export type DocumentCategory = 'contract' | 'invoice' | 'briefing' | 'handover' | 'offer' | 'care_report' | 'other'
export type LeadPrioritaet = 'high' | 'medium' | 'low'
export type AkquiseErgebnis = 'offen' | 'nicht_erreicht' | 'wiedervorlage' | 'kein_interesse' | 'qualifiziert'
export type LeadStage = 'erstkontakt' | 'quali_call' | 'closing_call' | 'gewonnen' | 'verloren'
export type QualiErgebnis = 'offen' | 'follow_up' | 'qualifiziert' | 'disqualifiziert'
export type SalesErgebnis = 'offen' | 'follow_up' | 'abgeschlossen' | 'abgelehnt'
export type OfferStatus = 'entwurf' | 'gesendet' | 'angenommen' | 'abgelehnt'
export type InvoiceStatus = 'entwurf' | 'versendet' | 'bezahlt' | 'storniert'
export type NodeType = 'client' | 'project' | 'contact' | 'fact' | 'preference' | 'note' | 'process' | 'product' | 'session'
export type NodeSource = 'jarvis_auto' | 'user_explicit' | 'imported'
export type NodeConfidence = 'high' | 'medium' | 'low' | 'deprecated'
export type EdgeType =
  | 'has_project'
  | 'has_contact'
  | 'mentioned_in'
  | 'contradicts'
  | 'confirms'
  | 'relates_to'
  | 'learned_from'
  | 'part_of_session'

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
export type Counter       = Tables<'counters'>
export type PendingAction = Tables<'pending_actions'>
export type Article       = Tables<'articles'>
export type Package       = Tables<'packages'>
export type PackageItem   = Tables<'package_items'>
export type Lead          = Tables<'leads'>
export type QualiCall     = Tables<'quali_calls'>
export type SalesCall     = Tables<'sales_calls'>
export type AkquiseTracking = Tables<'akquise_tracking'>
export type Offer         = Tables<'offers'>
export type OfferItem     = Tables<'offer_items'>
export type CompanySettings = Tables<'company_settings'>
export type Invoice       = Tables<'invoices'>
export type InvoiceItem   = Tables<'invoice_items'>
export type CreditNote    = Tables<'credit_notes'>
export type KnowledgeNode = Tables<'nodes'>
export type KnowledgeEdge = Tables<'edges'>
export type ConversationLog = Tables<'conversation_logs'>

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
