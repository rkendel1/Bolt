// Analytics and SaaS-specific types
export interface UsageEvent {
  id: string;
  tenant_id: string;
  user_id?: string;
  event_type: string;
  feature_name?: string;
  usage_amount: number;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface SubscriptionTier {
  id: string;
  tenant_id: string;
  tier_name: string;
  tier_level: number;
  monthly_price: number;
  annual_price?: number;
  api_limit?: number;
  feature_limits: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RevenueAnalytics {
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
}

export interface Alert {
  id: string;
  tenant_id: string;
  user_id?: string;
  alert_type: 'usage_threshold' | 'churn_risk' | 'upsell_opportunity' | 'tier_optimization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  metadata: Record<string, any>;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  expires_at?: string;
}

export interface TierPerformance {
  id: string;
  tenant_id: string;
  tier_id: string;
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
}

export interface UsageAggregation {
  id: string;
  tenant_id: string;
  user_id?: string;
  aggregation_period: 'daily' | 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  api_calls: number;
  feature_usage: Record<string, number>;
  session_duration_minutes: number;
  unique_features_used: number;
  created_at: string;
}

// Analytics dashboard specific types
export interface SaaSMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  ltv: number;
  cac: number;
  arpu: number;
  totalCustomers: number;
  activeUsers: number;
  usageGrowth: number;
  revenueGrowth: number;
}

export interface UsageMetrics {
  totalApiCalls: number;
  averageApiCalls: number;
  topFeatures: Array<{
    name: string;
    usage: number;
    growth: number;
  }>;
  usageByTier: Record<string, number>;
  peakUsageTimes: Array<{
    hour: number;
    usage: number;
  }>;
}

export interface TierOptimizationRecommendation {
  id: string;
  type: 'underpriced' | 'overpriced' | 'new_tier' | 'tier_limits';
  confidence: number;
  title: string;
  description: string;
  impact: {
    revenue_change: number;
    customer_retention: number;
    adoption_likelihood: number;
  };
  recommendations: string[];
  data_points: Record<string, any>;
}

export interface ChurnRiskScore {
  user_id: string;
  tenant_id: string;
  risk_score: number; // 0-100
  risk_factors: string[];
  recommended_actions: string[];
  last_activity: string;
  usage_trend: 'increasing' | 'stable' | 'decreasing';
}

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface ReportFilter {
  dateRange: AnalyticsDateRange;
  tiers?: string[];
  userSegments?: string[];
  features?: string[];
  customFilters?: Record<string, any>;
}

export interface ExportFormat {
  format: 'csv' | 'json' | 'pdf';
  includeCharts: boolean;
  includeRawData: boolean;
}

// Alert configuration types
export interface AlertConfiguration {
  id: string;
  tenant_id: string;
  alert_type: string;
  thresholds: Record<string, number>;
  notification_channels: ('email' | 'webhook' | 'slack')[];
  is_active: boolean;
  metadata: Record<string, any>;
}