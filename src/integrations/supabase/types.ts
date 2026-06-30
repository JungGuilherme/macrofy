export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agenda_dividendos: {
        Row: {
          company: string
          country: string
          created_at: string
          created_by: string | null
          dividend_type: string
          dividend_yield: number | null
          event_date: string
          ex_date: string | null
          id: string
          ticker: string
        }
        Insert: {
          company: string
          country?: string
          created_at?: string
          created_by?: string | null
          dividend_type?: string
          dividend_yield?: number | null
          event_date: string
          ex_date?: string | null
          id?: string
          ticker: string
        }
        Update: {
          company?: string
          country?: string
          created_at?: string
          created_by?: string | null
          dividend_type?: string
          dividend_yield?: number | null
          event_date?: string
          ex_date?: string | null
          id?: string
          ticker?: string
        }
        Relationships: []
      }
      agenda_economica: {
        Row: {
          country: string
          created_at: string
          created_by: string | null
          event_date: string
          event_time: string | null
          id: string
          title: string
        }
        Insert: {
          country?: string
          created_at?: string
          created_by?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          title: string
        }
        Update: {
          country?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      agenda_resultados: {
        Row: {
          company: string
          country: string
          created_at: string
          created_by: string | null
          event_date: string
          event_time: string | null
          id: string
          ticker: string
        }
        Insert: {
          company: string
          country?: string
          created_at?: string
          created_by?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          ticker: string
        }
        Update: {
          company?: string
          country?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          ticker?: string
        }
        Relationships: []
      }
      anbima_snapshots: {
        Row: {
          created_at: string
          data_referencia: string
          taxa: number
          tipo: string
          vencimento: string
        }
        Insert: {
          created_at?: string
          data_referencia: string
          taxa: number
          tipo: string
          vencimento: string
        }
        Update: {
          created_at?: string
          data_referencia?: string
          taxa?: number
          tipo?: string
          vencimento?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          author: string | null
          body: string | null
          content_html: string | null
          created_at: string
          created_by: string | null
          external_url: string | null
          file_url: string | null
          id: string
          is_published: boolean | null
          linkedin_url: string | null
          read_time: number | null
          subtitle: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          body?: string | null
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_published?: boolean | null
          linkedin_url?: string | null
          read_time?: number | null
          subtitle?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          body?: string | null
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_published?: boolean | null
          linkedin_url?: string | null
          read_time?: number | null
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      b3_flow_daily: {
        Row: {
          created_at: string | null
          date: string
          financial_institutions: number | null
          foreign_flow: number | null
          id: string
          individual: number | null
          institutional: number | null
          others: number | null
          source: string | null
          source_file_date: string | null
          updated_at: string | null
          ytd_financial_institutions: number | null
          ytd_foreign: number | null
          ytd_individual: number | null
          ytd_institutional: number | null
          ytd_others: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          financial_institutions?: number | null
          foreign_flow?: number | null
          id?: string
          individual?: number | null
          institutional?: number | null
          others?: number | null
          source?: string | null
          source_file_date?: string | null
          updated_at?: string | null
          ytd_financial_institutions?: number | null
          ytd_foreign?: number | null
          ytd_individual?: number | null
          ytd_institutional?: number | null
          ytd_others?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          financial_institutions?: number | null
          foreign_flow?: number | null
          id?: string
          individual?: number | null
          institutional?: number | null
          others?: number | null
          source?: string | null
          source_file_date?: string | null
          updated_at?: string | null
          ytd_financial_institutions?: number | null
          ytd_foreign?: number | null
          ytd_individual?: number | null
          ytd_institutional?: number | null
          ytd_others?: number | null
        }
        Relationships: []
      }
      brasil_flows: {
        Row: {
          created_at: string
          date: string
          foreign_flow: number
          id: string
          institutional_flow: number
          retail_flow: number
          source: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          date: string
          foreign_flow?: number
          id?: string
          institutional_flow?: number
          retail_flow?: number
          source?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          foreign_flow?: number
          id?: string
          institutional_flow?: number
          retail_flow?: number
          source?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      brasil_pe_historico: {
        Row: {
          created_at: string
          date: string
          id: string
          pe_ratio: number
          source: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          pe_ratio: number
          source?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          pe_ratio?: number
          source?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      copom_cache: {
        Row: {
          id: string
          meeting_date: string | null
          probability: number
          scenario: string
          updated_at: string
        }
        Insert: {
          id?: string
          meeting_date?: string | null
          probability: number
          scenario: string
          updated_at?: string
        }
        Update: {
          id?: string
          meeting_date?: string | null
          probability?: number
          scenario?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_lessons: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          pdf_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          pdf_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          pdf_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          id: string
          title: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          title: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          id?: string
          title?: string
        }
        Relationships: []
      }
      curated_news: {
        Row: {
          content_html: string | null
          created_at: string
          created_by: string | null
          external_url: string
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          published_at: string
          published_date: string
          source: string | null
          summary: string | null
          themes: Database["public"]["Enums"]["news_theme"][]
          title: string
        }
        Insert: {
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          external_url: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          published_at?: string
          published_date?: string
          source?: string | null
          summary?: string | null
          themes?: Database["public"]["Enums"]["news_theme"][]
          title: string
        }
        Update: {
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          external_url?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          published_at?: string
          published_date?: string
          source?: string | null
          summary?: string | null
          themes?: Database["public"]["Enums"]["news_theme"][]
          title?: string
        }
        Relationships: []
      }
      dashboard_embeds: {
        Row: {
          created_at: string
          embed_html: string
          id: string
          is_active: boolean | null
          name: string | null
          scope: string
        }
        Insert: {
          created_at?: string
          embed_html: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          scope: string
        }
        Update: {
          created_at?: string
          embed_html?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          scope?: string
        }
        Relationships: []
      }
      economic_calendar: {
        Row: {
          created_at: string
          event_date: string
          event_time: string | null
          id: string
          impact: string | null
          notes: string | null
          region: string | null
          title: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_time?: string | null
          id?: string
          impact?: string | null
          notes?: string | null
          region?: string | null
          title: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_time?: string | null
          id?: string
          impact?: string | null
          notes?: string | null
          region?: string | null
          title?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      fedwatch_cache: {
        Row: {
          id: string
          meeting_date: string | null
          probability: number
          rate_range: string
          updated_at: string
        }
        Insert: {
          id?: string
          meeting_date?: string | null
          probability: number
          rate_range: string
          updated_at?: string
        }
        Update: {
          id?: string
          meeting_date?: string | null
          probability?: number
          rate_range?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_suggestions: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          subject: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          subject: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          subject?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      house_alerts: {
        Row: {
          created_at: string
          display_order: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_pinned: boolean
          time_hint: Database["public"]["Enums"]["time_hint"] | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
          url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean
          time_hint?: Database["public"]["Enums"]["time_hint"] | null
          title: string
          type?: Database["public"]["Enums"]["alert_type"]
          url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean
          time_hint?: Database["public"]["Enums"]["time_hint"] | null
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
          url?: string | null
        }
        Relationships: []
      }
      internal_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          recommendation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          recommendation_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          recommendation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      macro_global_snapshot: {
        Row: {
          core_cpi_yoy: number | null
          country_code: string
          country_name: string
          cpi_yoy: number | null
          current_account_gdp: number | null
          flag: string | null
          gdp_qoq: number | null
          gdp_yoy: number | null
          govt_debt_gdp: number | null
          id: string
          policy_rate: number | null
          source: string | null
          ten_y_yield: number | null
          unemployment: number | null
          updated_at: string | null
        }
        Insert: {
          core_cpi_yoy?: number | null
          country_code: string
          country_name: string
          cpi_yoy?: number | null
          current_account_gdp?: number | null
          flag?: string | null
          gdp_qoq?: number | null
          gdp_yoy?: number | null
          govt_debt_gdp?: number | null
          id?: string
          policy_rate?: number | null
          source?: string | null
          ten_y_yield?: number | null
          unemployment?: number | null
          updated_at?: string | null
        }
        Update: {
          core_cpi_yoy?: number | null
          country_code?: string
          country_name?: string
          cpi_yoy?: number | null
          current_account_gdp?: number | null
          flag?: string | null
          gdp_qoq?: number | null
          gdp_yoy?: number | null
          govt_debt_gdp?: number | null
          id?: string
          policy_rate?: number | null
          source?: string | null
          ten_y_yield?: number | null
          unemployment?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      macro_heatmap_data: {
        Row: {
          calc_mode: string | null
          category: string
          country: string
          date: string
          display_value: string | null
          frequency: string | null
          heat_score: number | null
          id: string
          indicator: string
          last_updated_at: string | null
          ma12_value: number | null
          ma3_value: number | null
          mom_value: number | null
          polarity: string | null
          raw_value: number | null
          series_code: string
          source: string
          source_table: string | null
          unit: string | null
          yoy_value: number | null
        }
        Insert: {
          calc_mode?: string | null
          category: string
          country: string
          date: string
          display_value?: string | null
          frequency?: string | null
          heat_score?: number | null
          id?: string
          indicator: string
          last_updated_at?: string | null
          ma12_value?: number | null
          ma3_value?: number | null
          mom_value?: number | null
          polarity?: string | null
          raw_value?: number | null
          series_code: string
          source: string
          source_table?: string | null
          unit?: string | null
          yoy_value?: number | null
        }
        Update: {
          calc_mode?: string | null
          category?: string
          country?: string
          date?: string
          display_value?: string | null
          frequency?: string | null
          heat_score?: number | null
          id?: string
          indicator?: string
          last_updated_at?: string | null
          ma12_value?: number | null
          ma3_value?: number | null
          mom_value?: number | null
          polarity?: string | null
          raw_value?: number | null
          series_code?: string
          source?: string
          source_table?: string | null
          unit?: string | null
          yoy_value?: number | null
        }
        Relationships: []
      }
      macro_series_metadata: {
        Row: {
          category: string
          country: string
          created_at: string | null
          default_mode: string | null
          enabled: boolean | null
          endpoint_template: string | null
          frequency: string | null
          id: string
          indicator: string
          notes: string | null
          polarity: string | null
          series_code: string
          sort_order: number | null
          source: string
          unit: string | null
        }
        Insert: {
          category: string
          country: string
          created_at?: string | null
          default_mode?: string | null
          enabled?: boolean | null
          endpoint_template?: string | null
          frequency?: string | null
          id?: string
          indicator: string
          notes?: string | null
          polarity?: string | null
          series_code: string
          sort_order?: number | null
          source: string
          unit?: string | null
        }
        Update: {
          category?: string
          country?: string
          created_at?: string | null
          default_mode?: string | null
          enabled?: boolean | null
          endpoint_template?: string | null
          frequency?: string | null
          id?: string
          indicator?: string
          notes?: string | null
          polarity?: string | null
          series_code?: string
          sort_order?: number | null
          source?: string
          unit?: string | null
        }
        Relationships: []
      }
      macrofy_sentiment_components: {
        Row: {
          component_key: string
          created_at: string | null
          date: string
          id: string
          normalized_score: number | null
          raw_value: number | null
          region: string
          updated_at: string | null
        }
        Insert: {
          component_key: string
          created_at?: string | null
          date: string
          id?: string
          normalized_score?: number | null
          raw_value?: number | null
          region: string
          updated_at?: string | null
        }
        Update: {
          component_key?: string
          created_at?: string | null
          date?: string
          id?: string
          normalized_score?: number | null
          raw_value?: number | null
          region?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      macrofy_sentiment_config: {
        Row: {
          component_key: string
          is_active: boolean | null
          is_inverted: boolean | null
          notes: string | null
          region: string
          source_key: string | null
        }
        Insert: {
          component_key: string
          is_active?: boolean | null
          is_inverted?: boolean | null
          notes?: string | null
          region: string
          source_key?: string | null
        }
        Update: {
          component_key?: string
          is_active?: boolean | null
          is_inverted?: boolean | null
          notes?: string | null
          region?: string
          source_key?: string | null
        }
        Relationships: []
      }
      macrofy_sentiment_index: {
        Row: {
          created_at: string | null
          date: string
          headline_score: number | null
          id: string
          regime_label: string | null
          region: string
          updated_at: string | null
          valid_components_count: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          headline_score?: number | null
          id?: string
          regime_label?: string | null
          region: string
          updated_at?: string | null
          valid_components_count?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          headline_score?: number | null
          id?: string
          regime_label?: string | null
          region?: string
          updated_at?: string | null
          valid_components_count?: number | null
        }
        Relationships: []
      }
      market_raw_series: {
        Row: {
          created_at: string | null
          date: string
          id: string
          region: string
          series_key: string
          source: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          region?: string
          series_key: string
          source?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          region?: string
          series_key?: string
          source?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: []
      }
      morning_calls: {
        Row: {
          content_html: string | null
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean | null
          published_date: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          published_date?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          published_date?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      news_custom_themes: {
        Row: {
          color_key: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_hidden: boolean
          label: string
          slug: string
        }
        Insert: {
          color_key?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_hidden?: boolean
          label: string
          slug: string
        }
        Update: {
          color_key?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_hidden?: boolean
          label?: string
          slug?: string
        }
        Relationships: []
      }
      news_theme_labels: {
        Row: {
          display_order: number
          is_hidden: boolean
          label: string | null
          theme: Database["public"]["Enums"]["news_theme"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          display_order?: number
          is_hidden?: boolean
          label?: string | null
          theme: Database["public"]["Enums"]["news_theme"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          display_order?: number
          is_hidden?: boolean
          label?: string | null
          theme?: Database["public"]["Enums"]["news_theme"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      recents: {
        Row: {
          id: string
          item_id: string
          item_type: string
          last_opened_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          item_type: string
          last_opened_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          item_type?: string
          last_opened_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendation_materials: {
        Row: {
          created_at: string
          id: string
          label: string
          recommendation_id: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          recommendation_id: string
          type: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          recommendation_id?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_materials_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          category: string | null
          client_explanation: string | null
          content_html: string | null
          created_at: string
          created_by: string | null
          executive_summary: string | null
          external_link: string | null
          file_url: string | null
          id: string
          is_published: boolean | null
          product_code: string | null
          profile_fit: string[] | null
          risk_level: string | null
          risks: string | null
          status: string | null
          tags: string[] | null
          thesis: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          client_explanation?: string | null
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          executive_summary?: string | null
          external_link?: string | null
          file_url?: string | null
          id?: string
          is_published?: boolean | null
          product_code?: string | null
          profile_fit?: string[] | null
          risk_level?: string | null
          risks?: string | null
          status?: string | null
          tags?: string[] | null
          thesis?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          client_explanation?: string | null
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          executive_summary?: string | null
          external_link?: string | null
          file_url?: string | null
          id?: string
          is_published?: boolean | null
          product_code?: string | null
          profile_fit?: string[] | null
          risk_level?: string | null
          risks?: string | null
          status?: string | null
          tags?: string[] | null
          thesis?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          attachments_placeholder: Json | null
          author: string | null
          category: string | null
          content_html: string | null
          created_at: string
          created_by: string | null
          external_url: string | null
          file_url: string | null
          id: string
          is_published: boolean | null
          materials: Json | null
          pdf_url: string | null
          subtitle: string | null
          summary: string | null
          tags: string[] | null
          theme: string | null
          title: string
          type: string | null
        }
        Insert: {
          attachments_placeholder?: Json | null
          author?: string | null
          category?: string | null
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_published?: boolean | null
          materials?: Json | null
          pdf_url?: string | null
          subtitle?: string | null
          summary?: string | null
          tags?: string[] | null
          theme?: string | null
          title: string
          type?: string | null
        }
        Update: {
          attachments_placeholder?: Json | null
          author?: string | null
          category?: string | null
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_published?: boolean | null
          materials?: Json | null
          pdf_url?: string | null
          subtitle?: string | null
          summary?: string | null
          tags?: string[] | null
          theme?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      rss_feeds: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          feed_url: string | null
          id: string
          is_active: boolean
          items: Json
          name: string
          theme: string | null
          themes: Database["public"]["Enums"]["news_theme"][]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          feed_url?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          name: string
          theme?: string | null
          themes?: Database["public"]["Enums"]["news_theme"][]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          feed_url?: string | null
          id?: string
          is_active?: boolean
          items?: Json
          name?: string
          theme?: string | null
          themes?: Database["public"]["Enums"]["news_theme"][]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_rss_feeds_public: {
        Args: never
        Returns: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          items: Json
          name: string
          theme: string
          themes: Database["public"]["Enums"]["news_theme"][]
        }[]
      }
    }
    Enums: {
      alert_type: "attention" | "content" | "event" | "market"
      app_role: "admin" | "aai" | "cliente"
      news_theme:
        | "macro"
        | "brasil"
        | "eua"
        | "politica"
        | "empresas"
        | "juros"
        | "inflacao"
        | "fiscal"
        | "internacional"
        | "commodities"
        | "mercados"
        | "cripto"
        | "outros"
      time_hint: "hoje" | "amanha" | "semana"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_type: ["attention", "content", "event", "market"],
      app_role: ["admin", "aai", "cliente"],
      news_theme: [
        "macro",
        "brasil",
        "eua",
        "politica",
        "empresas",
        "juros",
        "inflacao",
        "fiscal",
        "internacional",
        "commodities",
        "mercados",
        "cripto",
        "outros",
      ],
      time_hint: ["hoje", "amanha", "semana"],
    },
  },
} as const
