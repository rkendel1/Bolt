import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { boltLogger } from '@/lib/logging/logger';
import { ChatSession } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId } = await request.json();

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID and User ID are required' },
        { status: 400 }
      );
    }

    // Create new chat session
    const sessionData = {
      user_id: userId,
      tenant_id: tenantId,
      status: 'active',
      context: {},
    };

    const { data: session, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    await boltLogger.info('Chat session created', {
      sessionId: session.id,
    }, {
      userId,
      tenantId,
    });

    return NextResponse.json({
      sessionId: session.id,
      status: 'success',
    });
  } catch (error) {
    await boltLogger.error('Failed to create chat session', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const tenantId = searchParams.get('tenantId');

    if (!sessionId || !tenantId) {
      return NextResponse.json(
        { error: 'Session ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // Get session with messages
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
      .single();

    if (sessionError) {
      throw new Error(`Failed to fetch session: ${sessionError.message}`);
    }

    // Get messages for this session
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`);
    }

    return NextResponse.json({
      session: {
        ...session,
        messages: messages || [],
      },
    });
  } catch (error) {
    await boltLogger.error('Failed to fetch chat session', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to fetch chat session' },
      { status: 500 }
    );
  }
}