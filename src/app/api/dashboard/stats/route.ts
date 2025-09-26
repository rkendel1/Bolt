import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
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

    // Get total sessions
    const { count: totalSessions, error: sessionsError } = await supabaseAdmin
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (sessionsError) {
      throw new Error(`Failed to count sessions: ${sessionsError.message}`);
    }

    // Get active users (users with sessions in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activeUsersData, error: activeUsersError } = await supabaseAdmin
      .from('chat_sessions')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (activeUsersError) {
      throw new Error(`Failed to get active users: ${activeUsersError.message}`);
    }

    const activeUsers = new Set(activeUsersData?.map(session => session.user_id)).size;

    // Get total messages processed
    const { count: messagesProcessed, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (messagesError) {
      throw new Error(`Failed to count messages: ${messagesError.message}`);
    }

    // Calculate average response time (mock data for now)
    const averageResponseTime = 1.2;

    const stats = {
      totalSessions: totalSessions || 0,
      activeUsers,
      messagesProcessed: messagesProcessed || 0,
      averageResponseTime,
    };

    await boltLogger.info('Dashboard stats retrieved', {
      stats,
    }, {
      tenantId,
    });

    return NextResponse.json(stats);
  } catch (error) {
    await boltLogger.error('Failed to get dashboard stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to get dashboard stats' },
      { status: 500 }
    );
  }
}