import { NextRequest, NextResponse } from 'next/server';

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

    // Mock metrics data - in a real application, this would come from your database
    const metrics = {
      totalConversations: 1547,
      avgResponseTime: 1.8,
      userSatisfaction: 92,
      activeUsers: 324,
      commonTopics: [
        { topic: 'stripe integration', count: 245 },
        { topic: 'payment processing', count: 198 },
        { topic: 'subscription management', count: 156 },
        { topic: 'webhook setup', count: 134 },
        { topic: 'troubleshooting', count: 89 },
        { topic: 'api documentation', count: 67 },
        { topic: 'billing issues', count: 45 }
      ],
      conversionRate: 78,
      recommendationsAccepted: 85
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Chat metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}