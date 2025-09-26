import { NextRequest, NextResponse } from 'next/server';
import { UsageTracker } from '@/lib/analytics/usage-tracker';
import { RevenueAnalyticsService } from '@/lib/analytics/revenue-analytics';
import { boltLogger } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tenantId, 
      reportType, 
      format = 'json',
      dateRange,
      filters = {}
    } = body;

    if (!tenantId || !reportType) {
      return NextResponse.json(
        { error: 'Tenant ID and report type are required' },
        { status: 400 }
      );
    }

    const startDate = dateRange?.start ? new Date(dateRange.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.end ? new Date(dateRange.end) : new Date();

    let reportData: any = {};

    switch (reportType) {
      case 'usage_summary':
        reportData = await generateUsageReport(tenantId, startDate, endDate, filters);
        break;
      case 'revenue_summary':
        reportData = await generateRevenueReport(tenantId, startDate, endDate, filters);
        break;
      case 'customer_analytics':
        reportData = await generateCustomerReport(tenantId, startDate, endDate, filters);
        break;
      case 'comprehensive':
        reportData = await generateComprehensiveReport(tenantId, startDate, endDate, filters);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    // Format the response based on requested format
    if (format === 'csv') {
      const csv = convertToCSV(reportData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}_${tenantId}_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    await boltLogger.info('Report generated', {
      tenantId,
      reportType,
      format,
      recordCount: reportData.summary?.totalRecords || 0,
    });

    return NextResponse.json({
      success: true,
      reportType,
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      data: reportData,
    });

  } catch (error) {
    await boltLogger.error('Failed to generate report', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function generateUsageReport(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  filters: any
): Promise<any> {
  const usageStats = await UsageTracker.getUsageStats(tenantId, 'daily', startDate, endDate);
  const usageEvents = await UsageTracker.getUsageEvents(tenantId, startDate, endDate, {
    eventType: filters.eventType,
    featureName: filters.featureName,
    userId: filters.userId,
    limit: 10000,
  });

  // Process daily usage trends
  const dailyUsage: Record<string, any> = {};
  usageEvents.forEach(event => {
    const date = event.timestamp.split('T')[0];
    if (!dailyUsage[date]) {
      dailyUsage[date] = {
        date,
        totalEvents: 0,
        apiCalls: 0,
        featureUsage: 0,
        uniqueUsers: new Set(),
      };
    }
    
    dailyUsage[date].totalEvents += event.usage_amount;
    if (event.event_type === 'api_call') {
      dailyUsage[date].apiCalls += event.usage_amount;
    } else if (event.event_type === 'feature_usage') {
      dailyUsage[date].featureUsage += event.usage_amount;
    }
    
    if (event.user_id) {
      dailyUsage[date].uniqueUsers.add(event.user_id);
    }
  });

  // Convert Sets to counts
  const processedDailyUsage = Object.values(dailyUsage).map((day: any) => ({
    ...day,
    uniqueUsers: day.uniqueUsers.size,
  }));

  return {
    summary: {
      totalEvents: usageStats.totalEvents,
      totalApiCalls: usageStats.apiCalls,
      totalRecords: usageEvents.length,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
    },
    dailyTrends: processedDailyUsage.sort((a, b) => a.date.localeCompare(b.date)),
    topFeatures: Object.entries(usageStats.featureUsage)
      .map(([name, count]) => ({ feature: name, usage: count }))
      .sort((a, b) => b.usage - a.usage),
    topUsers: usageStats.topUsers,
    rawEvents: filters.includeRawData ? usageEvents.slice(0, 1000) : [],
  };
}

async function generateRevenueReport(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  filters: any
): Promise<any> {
  const revenueAnalytics = await RevenueAnalyticsService.getRevenueAnalytics(
    tenantId,
    startDate,
    endDate
  );

  const currentMetrics = await RevenueAnalyticsService.getCurrentSaaSMetrics(tenantId);

  return {
    summary: {
      currentMRR: currentMetrics.mrr,
      currentARR: currentMetrics.arr,
      totalCustomers: currentMetrics.totalCustomers,
      churnRate: currentMetrics.churnRate,
      ltv: currentMetrics.ltv,
      cac: currentMetrics.cac,
      arpu: currentMetrics.arpu,
      totalRecords: revenueAnalytics.length,
    },
    monthlyTrends: revenueAnalytics.map(record => ({
      period: `${record.period_start} to ${record.period_end}`,
      mrr: record.mrr,
      arr: record.arr,
      newCustomers: record.new_customers,
      churnedCustomers: record.churned_customers,
      netGrowth: record.new_customers - record.churned_customers,
      churnRate: record.churn_rate,
    })),
    growthMetrics: {
      revenueGrowth: currentMetrics.revenueGrowth,
      customerGrowth: revenueAnalytics.length > 1 
        ? ((revenueAnalytics[0].total_customers - revenueAnalytics[1].total_customers) / revenueAnalytics[1].total_customers) * 100
        : 0,
    },
  };
}

async function generateCustomerReport(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  filters: any
): Promise<any> {
  const usageEvents = await UsageTracker.getUsageEvents(tenantId, startDate, endDate, {
    limit: 50000,
  });

  // Analyze customer behavior
  const customerAnalysis: Record<string, any> = {};
  
  usageEvents.forEach(event => {
    if (!event.user_id) return;

    if (!customerAnalysis[event.user_id]) {
      customerAnalysis[event.user_id] = {
        userId: event.user_id,
        totalEvents: 0,
        apiCalls: 0,
        featureUsage: 0,
        features: new Set(),
        firstActivity: event.timestamp,
        lastActivity: event.timestamp,
        dailyActivity: {},
      };
    }

    const customer = customerAnalysis[event.user_id];
    customer.totalEvents += event.usage_amount;
    
    if (event.event_type === 'api_call') {
      customer.apiCalls += event.usage_amount;
    } else if (event.event_type === 'feature_usage') {
      customer.featureUsage += event.usage_amount;
    }

    if (event.feature_name) {
      customer.features.add(event.feature_name);
    }

    // Track daily activity
    const date = event.timestamp.split('T')[0];
    customer.dailyActivity[date] = (customer.dailyActivity[date] || 0) + event.usage_amount;

    // Update activity timestamps
    if (event.timestamp < customer.firstActivity) {
      customer.firstActivity = event.timestamp;
    }
    if (event.timestamp > customer.lastActivity) {
      customer.lastActivity = event.timestamp;
    }
  });

  // Process customer data
  const customers = Object.values(customerAnalysis).map((customer: any) => {
    const activeDays = Object.keys(customer.dailyActivity).length;
    const totalDays = Math.ceil((new Date(customer.lastActivity).getTime() - new Date(customer.firstActivity).getTime()) / (24 * 60 * 60 * 1000)) + 1;
    
    return {
      ...customer,
      uniqueFeatures: customer.features.size,
      features: Array.from(customer.features),
      activeDays,
      totalDays,
      engagementScore: activeDays / Math.max(totalDays, 1),
      avgDailyUsage: customer.totalEvents / Math.max(activeDays, 1),
    };
  });

  // Sort by total events
  customers.sort((a, b) => b.totalEvents - a.totalEvents);

  return {
    summary: {
      totalCustomers: customers.length,
      totalRecords: usageEvents.length,
      avgEventsPerCustomer: customers.reduce((sum, c) => sum + c.totalEvents, 0) / customers.length,
      avgEngagementScore: customers.reduce((sum, c) => sum + c.engagementScore, 0) / customers.length,
    },
    topCustomers: customers.slice(0, 20),
    engagementDistribution: {
      high: customers.filter(c => c.engagementScore > 0.7).length,
      medium: customers.filter(c => c.engagementScore > 0.3 && c.engagementScore <= 0.7).length,
      low: customers.filter(c => c.engagementScore <= 0.3).length,
    },
    allCustomers: filters.includeAllCustomers ? customers : [],
  };
}

async function generateComprehensiveReport(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  filters: any
): Promise<any> {
  const [usageReport, revenueReport, customerReport] = await Promise.all([
    generateUsageReport(tenantId, startDate, endDate, filters),
    generateRevenueReport(tenantId, startDate, endDate, filters),
    generateCustomerReport(tenantId, startDate, endDate, filters),
  ]);

  return {
    summary: {
      reportType: 'comprehensive',
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      metrics: {
        totalEvents: usageReport.summary.totalEvents,
        totalCustomers: customerReport.summary.totalCustomers,
        mrr: revenueReport.summary.currentMRR,
        churnRate: revenueReport.summary.churnRate,
      },
    },
    usage: usageReport,
    revenue: revenueReport,
    customers: customerReport,
  };
}

function convertToCSV(data: any): string {
  // Simple CSV conversion for flat data structures
  if (data.summary && data.dailyTrends) {
    // Usage report CSV format
    const headers = ['Date', 'Total Events', 'API Calls', 'Feature Usage', 'Unique Users'];
    const rows = data.dailyTrends.map((day: any) => [
      day.date,
      day.totalEvents,
      day.apiCalls,
      day.featureUsage,
      day.uniqueUsers,
    ]);
    
    return [
      headers.join(','),
      ...rows.map((row: any[]) => row.join(','))
    ].join('\n');
  }

  // Fallback: convert to simple key-value CSV
  const lines = ['Key,Value'];
  
  function addToCSV(obj: any, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        addToCSV(value, fullKey);
      } else {
        lines.push(`"${fullKey}","${value}"`);
      }
    }
  }
  
  addToCSV(data);
  return lines.join('\n');
}