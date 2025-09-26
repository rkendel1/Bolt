import { supabaseAdmin } from '@/lib/supabase/client';
import { boltLogger } from '@/lib/logging/logger';
import { TierOptimizationRecommendation, ChurnRiskScore, SubscriptionTier } from '@/types/analytics';
import OpenAI from 'openai';

export class TierOptimizer {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  /**
   * Generate tier optimization recommendations using AI
   */
  static async generateOptimizationRecommendations(
    tenantId: string,
    options: {
      analysisDepth?: 'basic' | 'detailed';
      includeCompetitive?: boolean;
    } = {}
  ): Promise<TierOptimizationRecommendation[]> {
    try {
      // Get current tiers and performance data
      const [tiers, performance, usage] = await Promise.all([
        this.getCurrentTiers(tenantId),
        this.getTierPerformanceData(tenantId),
        this.getUsagePatterns(tenantId),
      ]);

      if (!tiers.length) {
        return [];
      }

      // Analyze each tier
      const recommendations: TierOptimizationRecommendation[] = [];

      for (const tier of tiers) {
        const tierRecommendations = await this.analyzeTier(
          tier,
          performance.find(p => p.tier_id === tier.id),
          usage,
          options
        );
        recommendations.push(...tierRecommendations);
      }

      // Generate strategic recommendations
      const strategicRecommendations = await this.generateStrategicRecommendations(
        tiers,
        performance,
        usage
      );
      recommendations.push(...strategicRecommendations);

      await boltLogger.info('Tier optimization recommendations generated', {
        tenantId,
        recommendationsCount: recommendations.length,
      });

      return recommendations;
    } catch (error) {
      await boltLogger.error('Failed to generate tier optimization recommendations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
      return [];
    }
  }

  /**
   * Calculate churn risk scores for users
   */
  static async calculateChurnRiskScores(tenantId: string): Promise<ChurnRiskScore[]> {
    try {
      // Get user activity data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Get users and their activity
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, email, created_at')
        .eq('tenant_id', tenantId);

      if (!users) return [];

      const churnScores: ChurnRiskScore[] = [];

      for (const user of users) {
        const score = await this.calculateUserChurnRisk(user.id, tenantId, {
          thirtyDaysAgo,
          sevenDaysAgo,
        });
        if (score) {
          churnScores.push(score);
        }
      }

      // Sort by risk score (highest first)
      churnScores.sort((a, b) => b.risk_score - a.risk_score);

      await boltLogger.info('Churn risk scores calculated', {
        tenantId,
        usersAnalyzed: users.length,
        highRiskUsers: churnScores.filter(s => s.risk_score > 70).length,
      });

      return churnScores;
    } catch (error) {
      await boltLogger.error('Failed to calculate churn risk scores', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
      return [];
    }
  }

  /**
   * Get AI-powered pricing recommendations
   */
  static async getAIPricingRecommendations(
    tenantId: string,
    tiers: SubscriptionTier[],
    marketData?: Record<string, any>
  ): Promise<string[]> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return this.getFallbackPricingRecommendations(tiers);
      }

      const prompt = this.buildPricingAnalysisPrompt(tiers, marketData);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a SaaS pricing expert. Analyze the provided tier structure and usage data to provide actionable pricing recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const recommendations = response.choices[0]?.message?.content;
      if (!recommendations) {
        return this.getFallbackPricingRecommendations(tiers);
      }

      // Parse the AI response into actionable recommendations
      return this.parseAIRecommendations(recommendations);
    } catch (error) {
      await boltLogger.error('Failed to get AI pricing recommendations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId,
      });
      return this.getFallbackPricingRecommendations(tiers);
    }
  }

  /**
   * Analyze individual tier performance
   */
  private static async analyzeTier(
    tier: SubscriptionTier,
    performance: any,
    usage: any,
    options: any
  ): Promise<TierOptimizationRecommendation[]> {
    const recommendations: TierOptimizationRecommendation[] = [];

    // Check if tier is underpriced
    if (performance && performance.avg_usage_percentage > 90) {
      recommendations.push({
        id: `underpriced-${tier.id}`,
        type: 'underpriced',
        confidence: 85,
        title: `${tier.tier_name} Tier May Be Underpriced`,
        description: `Users are utilizing ${performance.avg_usage_percentage}% of their limits on average, indicating strong value perception.`,
        impact: {
          revenue_change: tier.monthly_price * 0.15, // 15% price increase estimate
          customer_retention: -2, // Small retention impact
          adoption_likelihood: 0.8,
        },
        recommendations: [
          'Consider increasing API limits by 20% and price by 15%',
          'Add premium features to justify higher pricing',
          'Implement usage-based pricing tiers',
        ],
        data_points: {
          current_price: tier.monthly_price,
          usage_percentage: performance.avg_usage_percentage,
          tier_level: tier.tier_level,
        },
      });
    }

    // Check if tier is overpriced
    if (performance && performance.avg_usage_percentage < 30 && performance.churned_subscriptions > performance.new_subscriptions) {
      recommendations.push({
        id: `overpriced-${tier.id}`,
        type: 'overpriced',
        confidence: 75,
        title: `${tier.tier_name} Tier May Be Overpriced`,
        description: `Low usage (${performance.avg_usage_percentage}%) and negative net growth suggest pricing misalignment.`,
        impact: {
          revenue_change: -tier.monthly_price * 0.1, // Revenue decrease from lower price
          customer_retention: 15, // Better retention
          adoption_likelihood: 0.9,
        },
        recommendations: [
          'Reduce price by 10-15% to improve adoption',
          'Add more value at current price point',
          'Create a lower-tier option',
        ],
        data_points: {
          current_price: tier.monthly_price,
          usage_percentage: performance.avg_usage_percentage,
          net_growth: performance.new_subscriptions - performance.churned_subscriptions,
        },
      });
    }

    return recommendations;
  }

  /**
   * Generate strategic tier recommendations
   */
  private static async generateStrategicRecommendations(
    tiers: SubscriptionTier[],
    performance: any[],
    usage: any
  ): Promise<TierOptimizationRecommendation[]> {
    const recommendations: TierOptimizationRecommendation[] = [];

    // Check for gaps in tier structure
    if (tiers.length < 3) {
      const avgPrice = tiers.reduce((sum, t) => sum + t.monthly_price, 0) / tiers.length;
      const suggestedPrice = avgPrice * 0.4; // 40% of average for entry tier

      recommendations.push({
        id: 'new-entry-tier',
        type: 'new_tier',
        confidence: 70,
        title: 'Consider Adding Entry-Level Tier',
        description: 'Gap analysis suggests potential for a lower-priced tier to capture price-sensitive customers.',
        impact: {
          revenue_change: suggestedPrice * 50, // Estimate 50 new customers
          customer_retention: 5,
          adoption_likelihood: 0.7,
        },
        recommendations: [
          `Create entry tier at $${suggestedPrice.toFixed(2)}/month`,
          'Limit features but maintain core value proposition',
          'Use as conversion funnel to higher tiers',
        ],
        data_points: {
          suggested_price: suggestedPrice,
          current_tier_count: tiers.length,
          price_gap: Math.max(...tiers.map(t => t.monthly_price)) - Math.min(...tiers.map(t => t.monthly_price)),
        },
      });
    }

    // Check for tier limit optimization
    const highUsageTiers = performance.filter(p => p.avg_usage_percentage > 80);
    if (highUsageTiers.length > 0) {
      recommendations.push({
        id: 'tier-limits-optimization',
        type: 'tier_limits',
        confidence: 80,
        title: 'Optimize Tier Limits Based on Usage Patterns',
        description: 'Multiple tiers showing high usage suggest limits may need adjustment.',
        impact: {
          revenue_change: 0, // Neutral revenue impact, better customer satisfaction
          customer_retention: 10,
          adoption_likelihood: 0.9,
        },
        recommendations: [
          'Increase limits for high-usage tiers by 25%',
          'Implement soft limits with overage charges',
          'Add usage analytics dashboard for customers',
        ],
        data_points: {
          high_usage_tiers: highUsageTiers.length,
          avg_usage: highUsageTiers.reduce((sum, t) => sum + t.avg_usage_percentage, 0) / highUsageTiers.length,
        },
      });
    }

    return recommendations;
  }

  /**
   * Calculate churn risk for individual user
   */
  private static async calculateUserChurnRisk(
    userId: string,
    tenantId: string,
    dates: { thirtyDaysAgo: Date; sevenDaysAgo: Date }
  ): Promise<ChurnRiskScore | null> {
    try {
      // Get user activity in last 30 days
      const { data: recentActivity } = await supabaseAdmin
        .from('usage_events')
        .select('event_type, timestamp')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .gte('timestamp', dates.thirtyDaysAgo.toISOString())
        .order('timestamp', { ascending: false });

      // Get user activity in last 7 days
      const { data: weeklyActivity } = await supabaseAdmin
        .from('usage_events')
        .select('event_type')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .gte('timestamp', dates.sevenDaysAgo.toISOString());

      const totalActivity = recentActivity?.length || 0;
      const weeklyActivityCount = weeklyActivity?.length || 0;

      // Calculate risk factors
      const riskFactors: string[] = [];
      let riskScore = 0;

      // No recent activity
      if (totalActivity === 0) {
        riskScore = 95;
        riskFactors.push('No activity in 30 days');
      } else if (weeklyActivityCount === 0) {
        riskScore = 80;
        riskFactors.push('No activity in 7 days');
      } else {
        // Declining usage pattern
        const firstHalfActivity = recentActivity?.filter(a => 
          new Date(a.timestamp) < new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
        ).length || 0;
        
        const secondHalfActivity = totalActivity - firstHalfActivity;
        
        if (firstHalfActivity > secondHalfActivity * 2) {
          riskScore = 60;
          riskFactors.push('Declining usage pattern');
        } else {
          riskScore = 20;
        }
      }

      // Low engagement with core features
      const apiCalls = recentActivity?.filter(a => a.event_type === 'api_call').length || 0;
      if (apiCalls < totalActivity * 0.3) {
        riskScore += 15;
        riskFactors.push('Low API usage');
      }

      // Usage trend
      let usageTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      if (weeklyActivityCount > totalActivity * 0.4) {
        usageTrend = 'increasing';
        riskScore = Math.max(0, riskScore - 10);
      } else if (weeklyActivityCount < totalActivity * 0.15) {
        usageTrend = 'decreasing';
        riskScore += 20;
      }

      // Cap risk score at 100
      riskScore = Math.min(100, riskScore);

      // Generate recommended actions
      const recommendedActions = this.generateChurnPreventionActions(riskScore, riskFactors, usageTrend);

      return {
        user_id: userId,
        tenant_id: tenantId,
        risk_score: riskScore,
        risk_factors: riskFactors,
        recommended_actions: recommendedActions,
        last_activity: recentActivity?.[0]?.timestamp || '',
        usage_trend: usageTrend,
      };
    } catch (error) {
      await boltLogger.error('Failed to calculate user churn risk', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        tenantId,
      });
      return null;
    }
  }

  /**
   * Generate churn prevention actions
   */
  private static generateChurnPreventionActions(
    riskScore: number,
    riskFactors: string[],
    usageTrend: string
  ): string[] {
    const actions: string[] = [];

    if (riskScore > 80) {
      actions.push('Send personalized re-engagement email');
      actions.push('Offer extended trial or discount');
      actions.push('Schedule customer success call');
    } else if (riskScore > 60) {
      actions.push('Provide feature tutorials');
      actions.push('Send usage tips and best practices');
      actions.push('Invite to user community or webinar');
    } else if (riskScore > 40) {
      actions.push('Send value-focused newsletter');
      actions.push('Highlight unused features');
    }

    if (riskFactors.includes('Low API usage')) {
      actions.push('Provide API integration tutorials');
      actions.push('Offer technical support session');
    }

    if (usageTrend === 'decreasing') {
      actions.push('Investigate usage barriers');
      actions.push('Provide alternative solutions');
    }

    return actions;
  }

  /**
   * Helper methods
   */
  private static async getCurrentTiers(tenantId: string): Promise<SubscriptionTier[]> {
    const { data } = await supabaseAdmin
      .from('subscription_tiers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('tier_level');

    return data || [];
  }

  private static async getTierPerformanceData(tenantId: string): Promise<any[]> {
    const { data } = await supabaseAdmin
      .from('tier_performance')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('period_start', { ascending: false })
      .limit(10);

    return data || [];
  }

  private static async getUsagePatterns(tenantId: string): Promise<any> {
    const { data } = await supabaseAdmin
      .from('usage_aggregations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('aggregation_period', 'monthly')
      .order('period_start', { ascending: false })
      .limit(6);

    return data || [];
  }

  private static buildPricingAnalysisPrompt(
    tiers: SubscriptionTier[],
    marketData?: Record<string, any>
  ): string {
    const tierSummary = tiers.map(t => 
      `${t.tier_name}: $${t.monthly_price}/month, Level ${t.tier_level}, API Limit: ${t.api_limit || 'Unlimited'}`
    ).join('\n');

    return `
Analyze this SaaS pricing structure and provide optimization recommendations:

Current Tiers:
${tierSummary}

Market Context:
${marketData ? JSON.stringify(marketData, null, 2) : 'Limited market data available'}

Please provide specific, actionable recommendations for:
1. Price adjustments
2. Tier structure optimization
3. Feature distribution
4. Competitive positioning

Format as numbered list with reasoning for each recommendation.
    `.trim();
  }

  private static parseAIRecommendations(content: string): string[] {
    // Simple parsing - in production, would use more sophisticated NLP
    return content
      .split('\n')
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 10);
  }

  private static getFallbackPricingRecommendations(tiers: SubscriptionTier[]): string[] {
    const recommendations: string[] = [];

    if (tiers.length < 3) {
      recommendations.push('Consider adding more tier options to capture different customer segments');
    }

    const priceDiffs = tiers.slice(1).map((tier, i) => tier.monthly_price - tiers[i].monthly_price);
    const avgDiff = priceDiffs.reduce((sum, diff) => sum + diff, 0) / priceDiffs.length;

    if (priceDiffs.some(diff => diff > avgDiff * 2)) {
      recommendations.push('Large price gaps between tiers may indicate need for intermediate options');
    }

    recommendations.push('Regularly review usage patterns to optimize tier limits');
    recommendations.push('Consider implementing usage-based pricing components');

    return recommendations;
  }
}