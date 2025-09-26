-- SaaS Analytics Database Schema Extensions
-- Run this in your Supabase SQL editor after the main setup.sql

-- Usage events table for tracking SaaS metrics
CREATE TABLE IF NOT EXISTS usage_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR NOT NULL, -- api_call, feature_usage, login, etc.
    feature_name VARCHAR,
    usage_amount INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscription tiers table for managing tier data
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    tier_name VARCHAR NOT NULL,
    tier_level INTEGER NOT NULL, -- 1=basic, 2=pro, 3=enterprise
    monthly_price DECIMAL(10, 2) NOT NULL,
    annual_price DECIMAL(10, 2),
    api_limit INTEGER,
    feature_limits JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Revenue analytics table for financial tracking
CREATE TABLE IF NOT EXISTS revenue_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    mrr DECIMAL(12, 2) DEFAULT 0, -- Monthly Recurring Revenue
    arr DECIMAL(12, 2) DEFAULT 0, -- Annual Recurring Revenue
    new_customers INTEGER DEFAULT 0,
    churned_customers INTEGER DEFAULT 0,
    upgraded_customers INTEGER DEFAULT 0,
    downgraded_customers INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    churn_rate DECIMAL(5, 4) DEFAULT 0, -- Percentage as decimal
    ltv DECIMAL(12, 2) DEFAULT 0, -- Customer Lifetime Value
    cac DECIMAL(12, 2) DEFAULT 0, -- Customer Acquisition Cost
    arpu DECIMAL(12, 2) DEFAULT 0, -- Average Revenue Per User
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table for proactive notifications
CREATE TABLE IF NOT EXISTS alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    alert_type VARCHAR NOT NULL, -- usage_threshold, churn_risk, upsell_opportunity
    severity VARCHAR DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Tier performance analytics for optimization
CREATE TABLE IF NOT EXISTS tier_performance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    tier_id UUID REFERENCES subscription_tiers(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    active_subscriptions INTEGER DEFAULT 0,
    new_subscriptions INTEGER DEFAULT 0,
    churned_subscriptions INTEGER DEFAULT 0,
    upgrade_from_count INTEGER DEFAULT 0,
    upgrade_to_count INTEGER DEFAULT 0,
    avg_usage_percentage DECIMAL(5, 2) DEFAULT 0, -- Average usage as percentage of limit
    overage_events INTEGER DEFAULT 0,
    revenue DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Usage aggregations for efficient querying
CREATE TABLE IF NOT EXISTS usage_aggregations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    aggregation_period VARCHAR NOT NULL, -- daily, weekly, monthly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    api_calls INTEGER DEFAULT 0,
    feature_usage JSONB DEFAULT '{}', -- {"feature1": count, "feature2": count}
    session_duration_minutes INTEGER DEFAULT 0,
    unique_features_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, user_id, aggregation_period, period_start)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_timestamp ON usage_events(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_tenant ON subscription_tiers(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_revenue_analytics_tenant_period ON revenue_analytics(tenant_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_unread ON alerts(tenant_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tier_performance_tenant_period ON tier_performance(tenant_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_usage_aggregations_tenant_period ON usage_aggregations(tenant_id, aggregation_period, period_start);

-- Update triggers for subscription_tiers
CREATE TRIGGER update_subscription_tiers_updated_at BEFORE UPDATE ON subscription_tiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();