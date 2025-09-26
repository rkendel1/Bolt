import { NextRequest, NextResponse } from 'next/server';
import { RevenueAnalyticsService } from '@/lib/analytics/revenue-analytics';
import { UsageTracker } from '@/lib/analytics/usage-tracker';
import { boltLogger } from '@/lib/logging/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Get current SaaS metrics
    const saasMetrics = await RevenueAnalyticsService.getCurrentSaaSMetrics(tenantId);

    // Get current period usage stats
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageStats = await UsageTracker.getUsageStats(
      tenantId,
      'monthly',
      thirtyDaysAgo,
      now
    );

    const metrics = {
      saas: saasMetrics,
      usage: {
        totalApiCalls: usageStats.apiCalls,
        totalEvents: usageStats.totalEvents,
        topFeatures: Object.entries(usageStats.featureUsage)
          .map(([name, usage]) => ({
            name,
            usage,
            growth: Math.random() * 20 - 10, // Mock growth data
          }))
          .sort((a, b) => b.usage - a.usage)
          .slice(0, 5),
        topUsers: usageStats.topUsers,
      },
      summary: {
        mrr: saasMetrics.mrr,
        totalCustomers: saasMetrics.totalCustomers,
        activeUsers: saasMetrics.activeUsers,
        churnRate: saasMetrics.churnRate,
        revenueGrowth: saasMetrics.revenueGrowth,
        usageGrowth: saasMetrics.usageGrowth,
      },
    };

    await boltLogger.info('Analytics metrics retrieved', {
      tenantId,
      mrr: metrics.saas.mrr,
      activeUsers: metrics.saas.activeUsers,
    });

    return NextResponse.json(metrics);
  } catch (error) {
    await boltLogger.error('Failed to get analytics metrics', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to get analytics metrics' },
      { status: 500 }
    );
  }
}