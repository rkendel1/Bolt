import { supabaseAdmin } from '@/lib/supabase/client';
import { boltLogger } from '@/lib/logging/logger';
import { RevenueAnalytics, SaaSMetrics } from '@/types/analytics';

export class RevenueAnalyticsService {
  /**
   * Calculate and store revenue analytics for a period
   */
  static async generateRevenueAnalytics(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<RevenueAnalytics | null> {
    try {
      // This would integrate with Stripe in a real implementation
      // For now, we'll calculate based on subscription tiers and usage

      // Get subscription tiers for the tenant
      const { data: tiers } = await supabaseAdmin
        .from('subscription_tiers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (!tiers || tiers.length === 0) {
        return null;
      }

      // Get previous period analytics for comparison
      const previousPeriodStart = new Date(periodStart);
      previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
      const previousPeriodEnd = new Date(periodEnd);
      previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);

      const { data: previousAnalytics } = await supabaseAdmin
        .from('revenue_analytics')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('period_start', previousPeriodStart.toISOString().split('T')[0])
        .eq('period_end', previousPeriodEnd.toISOString().split('T')[0])
        .single();

      // Mock calculations (in real app, would integrate with billing system)
      const mockMetrics = this.generateMockRevenueMetrics(tiers, previousAnalytics);

      const revenueAnalytics: Omit<RevenueAnalytics, 'id' | 'created_at'> = {
        tenant_id: tenantId,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        ...mockMetrics,
      };

      // Insert or update revenue analytics
      const { data, error } = await supabaseAdmin
        .from('revenue_analytics')
        .upsert(revenueAnalytics, {
          onConflict: 'tenant_id, period_start, period_end'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      await boltLogger.info('Revenue analytics generated', {
        tenantId,
        period: `${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
        mrr: mockMetrics.mrr,
        totalCustomers: mockMetrics.total_customers,
      });

      return data;
    } catch (error) {
      await boltLogger.error('Failed to generate revenue analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
      return null;
    }
  }

  /**
   * Get revenue analytics for a tenant and period
   */
  static async getRevenueAnalytics(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<RevenueAnalytics[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('revenue_analytics')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('period_start', periodStart.toISOString().split('T')[0])
        .lte('period_end', periodEnd.toISOString().split('T')[0])
        .order('period_start', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      await boltLogger.error('Failed to get revenue analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
      return [];
    }
  }

  /**
   * Get current SaaS metrics for dashboard
   */
  static async getCurrentSaaSMetrics(tenantId: string): Promise<SaaSMetrics> {
    try {
      // Get current month
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get current month analytics
      const currentAnalytics = await this.getRevenueAnalytics(
        tenantId,
        currentMonthStart,
        currentMonthEnd
      );

      // Get previous month for growth calculation
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const previousAnalytics = await this.getRevenueAnalytics(
        tenantId,
        previousMonthStart,
        previousMonthEnd
      );

      const current = currentAnalytics[0] || await this.generateMockCurrentMetrics(tenantId);
      const previous = previousAnalytics[0];

      // Calculate growth rates
      const revenueGrowth = previous 
        ? ((current.mrr - previous.mrr) / previous.mrr) * 100 
        : 0;

      const usageGrowth = await this.calculateUsageGrowth(tenantId, currentMonthStart, previousMonthStart);

      return {
        mrr: current.mrr,
        arr: current.arr,
        churnRate: current.churn_rate,
        ltv: current.ltv,
        cac: current.cac,
        arpu: current.arpu,
        totalCustomers: current.total_customers,
        activeUsers: await this.getActiveUsersCount(tenantId, currentMonthStart, currentMonthEnd),
        usageGrowth,
        revenueGrowth,
      };
    } catch (error) {
      await boltLogger.error('Failed to get current SaaS metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
      
      // Return default metrics
      return {
        mrr: 0,
        arr: 0,
        churnRate: 0,
        ltv: 0,
        cac: 0,
        arpu: 0,
        totalCustomers: 0,
        activeUsers: 0,
        usageGrowth: 0,
        revenueGrowth: 0,
      };
    }
  }

  /**
   * Generate mock revenue metrics based on subscription tiers
   */
  private static generateMockRevenueMetrics(
    tiers: any[],
    previousAnalytics?: any
  ): Omit<RevenueAnalytics, 'id' | 'tenant_id' | 'period_start' | 'period_end' | 'created_at'> {
    // This is mock data - in a real implementation, this would integrate with Stripe
    const baseCustomers = previousAnalytics?.total_customers || 100;
    const growthRate = 0.05 + Math.random() * 0.1; // 5-15% monthly growth

    const totalCustomers = Math.round(baseCustomers * (1 + growthRate));
    const newCustomers = totalCustomers - baseCustomers;
    const churnedCustomers = Math.round(baseCustomers * 0.02); // 2% churn rate
    const upgradedCustomers = Math.round(baseCustomers * 0.03); // 3% upgrade rate
    const downgraded = Math.round(baseCustomers * 0.01); // 1% downgrade rate

    // Calculate average tier price
    const avgTierPrice = tiers.reduce((sum, tier) => sum + tier.monthly_price, 0) / tiers.length;
    
    const mrr = totalCustomers * avgTierPrice;
    const arr = mrr * 12;
    const churnRate = churnedCustomers / baseCustomers;
    const arpu = mrr / totalCustomers;
    const ltv = arpu / churnRate || arpu * 36; // 3 years if churn is 0
    const cac = arpu * 0.3; // Mock CAC as 30% of ARPU

    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      new_customers: newCustomers,
      churned_customers: churnedCustomers,
      upgraded_customers: upgradedCustomers,
      downgraded_customers: downgraded,
      total_customers: totalCustomers,
      churn_rate: Math.round(churnRate * 10000) / 10000,
      ltv: Math.round(ltv * 100) / 100,
      cac: Math.round(cac * 100) / 100,
      arpu: Math.round(arpu * 100) / 100,
    };
  }

  /**
   * Generate mock current metrics for display
   */
  private static async generateMockCurrentMetrics(tenantId: string): Promise<any> {
    // Get subscription tiers
    const { data: tiers } = await supabaseAdmin
      .from('subscription_tiers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    const mockMetrics = this.generateMockRevenueMetrics(tiers || []);
    
    return {
      ...mockMetrics,
      tenant_id: tenantId,
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date().toISOString().split('T')[0],
    };
  }

  /**
   * Calculate usage growth between periods
   */
  private static async calculateUsageGrowth(
    tenantId: string,
    currentPeriodStart: Date,
    previousPeriodStart: Date
  ): Promise<number> {
    try {
      const currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const previousPeriodEnd = new Date(previousPeriodStart);
      previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() + 1);

      // Get current period usage
      const { count: currentUsage } = await supabaseAdmin
        .from('usage_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('timestamp', currentPeriodStart.toISOString())
        .lt('timestamp', currentPeriodEnd.toISOString());

      // Get previous period usage
      const { count: previousUsage } = await supabaseAdmin
        .from('usage_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('timestamp', previousPeriodStart.toISOString())
        .lt('timestamp', previousPeriodEnd.toISOString());

      if (!previousUsage || previousUsage === 0) {
        return currentUsage || 0;
      }

      return ((currentUsage || 0) - previousUsage) / previousUsage * 100;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get active users count for a period
   */
  private static async getActiveUsersCount(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const { data } = await supabaseAdmin
        .from('usage_events')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .not('user_id', 'is', null);

      const uniqueUsers = new Set(data?.map(d => d.user_id));
      return uniqueUsers.size;
    } catch (error) {
      return 0;
    }
  }
}