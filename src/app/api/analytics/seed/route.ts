import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { UsageTracker } from '@/lib/analytics/usage-tracker';
import { boltLogger } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Create sample subscription tiers
    const tiers = [
      {
        tenant_id: tenantId,
        tier_name: 'Starter',
        tier_level: 1,
        monthly_price: 29.00,
        annual_price: 290.00,
        api_limit: 1000,
        feature_limits: {
          max_users: 5,
          max_projects: 3,
          support_level: 'email'
        },
        is_active: true,
      },
      {
        tenant_id: tenantId,
        tier_name: 'Professional',
        tier_level: 2,
        monthly_price: 79.00,
        annual_price: 790.00,
        api_limit: 5000,
        feature_limits: {
          max_users: 25,
          max_projects: 10,
          support_level: 'priority',
          advanced_analytics: true
        },
        is_active: true,
      },
      {
        tenant_id: tenantId,
        tier_name: 'Enterprise',
        tier_level: 3,
        monthly_price: 199.00,
        annual_price: 1990.00,
        api_limit: null, // unlimited
        feature_limits: {
          max_users: null, // unlimited
          max_projects: null, // unlimited
          support_level: 'dedicated',
          advanced_analytics: true,
          custom_integrations: true,
          sso: true
        },
        is_active: true,
      },
    ];

    // Insert subscription tiers
    const { data: tierData, error: tierError } = await supabaseAdmin
      .from('subscription_tiers')
      .upsert(tiers, { onConflict: 'tenant_id, tier_name' })
      .select();

    if (tierError) {
      throw tierError;
    }

    // Generate sample usage events for the last 30 days
    const usageEvents = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Create sample user IDs
    const sampleUserIds = [
      'user-001', 'user-002', 'user-003', 'user-004', 'user-005',
      'user-006', 'user-007', 'user-008', 'user-009', 'user-010'
    ];

    const features = [
      'chat_completion', 'document_analysis', 'workflow_automation',
      'data_export', 'team_collaboration', 'api_integration'
    ];

    // Generate events for each day
    for (let day = 0; day < 30; day++) {
      const eventDate = new Date(thirtyDaysAgo.getTime() + day * 24 * 60 * 60 * 1000);
      
      // Generate 50-200 events per day
      const eventsPerDay = Math.floor(Math.random() * 150) + 50;
      
      for (let i = 0; i < eventsPerDay; i++) {
        const userId = sampleUserIds[Math.floor(Math.random() * sampleUserIds.length)];
        const feature = features[Math.floor(Math.random() * features.length)];
        const eventType = Math.random() > 0.3 ? 'api_call' : 'feature_usage';
        
        // Add some randomness to the timestamp within the day
        const eventTime = new Date(eventDate.getTime() + Math.random() * 24 * 60 * 60 * 1000);
        
        usageEvents.push({
          tenant_id: tenantId,
          user_id: userId,
          event_type: eventType,
          feature_name: feature,
          usage_amount: Math.floor(Math.random() * 5) + 1,
          metadata: {
            ip_address: '192.168.1.' + Math.floor(Math.random() * 254),
            user_agent: 'BoltAI-Client/1.0',
            endpoint: eventType === 'api_call' ? `/api/${feature}` : undefined,
          },
          timestamp: eventTime.toISOString(),
        });
      }
    }

    // Insert usage events in batches
    const batchSize = 1000;
    for (let i = 0; i < usageEvents.length; i += batchSize) {
      const batch = usageEvents.slice(i, i + batchSize);
      const { error: usageError } = await supabaseAdmin
        .from('usage_events')
        .insert(batch);

      if (usageError) {
        throw usageError;
      }
    }

    // Generate sample revenue analytics for the last 6 months
    const revenueData = [];
    for (let month = 0; month < 6; month++) {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - month, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - month + 1, 0);
      
      const totalCustomers = 100 + month * 15; // Growing customer base
      const churnRate = 0.02 + Math.random() * 0.03; // 2-5% churn
      const newCustomers = Math.floor(totalCustomers * 0.1); // 10% growth
      const churned = Math.floor(totalCustomers * churnRate);
      
      // Calculate MRR based on tier distribution
      const tierDistribution = { starter: 0.6, professional: 0.3, enterprise: 0.1 };
      const mrr = 
        (totalCustomers * tierDistribution.starter * 29) +
        (totalCustomers * tierDistribution.professional * 79) +
        (totalCustomers * tierDistribution.enterprise * 199);

      revenueData.push({
        tenant_id: tenantId,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        new_customers: newCustomers,
        churned_customers: churned,
        upgraded_customers: Math.floor(totalCustomers * 0.03),
        downgraded_customers: Math.floor(totalCustomers * 0.01),
        total_customers: totalCustomers,
        churn_rate: Math.round(churnRate * 10000) / 10000,
        ltv: Math.round((mrr / totalCustomers) / churnRate * 100) / 100,
        cac: Math.round((mrr / totalCustomers) * 0.3 * 100) / 100,
        arpu: Math.round((mrr / totalCustomers) * 100) / 100,
      });
    }

    const { error: revenueError } = await supabaseAdmin
      .from('revenue_analytics')
      .upsert(revenueData, { onConflict: 'tenant_id, period_start, period_end' });

    if (revenueError) {
      throw revenueError;
    }

    // Generate sample alerts
    const alerts = [
      {
        tenant_id: tenantId,
        alert_type: 'usage_threshold',
        severity: 'medium',
        title: 'API Usage Approaching Limit',
        message: 'User user-003 has used 85% of their monthly API quota.',
        metadata: {
          user_id: 'user-003',
          usage_percentage: 85,
          tier: 'starter',
        },
        is_read: false,
        is_dismissed: false,
      },
      {
        tenant_id: tenantId,
        alert_type: 'churn_risk',
        severity: 'high',
        title: 'High Churn Risk Detected',
        message: 'User user-007 has not been active for 14 days and may be at risk of churning.',
        metadata: {
          user_id: 'user-007',
          days_inactive: 14,
          risk_score: 78,
        },
        is_read: false,
        is_dismissed: false,
      },
      {
        tenant_id: tenantId,
        alert_type: 'upsell_opportunity',
        severity: 'low',
        title: 'Upsell Opportunity Identified',
        message: 'User user-005 consistently uses 95% of their Starter plan limits.',
        metadata: {
          user_id: 'user-005',
          current_tier: 'starter',
          suggested_tier: 'professional',
          usage_percentage: 95,
        },
        is_read: false,
        is_dismissed: false,
      },
    ];

    const { error: alertsError } = await supabaseAdmin
      .from('alerts')
      .insert(alerts);

    if (alertsError) {
      throw alertsError;
    }

    await boltLogger.info('Analytics data seeded successfully', {
      tenantId,
      tiers: tierData?.length || 0,
      usageEvents: usageEvents.length,
      revenueRecords: revenueData.length,
      alerts: alerts.length,
    });

    return NextResponse.json({
      success: true,
      message: 'Analytics data seeded successfully',
      data: {
        tiers: tierData?.length || 0,
        usageEvents: usageEvents.length,
        revenueRecords: revenueData.length,
        alerts: alerts.length,
      },
    });
  } catch (error) {
    await boltLogger.error('Failed to seed analytics data', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to seed analytics data' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Delete all analytics data for the tenant
    const tables = [
      'usage_events',
      'subscription_tiers',
      'revenue_analytics',
      'alerts',
      'tier_performance',
      'usage_aggregations',
    ];

    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('tenant_id', tenantId);

      if (error) {
        console.warn(`Failed to delete from ${table}:`, error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Analytics data cleaned successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clean analytics data' },
      { status: 500 }
    );
  }
}