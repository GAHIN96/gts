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
      account_lockouts: {
        Row: {
          created_at: string
          email: string
          failure_count: number
          id: string
          is_active: boolean
          locked_at: string
          locked_until: string
          unlocked_at: string | null
          unlocked_by: string | null
        }
        Insert: {
          created_at?: string
          email: string
          failure_count?: number
          id?: string
          is_active?: boolean
          locked_at?: string
          locked_until: string
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          failure_count?: number
          id?: string
          is_active?: boolean
          locked_at?: string
          locked_until?: string
          unlocked_at?: string | null
          unlocked_by?: string | null
        }
        Relationships: []
      }
      additional_services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          per_person: boolean | null
          price: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          per_person?: boolean | null
          price: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          per_person?: boolean | null
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      agencies: {
        Row: {
          address: string | null
          agency_name: string
          city: string | null
          commission_rate: number | null
          contact_email: string | null
          contact_person_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          credit_limit: number | null
          credit_limit_type: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          license_number: string | null
          logo_url: string | null
          mfa_required: boolean | null
          updated_at: string | null
          used_credit: number | null
          user_id: string
        }
        Insert: {
          address?: string | null
          agency_name: string
          city?: string | null
          commission_rate?: number | null
          contact_email?: string | null
          contact_person_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          credit_limit_type?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          license_number?: string | null
          logo_url?: string | null
          mfa_required?: boolean | null
          updated_at?: string | null
          used_credit?: number | null
          user_id: string
        }
        Update: {
          address?: string | null
          agency_name?: string
          city?: string | null
          commission_rate?: number | null
          contact_email?: string | null
          contact_person_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          credit_limit?: number | null
          credit_limit_type?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          license_number?: string | null
          logo_url?: string | null
          mfa_required?: boolean | null
          updated_at?: string | null
          used_credit?: number | null
          user_id?: string
        }
        Relationships: []
      }
      agency_credit_transactions: {
        Row: {
          agency_id: string
          amount: number
          balance_after: number
          booking_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          transaction_type: string
        }
        Insert: {
          agency_id: string
          amount: number
          balance_after: number
          booking_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          transaction_type: string
        }
        Update: {
          agency_id?: string
          amount?: number
          balance_after?: number
          booking_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_credit_transactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_credit_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      airlines: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      airports: {
        Row: {
          city_id: string | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          city_id?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          city_id?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "airports_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      amenities: {
        Row: {
          category: string
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          entity_name: string | null
          event_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          entity_name?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          entity_name?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      banner_images: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          module: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          module: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          module?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_number: string
          booking_type: string
          created_at: string | null
          departure_id: string | null
          flight_id: string | null
          hotel_id: string | null
          id: string
          metadata: Json | null
          notes: string | null
          passenger_details: Json | null
          passengers: number | null
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          total_amount: number
          tour_id: string | null
          updated_at: string | null
          user_id: string
          visa_id: string | null
        }
        Insert: {
          booking_number: string
          booking_type: string
          created_at?: string | null
          departure_id?: string | null
          flight_id?: string | null
          hotel_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          passenger_details?: Json | null
          passengers?: number | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_amount: number
          tour_id?: string | null
          updated_at?: string | null
          user_id: string
          visa_id?: string | null
        }
        Update: {
          booking_number?: string
          booking_type?: string
          created_at?: string | null
          departure_id?: string | null
          flight_id?: string | null
          hotel_id?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          passenger_details?: Json | null
          passengers?: number | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_amount?: number
          tour_id?: string | null
          updated_at?: string | null
          user_id?: string
          visa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "package_departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_visa_id_fkey"
            columns: ["visa_id"]
            isOneToOne: false
            referencedRelation: "visas"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          country: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          country?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_history: {
        Row: {
          agency_id: string | null
          change_type: string
          changed_by: string | null
          created_at: string
          id: string
          new_rate: number
          notes: string | null
          old_rate: number | null
        }
        Insert: {
          agency_id?: string | null
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_rate: number
          notes?: string | null
          old_rate?: number | null
        }
        Update: {
          agency_id?: string | null
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_rate?: number
          notes?: string | null
          old_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_history_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      flight_deals: {
        Row: {
          created_at: string
          description: string | null
          discount_percent: number
          discounted_price: number
          expires_at: string | null
          flight_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          original_price: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percent: number
          discounted_price: number
          expires_at?: string | null
          flight_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          original_price: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percent?: number
          discounted_price?: number
          expires_at?: string | null
          flight_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          original_price?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_deals_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_default_fares: {
        Row: {
          commission: number
          created_at: string | null
          flight_id: string
          id: string
          person_type: string
          rate: number
          seat_from: number
          seat_to: number
          updated_at: string | null
        }
        Insert: {
          commission?: number
          created_at?: string | null
          flight_id: string
          id?: string
          person_type?: string
          rate?: number
          seat_from?: number
          seat_to?: number
          updated_at?: string | null
        }
        Update: {
          commission?: number
          created_at?: string | null
          flight_id?: string
          id?: string
          person_type?: string
          rate?: number
          seat_from?: number
          seat_to?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_default_fares_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_price_tiers: {
        Row: {
          created_at: string | null
          flight_id: string
          id: string
          max_passengers: number
          min_passengers: number
          price_per_seat: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flight_id: string
          id?: string
          max_passengers?: number
          min_passengers?: number
          price_per_seat: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flight_id?: string
          id?: string
          max_passengers?: number
          min_passengers?: number
          price_per_seat?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_price_tiers_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_seat_blocks: {
        Row: {
          agency_id: string | null
          blocked_seats: number
          created_at: string | null
          flight_id: string
          id: string
          is_active: boolean | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          blocked_seats?: number
          created_at?: string | null
          flight_id: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          blocked_seats?: number
          created_at?: string | null
          flight_id?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_seat_blocks_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_seat_blocks_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_special_fares: {
        Row: {
          commission: number
          created_at: string | null
          flight_id: string
          from_date: string
          id: string
          person_type: string
          rate: number
          seat_from: number
          seat_to: number
          to_date: string
          updated_at: string | null
        }
        Insert: {
          commission?: number
          created_at?: string | null
          flight_id: string
          from_date: string
          id?: string
          person_type?: string
          rate?: number
          seat_from?: number
          seat_to?: number
          to_date: string
          updated_at?: string | null
        }
        Update: {
          commission?: number
          created_at?: string | null
          flight_id?: string
          from_date?: string
          id?: string
          person_type?: string
          rate?: number
          seat_from?: number
          seat_to?: number
          to_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_special_fares_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
        ]
      }
      flights: {
        Row: {
          airline: string
          airline_logo: string | null
          arrival_airport_code: string | null
          arrival_city: string
          arrival_date: string
          arrival_time: string | null
          available_seats: number | null
          class: string | null
          cover_photo_url: string | null
          created_at: string | null
          currency: string | null
          departure_airport_code: string | null
          departure_city: string
          departure_date: string
          departure_time: string | null
          description: string | null
          flight_number: string | null
          flight_policy: string | null
          id: string
          id_backside_required: boolean | null
          id_scan_required: boolean | null
          is_active: boolean | null
          is_featured: boolean | null
          linked_flight_id: string | null
          multi_city_group_id: string | null
          ops_email: string | null
          order_number: string | null
          passport_required: boolean | null
          photo_required: boolean | null
          price: number
          recurring_days: number[] | null
          schedule_type: string | null
          sellable_seats: number | null
          total_seats: number | null
          trip_type: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          visa_amount: number | null
        }
        Insert: {
          airline: string
          airline_logo?: string | null
          arrival_airport_code?: string | null
          arrival_city: string
          arrival_date: string
          arrival_time?: string | null
          available_seats?: number | null
          class?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          currency?: string | null
          departure_airport_code?: string | null
          departure_city: string
          departure_date: string
          departure_time?: string | null
          description?: string | null
          flight_number?: string | null
          flight_policy?: string | null
          id?: string
          id_backside_required?: boolean | null
          id_scan_required?: boolean | null
          is_active?: boolean | null
          is_featured?: boolean | null
          linked_flight_id?: string | null
          multi_city_group_id?: string | null
          ops_email?: string | null
          order_number?: string | null
          passport_required?: boolean | null
          photo_required?: boolean | null
          price: number
          recurring_days?: number[] | null
          schedule_type?: string | null
          sellable_seats?: number | null
          total_seats?: number | null
          trip_type?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          visa_amount?: number | null
        }
        Update: {
          airline?: string
          airline_logo?: string | null
          arrival_airport_code?: string | null
          arrival_city?: string
          arrival_date?: string
          arrival_time?: string | null
          available_seats?: number | null
          class?: string | null
          cover_photo_url?: string | null
          created_at?: string | null
          currency?: string | null
          departure_airport_code?: string | null
          departure_city?: string
          departure_date?: string
          departure_time?: string | null
          description?: string | null
          flight_number?: string | null
          flight_policy?: string | null
          id?: string
          id_backside_required?: boolean | null
          id_scan_required?: boolean | null
          is_active?: boolean | null
          is_featured?: boolean | null
          linked_flight_id?: string | null
          multi_city_group_id?: string | null
          ops_email?: string | null
          order_number?: string | null
          passport_required?: boolean | null
          photo_required?: boolean | null
          price?: number
          recurring_days?: number[] | null
          schedule_type?: string | null
          sellable_seats?: number | null
          total_seats?: number | null
          trip_type?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          visa_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flights_linked_flight_id_fkey"
            columns: ["linked_flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
        ]
      }
      group_packages: {
        Row: {
          airline: string | null
          barcode_image_url: string | null
          barcode_link_url: string | null
          barcode_value: string | null
          city_id: string
          cover_photo_url: string | null
          created_at: string | null
          day_program: Json | null
          departure_city_id: string | null
          description: string | null
          destination_airport: string | null
          gate_number: string | null
          group_ops_email: string | null
          group_policy: string | null
          guide_name: string | null
          id: string
          id_backside_required: boolean | null
          id_required: boolean | null
          images: string[] | null
          included_items: string[] | null
          includes_flight: boolean | null
          includes_hotel: boolean | null
          includes_tours: boolean | null
          includes_transfer: boolean | null
          is_active: boolean | null
          name: string
          nights: number
          not_included_items: string[] | null
          order_number: string | null
          passport_required: boolean | null
          phone: string | null
          photo_required: boolean | null
          program_pdf_url: string | null
          recurring_days: number[] | null
          required_documents: Json | null
          schedule_type: string | null
          source_airport: string | null
          starting_price: number
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          visa_amount: number | null
          visa_amount_adt: number | null
          visa_amount_chd: number | null
          visa_amount_inf: number | null
          visa_ops_email: string | null
          visa_required: boolean | null
        }
        Insert: {
          airline?: string | null
          barcode_image_url?: string | null
          barcode_link_url?: string | null
          barcode_value?: string | null
          city_id: string
          cover_photo_url?: string | null
          created_at?: string | null
          day_program?: Json | null
          departure_city_id?: string | null
          description?: string | null
          destination_airport?: string | null
          gate_number?: string | null
          group_ops_email?: string | null
          group_policy?: string | null
          guide_name?: string | null
          id?: string
          id_backside_required?: boolean | null
          id_required?: boolean | null
          images?: string[] | null
          included_items?: string[] | null
          includes_flight?: boolean | null
          includes_hotel?: boolean | null
          includes_tours?: boolean | null
          includes_transfer?: boolean | null
          is_active?: boolean | null
          name: string
          nights?: number
          not_included_items?: string[] | null
          order_number?: string | null
          passport_required?: boolean | null
          phone?: string | null
          photo_required?: boolean | null
          program_pdf_url?: string | null
          recurring_days?: number[] | null
          required_documents?: Json | null
          schedule_type?: string | null
          source_airport?: string | null
          starting_price: number
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          visa_amount?: number | null
          visa_amount_adt?: number | null
          visa_amount_chd?: number | null
          visa_amount_inf?: number | null
          visa_ops_email?: string | null
          visa_required?: boolean | null
        }
        Update: {
          airline?: string | null
          barcode_image_url?: string | null
          barcode_link_url?: string | null
          barcode_value?: string | null
          city_id?: string
          cover_photo_url?: string | null
          created_at?: string | null
          day_program?: Json | null
          departure_city_id?: string | null
          description?: string | null
          destination_airport?: string | null
          gate_number?: string | null
          group_ops_email?: string | null
          group_policy?: string | null
          guide_name?: string | null
          id?: string
          id_backside_required?: boolean | null
          id_required?: boolean | null
          images?: string[] | null
          included_items?: string[] | null
          includes_flight?: boolean | null
          includes_hotel?: boolean | null
          includes_tours?: boolean | null
          includes_transfer?: boolean | null
          is_active?: boolean | null
          name?: string
          nights?: number
          not_included_items?: string[] | null
          order_number?: string | null
          passport_required?: boolean | null
          phone?: string | null
          photo_required?: boolean | null
          program_pdf_url?: string | null
          recurring_days?: number[] | null
          required_documents?: Json | null
          schedule_type?: string | null
          source_airport?: string | null
          starting_price?: number
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          visa_amount?: number | null
          visa_amount_adt?: number | null
          visa_amount_chd?: number | null
          visa_amount_inf?: number | null
          visa_ops_email?: string | null
          visa_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "group_packages_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_packages_departure_city_id_fkey"
            columns: ["departure_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_available_dates: {
        Row: {
          available_rooms: number
          created_at: string | null
          from_date: string
          hotel_id: string
          id: string
          to_date: string
        }
        Insert: {
          available_rooms?: number
          created_at?: string | null
          from_date: string
          hotel_id: string
          id?: string
          to_date: string
        }
        Update: {
          available_rooms?: number
          created_at?: string | null
          from_date?: string
          hotel_id?: string
          id?: string
          to_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_available_dates_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_deals: {
        Row: {
          created_at: string
          description: string | null
          discount_percent: number
          discounted_price: number
          expires_at: string | null
          hotel_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          original_price: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percent: number
          discounted_price: number
          expires_at?: string | null
          hotel_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          original_price: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percent?: number
          discounted_price?: number
          expires_at?: string | null
          hotel_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          original_price?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_deals_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_rooms: {
        Row: {
          amenities: string[] | null
          available_rooms: number | null
          capacity: number
          created_at: string | null
          description: string | null
          hotel_id: string
          id: string
          is_active: boolean | null
          price_adult: number | null
          price_child: number | null
          price_child_6: number | null
          price_infant: number | null
          price_per_night: number
          room_from: number
          room_to: number
          room_type: string
          total_rooms: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          amenities?: string[] | null
          available_rooms?: number | null
          capacity?: number
          created_at?: string | null
          description?: string | null
          hotel_id: string
          id?: string
          is_active?: boolean | null
          price_adult?: number | null
          price_child?: number | null
          price_child_6?: number | null
          price_infant?: number | null
          price_per_night: number
          room_from?: number
          room_to?: number
          room_type: string
          total_rooms?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          amenities?: string[] | null
          available_rooms?: number | null
          capacity?: number
          created_at?: string | null
          description?: string | null
          hotel_id?: string
          id?: string
          is_active?: boolean | null
          price_adult?: number | null
          price_child?: number | null
          price_child_6?: number | null
          price_infant?: number | null
          price_per_night?: number
          room_from?: number
          room_to?: number
          room_type?: string
          total_rooms?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_special_prices: {
        Row: {
          commission: number
          created_at: string | null
          from_date: string
          hotel_id: string
          id: string
          price_adult: number
          price_child_2_6: number
          price_child_6_12: number
          price_infant: number
          room_id: string | null
          room_rate: number
          to_date: string
          updated_at: string | null
        }
        Insert: {
          commission?: number
          created_at?: string | null
          from_date: string
          hotel_id: string
          id?: string
          price_adult?: number
          price_child_2_6?: number
          price_child_6_12?: number
          price_infant?: number
          room_id?: string | null
          room_rate?: number
          to_date: string
          updated_at?: string | null
        }
        Update: {
          commission?: number
          created_at?: string | null
          from_date?: string
          hotel_id?: string
          id?: string
          price_adult?: number
          price_child_2_6?: number
          price_child_6_12?: number
          price_infant?: number
          room_id?: string | null
          room_rate?: number
          to_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_special_prices_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_special_prices_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          add_child: boolean | null
          add_infant: boolean | null
          address: string | null
          amenities: string[] | null
          city_id: string | null
          created_at: string | null
          description: string | null
          hotel_policy: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          name: string
          num_rooms: number | null
          ops_email: string | null
          order_number: string | null
          price_per_night: number | null
          rating_score: number | null
          remarks: string | null
          review_count: number | null
          star_rating: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          website: string | null
        }
        Insert: {
          add_child?: boolean | null
          add_infant?: boolean | null
          address?: string | null
          amenities?: string[] | null
          city_id?: string | null
          created_at?: string | null
          description?: string | null
          hotel_policy?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          name: string
          num_rooms?: number | null
          ops_email?: string | null
          order_number?: string | null
          price_per_night?: number | null
          rating_score?: number | null
          remarks?: string | null
          review_count?: number | null
          star_rating?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          website?: string | null
        }
        Update: {
          add_child?: boolean | null
          add_infant?: boolean | null
          address?: string | null
          amenities?: string[] | null
          city_id?: string | null
          created_at?: string | null
          description?: string | null
          hotel_policy?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          name?: string
          num_rooms?: number | null
          ops_email?: string | null
          order_number?: string | null
          price_per_night?: number | null
          rating_score?: number | null
          remarks?: string | null
          review_count?: number | null
          star_rating?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      package_departure_flights: {
        Row: {
          created_at: string | null
          departure_id: string
          flight_id: string
          flight_type: string
          id: string
        }
        Insert: {
          created_at?: string | null
          departure_id: string
          flight_id: string
          flight_type?: string
          id?: string
        }
        Update: {
          created_at?: string | null
          departure_id?: string
          flight_id?: string
          flight_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_departure_flights_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "package_departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_departure_flights_flight_id_fkey"
            columns: ["flight_id"]
            isOneToOne: false
            referencedRelation: "flights"
            referencedColumns: ["id"]
          },
        ]
      }
      package_departures: {
        Row: {
          alert_level: number | null
          available_seats: number
          baggage: string | null
          created_at: string | null
          departure_date: string
          departure_time: string | null
          dept_arr_time: string | null
          fl_number: string | null
          id: string
          is_active: boolean | null
          package_id: string
          price_per_person: number
          ret_arr_time: string | null
          ret_fl_number: string | null
          return_date: string
          return_time: string | null
          total_seats: number
          updated_at: string | null
        }
        Insert: {
          alert_level?: number | null
          available_seats?: number
          baggage?: string | null
          created_at?: string | null
          departure_date: string
          departure_time?: string | null
          dept_arr_time?: string | null
          fl_number?: string | null
          id?: string
          is_active?: boolean | null
          package_id: string
          price_per_person: number
          ret_arr_time?: string | null
          ret_fl_number?: string | null
          return_date: string
          return_time?: string | null
          total_seats?: number
          updated_at?: string | null
        }
        Update: {
          alert_level?: number | null
          available_seats?: number
          baggage?: string | null
          created_at?: string | null
          departure_date?: string
          departure_time?: string | null
          dept_arr_time?: string | null
          fl_number?: string | null
          id?: string
          is_active?: boolean | null
          package_id?: string
          price_per_person?: number
          ret_arr_time?: string | null
          ret_fl_number?: string | null
          return_date?: string
          return_time?: string | null
          total_seats?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_departures_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "group_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_hotel_availability: {
        Row: {
          available_rooms: number
          booked_rooms: number
          created_at: string | null
          departure_id: string
          hotel_id: string
          id: string
          package_id: string
          updated_at: string | null
        }
        Insert: {
          available_rooms?: number
          booked_rooms?: number
          created_at?: string | null
          departure_id: string
          hotel_id: string
          id?: string
          package_id: string
          updated_at?: string | null
        }
        Update: {
          available_rooms?: number
          booked_rooms?: number
          created_at?: string | null
          departure_id?: string
          hotel_id?: string
          id?: string
          package_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_hotel_availability_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "package_departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_hotel_availability_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_hotel_availability_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "group_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_hotels: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          is_default: boolean | null
          package_id: string
          price_adjustment: number | null
          tier: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          is_default?: boolean | null
          package_id: string
          price_adjustment?: number | null
          tier: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          is_default?: boolean | null
          package_id?: string
          price_adjustment?: number | null
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_hotels_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_hotels_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "group_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_rates: {
        Row: {
          capacity: number
          commission: number
          count: number
          created_at: string
          guest_type: string
          hotel_id: string
          id: string
          package_id: string
          price: number
          room_type: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          commission?: number
          count?: number
          created_at?: string
          guest_type: string
          hotel_id: string
          id?: string
          package_id: string
          price?: number
          room_type: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          commission?: number
          count?: number
          created_at?: string
          guest_type?: string
          hotel_id?: string
          id?: string
          package_id?: string
          price?: number
          room_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_rates_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_rates_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "group_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_special_rates: {
        Row: {
          commission: number
          created_at: string
          departure_date: string
          guest_type: string
          hotel_id: string
          id: string
          package_id: string
          price: number
          return_date: string
          room_type: string
          updated_at: string
        }
        Insert: {
          commission?: number
          created_at?: string
          departure_date: string
          guest_type: string
          hotel_id: string
          id?: string
          package_id: string
          price?: number
          return_date: string
          room_type: string
          updated_at?: string
        }
        Update: {
          commission?: number
          created_at?: string
          departure_date?: string
          guest_type?: string
          hotel_id?: string
          id?: string
          package_id?: string
          price?: number
          return_date?: string
          room_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_special_rates_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_special_rates_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "group_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          booking_id: string
          created_at: string | null
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          proof_url: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          transaction_reference: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          booking_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          proof_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_reference?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          booking_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          proof_url?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_reference?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      pnr_booking_changes: {
        Row: {
          after_value: string | null
          before_value: string | null
          change_type: string
          created_at: string
          description: string | null
          field_name: string | null
          id: string
          pnr_booking_id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          after_value?: string | null
          before_value?: string | null
          change_type: string
          created_at?: string
          description?: string | null
          field_name?: string | null
          id?: string
          pnr_booking_id: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          after_value?: string | null
          before_value?: string | null
          change_type?: string
          created_at?: string
          description?: string | null
          field_name?: string | null
          id?: string
          pnr_booking_id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pnr_booking_changes_pnr_booking_id_fkey"
            columns: ["pnr_booking_id"]
            isOneToOne: false
            referencedRelation: "pnr_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      pnr_bookings: {
        Row: {
          airline: string
          created_at: string
          flight_date: string
          hotel: string | null
          id: string
          is_modified: boolean
          notes: string | null
          pnr: string
          route: string
          status: string
          ticket_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          airline: string
          created_at?: string
          flight_date: string
          hotel?: string | null
          id?: string
          is_modified?: boolean
          notes?: string | null
          pnr: string
          route: string
          status?: string
          ticket_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          airline?: string
          created_at?: string
          flight_date?: string
          hotel?: string | null
          id?: string
          is_modified?: boolean
          notes?: string | null
          pnr?: string
          route?: string
          status?: string
          ticket_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pnr_passengers: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          pnr_booking_id: string
          ticket_number: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          pnr_booking_id: string
          ticket_number?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          pnr_booking_id?: string
          ticket_number?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pnr_passengers_pnr_booking_id_fkey"
            columns: ["pnr_booking_id"]
            isOneToOne: false
            referencedRelation: "pnr_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          enabled: boolean
          id: string
          module: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          module: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          module?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      room_availability: {
        Row: {
          available_count: number | null
          booked_count: number | null
          created_at: string | null
          date: string
          id: string
          room_id: string | null
          updated_at: string | null
        }
        Insert: {
          available_count?: number | null
          booked_count?: number | null
          created_at?: string | null
          date: string
          id?: string
          room_id?: string | null
          updated_at?: string | null
        }
        Update: {
          available_count?: number | null
          booked_count?: number | null
          created_at?: string | null
          date?: string
          id?: string
          room_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_availability_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_hotels: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_hotels_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string
          description: string
          email: string | null
          id: string
          is_resolved: boolean
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          description: string
          email?: string | null
          id?: string
          is_resolved?: boolean
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          description?: string
          email?: string | null
          id?: string
          is_resolved?: boolean
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      special_requests: {
        Row: {
          admin_response: string | null
          budget: number | null
          created_at: string
          description: string
          id: string
          priority: string | null
          request_type: string
          status: string | null
          travelers: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          budget?: number | null
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          request_type: string
          status?: string | null
          travelers?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          budget?: number | null
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          request_type?: string
          status?: string | null
          travelers?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tours: {
        Row: {
          city_id: string | null
          created_at: string | null
          day_program: Json | null
          description: string | null
          duration_hours: number | null
          id: string
          images: string[] | null
          includes: string[] | null
          is_active: boolean | null
          max_participants: number | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          city_id?: string | null
          created_at?: string | null
          day_program?: Json | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          images?: string[] | null
          includes?: string[] | null
          is_active?: boolean | null
          max_participants?: number | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          city_id?: string | null
          created_at?: string | null
          day_program?: Json | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          images?: string[] | null
          includes?: string[] | null
          is_active?: boolean | null
          max_participants?: number | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tours_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          capacity: number
          city_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          price_per_passengers: number | null
          route_from: string | null
          route_to: string | null
          transfer_type: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          capacity?: number
          city_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          price_per_passengers?: number | null
          route_from?: string | null
          route_to?: string | null
          transfer_type?: string
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          capacity?: number
          city_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          price_per_passengers?: number | null
          route_from?: string | null
          route_to?: string | null
          transfer_type?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          device_info: string | null
          email: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          is_suspicious: boolean
          last_active_at: string
          location: string | null
          logged_in_at: string
          suspicious_reason: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_info?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          is_suspicious?: boolean
          last_active_at?: string
          location?: string | null
          logged_in_at?: string
          suspicious_reason?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_info?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          is_suspicious?: boolean
          last_active_at?: string
          location?: string | null
          logged_in_at?: string
          suspicious_reason?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      visa_prices: {
        Row: {
          commission: number
          created_at: string | null
          id: string
          max_age: number
          min_age: number
          price: number
          updated_at: string | null
          visa_id: string
        }
        Insert: {
          commission?: number
          created_at?: string | null
          id?: string
          max_age?: number
          min_age?: number
          price?: number
          updated_at?: string | null
          visa_id: string
        }
        Update: {
          commission?: number
          created_at?: string | null
          id?: string
          max_age?: number
          min_age?: number
          price?: number
          updated_at?: string | null
          visa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_prices_visa_id_fkey"
            columns: ["visa_id"]
            isOneToOne: false
            referencedRelation: "visas"
            referencedColumns: ["id"]
          },
        ]
      }
      visas: {
        Row: {
          country: string
          created_at: string | null
          documents_required: string[] | null
          flag_image_url: string | null
          id: string
          id_scan_required: boolean | null
          is_active: boolean | null
          issue_duration: string | null
          ops_email: string | null
          order_number: string | null
          passport_required: boolean | null
          photo_required: boolean | null
          price: number
          processing_days: number
          remarks: string | null
          requirements: string[] | null
          terms_policy: string | null
          updated_at: string | null
          visa_type: string
        }
        Insert: {
          country: string
          created_at?: string | null
          documents_required?: string[] | null
          flag_image_url?: string | null
          id?: string
          id_scan_required?: boolean | null
          is_active?: boolean | null
          issue_duration?: string | null
          ops_email?: string | null
          order_number?: string | null
          passport_required?: boolean | null
          photo_required?: boolean | null
          price: number
          processing_days?: number
          remarks?: string | null
          requirements?: string[] | null
          terms_policy?: string | null
          updated_at?: string | null
          visa_type: string
        }
        Update: {
          country?: string
          created_at?: string | null
          documents_required?: string[] | null
          flag_image_url?: string | null
          id?: string
          id_scan_required?: boolean | null
          is_active?: boolean | null
          issue_duration?: string | null
          ops_email?: string | null
          order_number?: string | null
          passport_required?: boolean | null
          photo_required?: boolean | null
          price?: number
          processing_days?: number
          remarks?: string | null
          requirements?: string[] | null
          terms_policy?: string | null
          updated_at?: string | null
          visa_type?: string
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
    }
    Enums: {
      app_role: "admin" | "finance" | "agency"
      booking_status:
        | "draft"
        | "pending_payment"
        | "payment_under_review"
        | "confirmed"
        | "canceled"
        | "refunded"
      payment_method:
        | "qicard"
        | "first_iraqi_bank"
        | "bank_transfer"
        | "pay_in_office"
        | "pay_by_transfer"
        | "pay_by_card"
        | "rasheed_bank"
        | "trade_bank_iraq"
        | "national_bank_iraq"
        | "kurdistan_intl_bank"
        | "agency_credit"
      payment_status:
        | "unpaid"
        | "proof_uploaded"
        | "approved"
        | "rejected"
        | "refunded"
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
      app_role: ["admin", "finance", "agency"],
      booking_status: [
        "draft",
        "pending_payment",
        "payment_under_review",
        "confirmed",
        "canceled",
        "refunded",
      ],
      payment_method: [
        "qicard",
        "first_iraqi_bank",
        "bank_transfer",
        "pay_in_office",
        "pay_by_transfer",
        "pay_by_card",
        "rasheed_bank",
        "trade_bank_iraq",
        "national_bank_iraq",
        "kurdistan_intl_bank",
        "agency_credit",
      ],
      payment_status: [
        "unpaid",
        "proof_uploaded",
        "approved",
        "rejected",
        "refunded",
      ],
    },
  },
} as const
