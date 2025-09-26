import { supabaseAdmin } from '@/lib/supabase/client';
import { boltLogger } from '@/lib/logging/logger';
import { Alert, UsageEvent, ChurnRiskScore } from '@/types/analytics';
import { UsageTracker } from './usage-tracker';
import { TierOptimizer } from './tier-optimizer';

export class AlertsManager {
  /**
   * Generate and store alerts based on current data
   */
  static async generateAlerts(tenantId: string): Promise<Alert[]> {
    try {
      const alerts: Omit<Alert, 'id' | 'created_at'>[] = [];

      // Get current data for analysis
      const [usageThresholdAlerts, churnRiskAlerts, upsellAlerts] = await Promise.all([
        this.checkUsageThresholds(tenantId),
        this.checkChurnRisks(tenantId),
        this.checkUpsellOpportunities(tenantId),
      ]);

      alerts.push(...usageThresholdAlerts, ...churnRiskAlerts, ...upsellAlerts);

      // Insert new alerts
      if (alerts.length > 0) {
        const { data, error } = await supabaseAdmin
          .from('alerts')
          .insert(alerts)
          .select();

        if (error) {
          throw error;
        }

        await boltLogger.info('Alerts generated', {
          tenantId,
          alertsGenerated: alerts.length,
          types: alerts.map(a => a.alert_type),
        });

        return data || [];
      }

      return [];
    } catch (error) {
      await boltLogger.error('Failed to generate alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
      return [];
    }
  }

  /**
   * Get active alerts for a tenant
   */
  static async getActiveAlerts(tenantId: string): Promise<Alert[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_dismissed', false)
        .or('expires_at.is.null,expires_at.gte.' + new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      await boltLogger.error('Failed to get active alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
      return [];
    }
  }

  /**
   * Mark alert as read
   */
  static async markAsRead(alertId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      await boltLogger.error('Failed to mark alert as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId,
      });
      return false;
    }
  }

  /**
   * Dismiss alert
   */
  static async dismissAlert(alertId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('alerts')
        .update({ is_dismissed: true })
        .eq('id', alertId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      await boltLogger.error('Failed to dismiss alert', {
        error: error instanceof Error ? error.message : 'Unknown error',
        alertId,
      });
      return false;
    }
  }

