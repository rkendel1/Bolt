import { NextRequest, NextResponse } from 'next/server';
import { UsageTracker } from '@/lib/analytics/usage-tracker';
import { boltLogger } from '@/lib/logging/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const eventType = searchParams.get('eventType');
    const userId = searchParams.get('userId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get usage events
    const events = await UsageTracker.getUsageEvents(tenantId, start, end, {
      eventType: eventType || undefined,
      userId: userId || undefined,
      limit: 1000,
    });

    // Get usage statistics
    const stats = await UsageTracker.getUsageStats(tenantId, 'daily', start, end);

    // Process events for visualization
    const dailyUsage = events.reduce((acc, event) => {
      const date = event.timestamp.split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          apiCalls: 0,
          featureUsage: 0,
          totalEvents: 0,
        };
      }
      
      acc[date].totalEvents += event.usage_amount;
      
      if (event.event_type === 'api_call') {
        acc[date].apiCalls += event.usage_amount;
      } else if (event.event_type === 'feature_usage') {
        acc[date].featureUsage += event.usage_amount;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const usageData = {
      events: events.slice(0, 100), // Limit for performance
      stats,
      dailyUsage: Object.values(dailyUsage).sort((a: any, b: any) => a.date.localeCompare(b.date)),
      summary: {
        totalEvents: stats.totalEvents,
        avgDailyUsage: Math.round(stats.totalEvents / Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))),
        topFeatures: Object.entries(stats.featureUsage)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      },
    };

    return NextResponse.json(usageData);
  } catch (error) {
    await boltLogger.error('Failed to get usage analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to get usage analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, eventType, userId, featureName, usageAmount, metadata } = body;

    if (!tenantId || !eventType) {
      return NextResponse.json(
        { error: 'Tenant ID and event type are required' },
        { status: 400 }
      );
    }

    await UsageTracker.trackEvent(tenantId, eventType, {
      userId,
      featureName,
      usageAmount,
      metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    await boltLogger.error('Failed to track usage event', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to track usage event' },
      { status: 500 }
    );
  }
}