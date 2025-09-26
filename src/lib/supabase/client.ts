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
      usage_events: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          event_type: string;
          feature_name: string | null;
          usage_amount: number;
          metadata: any;
          timestamp: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          event_type: string;
          feature_name?: string | null;
          usage_amount?: number;
          metadata?: any;
          timestamp?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          event_type?: string;
          feature_name?: string | null;
          usage_amount?: number;
          metadata?: any;
          timestamp?: string;
        };
      };
      subscription_tiers: {
        Row: {
          id: string;
          tenant_id: string;
          tier_name: string;
          tier_level: number;
          monthly_price: number;
          annual_price: number | null;
          api_limit: number | null;
          feature_limits: any;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          tier_name: string;
          tier_level: number;
          monthly_price: number;
          annual_price?: number | null;
          api_limit?: number | null;
          feature_limits?: any;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          tier_name?: string;
          tier_level?: number;
          monthly_price?: number;
          annual_price?: number | null;
          api_limit?: number | null;
          feature_limits?: any;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      revenue_analytics: {
        Row: {
          id: string;
          tenant_id: string;
          period_start: string;
          period_end: string;
          mrr: number;
          arr: number;
          new_customers: number;
          churned_customers: number;
          upgraded_customers: number;
          downgraded_customers: number;
          total_customers: number;
          churn_rate: number;
          ltv: number;
          cac: number;
          arpu: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          period_start: string;
          period_end: string;
          mrr?: number;
          arr?: number;
          new_customers?: number;
          churned_customers?: number;
          upgraded_customers?: number;
          downgraded_customers?: number;
          total_customers?: number;
          churn_rate?: number;
          ltv?: number;
          cac?: number;
          arpu?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          period_start?: string;
          period_end?: string;
          mrr?: number;
          arr?: number;
          new_customers?: number;
          churned_customers?: number;
          upgraded_customers?: number;
          downgraded_customers?: number;
          total_customers?: number;
          churn_rate?: number;
          ltv?: number;
          cac?: number;
          arpu?: number;
        };
      };
      alerts: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          alert_type: string;
          severity: string;
          title: string;
          message: string;
          metadata: any;
          is_read: boolean;
          is_dismissed: boolean;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          alert_type: string;
          severity?: string;
          title: string;
          message: string;
          metadata?: any;
          is_read?: boolean;
          is_dismissed?: boolean;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          alert_type?: string;
          severity?: string;
          title?: string;
          message?: string;
          metadata?: any;
          is_read?: boolean;
          is_dismissed?: boolean;
          expires_at?: string | null;
        };
      };
      tier_performance: {
        Row: {
          id: string;
          tenant_id: string;
          tier_id: string | null;
          period_start: string;
          period_end: string;
          active_subscriptions: number;
          new_subscriptions: number;
          churned_subscriptions: number;
          upgrade_from_count: number;
          upgrade_to_count: number;
          avg_usage_percentage: number;
          overage_events: number;
          revenue: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          tier_id?: string | null;
          period_start: string;
          period_end: string;
          active_subscriptions?: number;
          new_subscriptions?: number;
          churned_subscriptions?: number;
          upgrade_from_count?: number;
          upgrade_to_count?: number;
          avg_usage_percentage?: number;
          overage_events?: number;
          revenue?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          tier_id?: string | null;
          period_start?: string;
          period_end?: string;
          active_subscriptions?: number;
          new_subscriptions?: number;
          churned_subscriptions?: number;
          upgrade_from_count?: number;
          upgrade_to_count?: number;
          avg_usage_percentage?: number;
          overage_events?: number;
          revenue?: number;
        };
      };
      usage_aggregations: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          aggregation_period: string;
          period_start: string;
          period_end: string;
          api_calls: number;
          feature_usage: any;
          session_duration_minutes: number;
          unique_features_used: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          aggregation_period: string;
          period_start: string;
          period_end: string;
          api_calls?: number;
          feature_usage?: any;
          session_duration_minutes?: number;
          unique_features_used?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          aggregation_period?: string;
          period_start?: string;
          period_end?: string;
          api_calls?: number;
          feature_usage?: any;
          session_duration_minutes?: number;
          unique_features_used?: number;
        };
      };
    };
  };
}