  /**
   * Check for usage threshold violations
   */
  private static async checkUsageThresholds(tenantId: string): Promise<Omit<Alert, 'id' | 'created_at'>[]> {
    const alerts: Omit<Alert, 'id' | 'created_at'>[] = [];

    try {
      // Get subscription tiers to know limits
      const { data: tiers } = await supabaseAdmin
        .from('subscription_tiers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (!tiers || tiers.length === 0) return alerts;

      // Get current month usage by user
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const usageEvents = await UsageTracker.getUsageEvents(tenantId, monthStart, now, {
        eventType: 'api_call',
        limit: 50000,
      });

      // Group usage by user
      const userUsage: Record<string, number> = {};
      usageEvents.forEach(event => {
        if (event.user_id) {
          userUsage[event.user_id] = (userUsage[event.user_id] || 0) + event.usage_amount;
        }
      });

      // Check each user against tier limits
      for (const [userId, usage] of Object.entries(userUsage)) {
        // For demo purposes, assume all users are on the 'Starter' tier (1000 API limit)
        const starterTier = tiers.find(t => t.tier_name === 'Starter');
        if (!starterTier || !starterTier.api_limit) continue;

        const usagePercentage = (usage / starterTier.api_limit) * 100;

        if (usagePercentage >= 80) {
          const severity = usagePercentage >= 95 ? 'high' : 'medium';
          
          alerts.push({
            tenant_id: tenantId,
            user_id: userId,
            alert_type: 'usage_threshold',
            severity,
            title: `API Usage ${usagePercentage >= 95 ? 'Critical' : 'Warning'}`,
            message: `User ${userId.slice(0, 8)}... has used ${Math.round(usagePercentage)}% of their monthly API quota (${usage}/${starterTier.api_limit} calls).`,
            metadata: {
              user_id: userId,
              usage_amount: usage,
              usage_limit: starterTier.api_limit,
              usage_percentage: Math.round(usagePercentage),
              tier: starterTier.tier_name,
            },
            is_read: false,
            is_dismissed: false,
          });
        }
      }
    } catch (error) {
      await boltLogger.error('Failed to check usage thresholds', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
    }

    return alerts;
  }

  /**
   * Check for churn risks
   */
  private static async checkChurnRisks(tenantId: string): Promise<Omit<Alert, 'id' | 'created_at'>[]> {
    const alerts: Omit<Alert, 'id' | 'created_at'>[] = [];

    try {
      const churnScores = await TierOptimizer.calculateChurnRiskScores(tenantId);
      
      // Generate alerts for high-risk users
      const highRiskUsers = churnScores.filter(score => score.risk_score > 70);
      
      for (const user of highRiskUsers) {
        const severity = user.risk_score > 90 ? 'critical' : 'high';
        
        alerts.push({
          tenant_id: tenantId,
          user_id: user.user_id,
          alert_type: 'churn_risk',
          severity,
          title: `High Churn Risk Detected`,
          message: `User ${user.user_id.slice(0, 8)}... has a ${user.risk_score}% churn risk. ${user.risk_factors.join(', ')}.`,
          metadata: {
            user_id: user.user_id,
            risk_score: user.risk_score,
            risk_factors: user.risk_factors,
            recommended_actions: user.recommended_actions,
            usage_trend: user.usage_trend,
            last_activity: user.last_activity,
          },
          is_read: false,
          is_dismissed: false,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 7 days
        });
      }
    } catch (error) {
      await boltLogger.error('Failed to check churn risks', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
    }

    return alerts;
  }

  /**
   * Check for upsell opportunities
   */
  private static async checkUpsellOpportunities(tenantId: string): Promise<Omit<Alert, 'id' | 'created_at'>[]> {
    const alerts: Omit<Alert, 'id' | 'created_at'>[] = [];

    try {
      // Get subscription tiers
      const { data: tiers } = await supabaseAdmin
        .from('subscription_tiers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('tier_level');

      if (!tiers || tiers.length < 2) return alerts;

      // Get current month usage
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const usageEvents = await UsageTracker.getUsageEvents(tenantId, monthStart, now, {
        limit: 50000,
      });

      // Group usage by user
      const userMetrics: Record<string, {
        apiCalls: number;
        features: Set<string>;
        totalEvents: number;
      }> = {};

      usageEvents.forEach(event => {
        if (!event.user_id) return;

        if (!userMetrics[event.user_id]) {
          userMetrics[event.user_id] = {
            apiCalls: 0,
            features: new Set(),
            totalEvents: 0,
          };
        }

        const metrics = userMetrics[event.user_id];
        metrics.totalEvents += event.usage_amount;

        if (event.event_type === 'api_call') {
          metrics.apiCalls += event.usage_amount;
        }

        if (event.feature_name) {
          metrics.features.add(event.feature_name);
        }
      });

      // Check for upsell opportunities
      const starterTier = tiers.find(t => t.tier_name === 'Starter');
      const proTier = tiers.find(t => t.tier_name === 'Professional');

      if (!starterTier || !proTier || !starterTier.api_limit) return alerts;

      for (const [userId, metrics] of Object.entries(userMetrics)) {
        // Check if user consistently uses 90%+ of starter tier limits
        const usagePercentage = (metrics.apiCalls / starterTier.api_limit) * 100;
        
        if (usagePercentage >= 90) {
          alerts.push({
            tenant_id: tenantId,
            user_id: userId,
            alert_type: 'upsell_opportunity',
            severity: 'medium',
            title: `Upsell Opportunity Identified`,
            message: `User ${userId.slice(0, 8)}... consistently uses ${Math.round(usagePercentage)}% of their ${starterTier.tier_name} plan limits. Consider upgrading to ${proTier.tier_name}.`,
            metadata: {
              user_id: userId,
              current_tier: starterTier.tier_name,
              suggested_tier: proTier.tier_name,
              usage_percentage: Math.round(usagePercentage),
              api_calls: metrics.apiCalls,
              unique_features: metrics.features.size,
              potential_revenue_increase: proTier.monthly_price - starterTier.monthly_price,
            },
            is_read: false,
            is_dismissed: false,
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 14 days
          });
        }

        // Check for high feature usage
        if (metrics.features.size >= 4 && usagePercentage >= 70) {
          alerts.push({
            tenant_id: tenantId,
            user_id: userId,
            alert_type: 'upsell_opportunity',
            severity: 'low',
            title: `Power User Detected`,
            message: `User ${userId.slice(0, 8)}... uses ${metrics.features.size} different features and ${Math.round(usagePercentage)}% of API limits. They might benefit from ${proTier.tier_name} features.`,
            metadata: {
              user_id: userId,
              current_tier: starterTier.tier_name,
              suggested_tier: proTier.tier_name,
              unique_features: metrics.features.size,
              features_used: Array.from(metrics.features),
              usage_percentage: Math.round(usagePercentage),
            },
            is_read: false,
            is_dismissed: false,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Expires in 30 days
          });
        }
      }
    } catch (error) {
      await boltLogger.error('Failed to check upsell opportunities', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
    }

    return alerts;
  }

  /**
   * Clean up expired alerts
   */
  static async cleanupExpiredAlerts(): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('alerts')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .not('expires_at', 'is', null);

      if (error) {
        throw error;
      }

      await boltLogger.info('Expired alerts cleaned up');
    } catch (error) {
      await boltLogger.error('Failed to cleanup expired alerts', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get alert statistics for a tenant
   */
  static async getAlertStats(tenantId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    try {
      const { data: alerts } = await supabaseAdmin
        .from('alerts')
        .select('alert_type, severity, is_read')
        .eq('tenant_id', tenantId)
        .eq('is_dismissed', false);

      if (!alerts) {
        return { total: 0, unread: 0, byType: {}, bySeverity: {} };
      }

      const stats = {
        total: alerts.length,
        unread: alerts.filter(a => !a.is_read).length,
        byType: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
      };

      alerts.forEach(alert => {
        stats.byType[alert.alert_type] = (stats.byType[alert.alert_type] || 0) + 1;
        stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      });

      return stats;
    } catch (error) {
      await boltLogger.error('Failed to get alert stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
      return { total: 0, unread: 0, byType: {}, bySeverity: {} };
    }
  }
}