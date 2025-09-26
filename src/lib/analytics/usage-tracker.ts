import { supabaseAdmin } from '@/lib/supabase/client';
import { boltLogger } from '@/lib/logging/logger';
import { UsageEvent, UsageAggregation } from '@/types/analytics';

export class UsageTracker {
  /**
   * Track a usage event
   */
  static async trackEvent(
    tenantId: string,
    eventType: string,
    options: {
      userId?: string;
      featureName?: string;
      usageAmount?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('usage_events')
        .insert({
          tenant_id: tenantId,
          user_id: options.userId,
          event_type: eventType,
          feature_name: options.featureName,
          usage_amount: options.usageAmount || 1,
          metadata: options.metadata || {},
        });

      if (error) {
        throw error;
      }

      await boltLogger.info('Usage event tracked', {
        tenantId,
        eventType,
        featureName: options.featureName,
        usageAmount: options.usageAmount || 1,
      });
    } catch (error) {
      await boltLogger.error('Failed to track usage event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        eventType,
      });
      // Don't throw to avoid breaking the main application flow
    }
  }

  /**
   * Track API call usage
   */
  static async trackApiCall(
    tenantId: string,
    userId?: string,
    endpoint?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent(tenantId, 'api_call', {
      userId,
      featureName: endpoint,
      metadata: {
        ...metadata,
        endpoint,
      },
    });
  }

  /**
   * Track feature usage
   */
  static async trackFeatureUsage(
    tenantId: string,
    featureName: string,
    userId?: string,
    usageAmount = 1,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent(tenantId, 'feature_usage', {
      userId,
      featureName,
      usageAmount,
      metadata,
    });
  }

  /**
   * Get usage events for a tenant within a date range
   */
  static async getUsageEvents(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    options: {
      eventType?: string;
      featureName?: string;
      userId?: string;
      limit?: number;
    } = {}
  ): Promise<UsageEvent[]> {
    try {
      let query = supabaseAdmin
        .from('usage_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: false });

      if (options.eventType) {
        query = query.eq('event_type', options.eventType);
      }

      if (options.featureName) {
        query = query.eq('feature_name', options.featureName);
      }

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      await boltLogger.error('Failed to get usage events', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
      return [];
    }
  }

  /**
   * Get aggregated usage statistics
   */
  static async getUsageStats(
    tenantId: string,
    period: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEvents: number;
    apiCalls: number;
    featureUsage: Record<string, number>;
    topUsers: Array<{ userId: string; eventCount: number }>;
  }> {
    try {
      // Get total events
      const { count: totalEvents } = await supabaseAdmin
        .from('usage_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      // Get API calls
      const { count: apiCalls } = await supabaseAdmin
        .from('usage_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('event_type', 'api_call')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      // Get feature usage
      const { data: featureData } = await supabaseAdmin
        .from('usage_events')
        .select('feature_name, usage_amount')
        .eq('tenant_id', tenantId)
        .eq('event_type', 'feature_usage')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      const featureUsage: Record<string, number> = {};
      featureData?.forEach((event) => {
        if (event.feature_name) {
          featureUsage[event.feature_name] = (featureUsage[event.feature_name] || 0) + event.usage_amount;
        }
      });

      // Get top users
      const { data: userData } = await supabaseAdmin
        .from('usage_events')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .not('user_id', 'is', null);

      const userCounts: Record<string, number> = {};
      userData?.forEach((event) => {
        if (event.user_id) {
          userCounts[event.user_id] = (userCounts[event.user_id] || 0) + 1;
        }
      });

      const topUsers = Object.entries(userCounts)
        .map(([userId, eventCount]) => ({ userId, eventCount }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      return {
        totalEvents: totalEvents || 0,
        apiCalls: apiCalls || 0,
        featureUsage,
        topUsers,
      };
    } catch (error) {
      await boltLogger.error('Failed to get usage stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
      return {
        totalEvents: 0,
        apiCalls: 0,
        featureUsage: {},
        topUsers: [],
      };
    }
  }

  /**
   * Generate daily usage aggregations
   */
  static async generateDailyAggregations(tenantId: string, date: Date): Promise<void> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get unique users for the day
      const { data: usersData } = await supabaseAdmin
        .from('usage_events')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .gte('timestamp', startOfDay.toISOString())
        .lte('timestamp', endOfDay.toISOString())
        .not('user_id', 'is', null);

      const uniqueUsers = new Set(usersData?.map(d => d.user_id)).size;

      if (uniqueUsers === 0) return;

      // Get usage data by user
      const { data: eventsData } = await supabaseAdmin
        .from('usage_events')
        .select('user_id, event_type, feature_name, usage_amount')
        .eq('tenant_id', tenantId)
        .gte('timestamp', startOfDay.toISOString())
        .lte('timestamp', endOfDay.toISOString())
        .not('user_id', 'is', null);

      // Group by user
      const userStats: Record<string, {
        apiCalls: number;
        featureUsage: Record<string, number>;
        uniqueFeatures: Set<string>;
      }> = {};

      eventsData?.forEach((event) => {
        if (!event.user_id) return;

        if (!userStats[event.user_id]) {
          userStats[event.user_id] = {
            apiCalls: 0,
            featureUsage: {},
            uniqueFeatures: new Set(),
          };
        }

        if (event.event_type === 'api_call') {
          userStats[event.user_id].apiCalls += event.usage_amount;
        }

        if (event.feature_name) {
          userStats[event.user_id].featureUsage[event.feature_name] = 
            (userStats[event.user_id].featureUsage[event.feature_name] || 0) + event.usage_amount;
          userStats[event.user_id].uniqueFeatures.add(event.feature_name);
        }
      });

      // Insert aggregations
      const aggregations = Object.entries(userStats).map(([userId, stats]) => ({
        tenant_id: tenantId,
        user_id: userId,
        aggregation_period: 'daily' as const,
        period_start: startOfDay.toISOString().split('T')[0],
        period_end: startOfDay.toISOString().split('T')[0],
        api_calls: stats.apiCalls,
        feature_usage: stats.featureUsage,
        session_duration_minutes: 0, // Would need session tracking for this
        unique_features_used: stats.uniqueFeatures.size,
      }));

      if (aggregations.length > 0) {
        const { error } = await supabaseAdmin
          .from('usage_aggregations')
          .upsert(aggregations, {
            onConflict: 'tenant_id, user_id, aggregation_period, period_start'
          });

        if (error) {
          throw error;
        }
      }

      await boltLogger.info('Daily usage aggregations generated', {
        tenantId,
        date: date.toISOString().split('T')[0],
        userCount: aggregations.length,
      });
    } catch (error) {
      await boltLogger.error('Failed to generate daily aggregations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
        date: date.toISOString().split('T')[0],
      });
    }
  }
}