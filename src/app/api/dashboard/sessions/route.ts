import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { boltLogger } from '@/lib/logging/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Get sessions with message count
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('chat_sessions')
      .select(`
        id,
        user_id,
        status,
        created_at,
        updated_at,
        chat_messages(count)
      `)
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    // Transform the data to include message count
    const transformedSessions = sessions?.map(session => ({
      ...session,
      message_count: Array.isArray(session.chat_messages) 
        ? session.chat_messages.length 
        : (session.chat_messages as any)?.count || 0,
      chat_messages: undefined, // Remove the nested data
    })) || [];

    await boltLogger.info('Dashboard sessions retrieved', {
      sessionCount: transformedSessions.length,
    }, {
      tenantId,
    });

    return NextResponse.json({
      sessions: transformedSessions,
    });
  } catch (error) {
    await boltLogger.error('Failed to get dashboard sessions', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to get dashboard sessions' },
      { status: 500 }
    );
  }
}