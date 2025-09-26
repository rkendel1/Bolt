import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Database schema types
export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          stripe_account_id: string | null;
          settings: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          stripe_account_id?: string | null;
          settings?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          stripe_account_id?: string | null;
          settings?: any;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          tenant_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          tenant_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          tenant_id?: string;
          updated_at?: string;
        };
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string;
          status: string;
          context: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id: string;
          status?: string;
          context?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tenant_id?: string;
          status?: string;
          context?: any | null;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          tenant_id: string;
          content: string;
          role: string;
          metadata: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          tenant_id: string;
          content: string;
          role: string;
          metadata?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          tenant_id?: string;
          content?: string;
          role?: string;
          metadata?: any | null;
        };
      };
      knowledge_base: {
        Row: {
          id: string;
          type: string;
          title: string;
          content: string;
          tags: string[];
          category: string;
          metadata: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          title: string;
          content: string;
          tags?: string[];
          category: string;
          metadata?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          title?: string;
          content?: string;
          tags?: string[];
          category?: string;
          metadata?: any | null;
          updated_at?: string;
        };
      };
      logs: {
        Row: {
          id: string;
          level: string;
          message: string;
          metadata: any | null;
          user_id: string | null;
          tenant_id: string | null;
          session_id: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          level: string;
          message: string;
          metadata?: any | null;
          user_id?: string | null;
          tenant_id?: string | null;
          session_id?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          level?: string;
          message?: string;
          metadata?: any | null;
          user_id?: string | null;
          tenant_id?: string | null;
          session_id?: string | null;
          timestamp?: string;
        };
      };
    };
  };
}