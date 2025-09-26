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

    // Mock real-time stats - in a real application, this would be calculated from recent data
    const baseMessagesPerHour = 42;
    const baseActiveConversations = 8;
    const baseAvgSessionLength = 12;

    // Add some realistic variation
    const variation = 0.1;
    const stats = {
      messagesPerHour: Math.round(baseMessagesPerHour * (1 + (Math.random() - 0.5) * variation)),
      activeConversations: Math.round(baseActiveConversations * (1 + (Math.random() - 0.5) * variation)),
      avgSessionLength: Math.round(baseAvgSessionLength * (1 + (Math.random() - 0.5) * variation))
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Real-time stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}