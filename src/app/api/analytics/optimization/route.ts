import { NextRequest, NextResponse } from 'next/server';
import { TierOptimizer } from '@/lib/analytics/tier-optimizer';
import { boltLogger } from '@/lib/logging/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const type = searchParams.get('type'); // 'recommendations' or 'churn-risk'

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    if (type === 'churn-risk') {
      // Get churn risk scores
      const churnScores = await TierOptimizer.calculateChurnRiskScores(tenantId);
      
      return NextResponse.json({
        churnRiskScores: churnScores,
        summary: {
          totalUsers: churnScores.length,
          highRisk: churnScores.filter(s => s.risk_score > 70).length,
          mediumRisk: churnScores.filter(s => s.risk_score > 40 && s.risk_score <= 70).length,
          lowRisk: churnScores.filter(s => s.risk_score <= 40).length,
        },
      });
    }

    // Default: Get tier optimization recommendations
    const recommendations = await TierOptimizer.generateOptimizationRecommendations(tenantId, {
      analysisDepth: 'detailed',
      includeCompetitive: true,
    });

    // Categorize recommendations
    const categorized = {
      pricing: recommendations.filter(r => r.type === 'underpriced' || r.type === 'overpriced'),
      structure: recommendations.filter(r => r.type === 'new_tier' || r.type === 'tier_limits'),
      strategic: recommendations.filter(r => !['underpriced', 'overpriced', 'new_tier', 'tier_limits'].includes(r.type)),
    };

    const response = {
      recommendations,
      categorized,
      summary: {
        total: recommendations.length,
        highConfidence: recommendations.filter(r => r.confidence > 80).length,
        potentialRevenue: recommendations.reduce((sum, r) => sum + r.impact.revenue_change, 0),
      },
    };

    await boltLogger.info('Tier optimization recommendations generated', {
      tenantId,
      recommendationsCount: recommendations.length,
      highConfidenceCount: response.summary.highConfidence,
    });

    return NextResponse.json(response);
  } catch (error) {
    await boltLogger.error('Failed to get optimization recommendations', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to get optimization recommendations' },
      { status: 500 }
    );
  }
}