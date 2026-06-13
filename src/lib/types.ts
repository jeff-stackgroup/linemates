export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string
          ep_id: number | null
          name: string
          position: string | null
          shoots: string | null
          height_cm: number | null
          weight_kg: number | null
          birthdate: string | null
          birthplace: string | null
          nationality: string | null
          image_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['players']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['players']['Insert']>
      }
      teams: {
        Row: {
          id: string
          ep_id: number | null
          name: string
          league: string | null
          country: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['teams']['Insert']>
      }
      stints: {
        Row: {
          id: string
          player_id: string
          team_id: string
          season: string
          games: number | null
          goals: number | null
          assists: number | null
          points: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stints']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['stints']['Insert']>
      }
      connections: {
        Row: {
          id: string
          player_a_id: string
          player_b_id: string
          team_id: string
          season: string
          connection_type: string
        }
        Insert: Omit<Database['public']['Tables']['connections']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['connections']['Insert']>
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['chat_sessions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['chat_sessions']['Insert']>
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          metadata: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>
      }
    }
    Functions: {
      search_players: {
        Args: { query: string; result_limit?: number }
        Returns: { id: string; name: string; position: string; nationality: string; ep_id: number }[]
      }
      find_connection_path: {
        Args: { from_player_id: string; to_player_id: string; max_depth?: number }
        Returns: { path: string[]; player_names: string[]; team_names: string[]; seasons: string[]; depth: number }[]
      }
      get_career_teammates: {
        Args: { target_player_id: string }
        Returns: { player_id: string; player_name: string; team_name: string; season: string; shared_games: number }[]
      }
    }
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    paths?: ConnectionPath[]
    players?: PlayerResult[]
  }
}

export interface ConnectionPath {
  playerNames: string[]
  teamNames: string[]
  seasons: string[]
  depth: number
}

export interface PlayerResult {
  id: string
  name: string
  position: string | null
  nationality: string | null
}
