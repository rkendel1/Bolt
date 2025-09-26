import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { aiService } from '@/lib/ai/openai';
import { boltLogger } from '@/lib/logging/logger';
import { ChatMessage, ChatbotConfig } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, content, tenantId, userId } = await request.json();

    if (!sessionId || !content || !tenantId || !userId) {
      return NextResponse.json(
        { error: 'Session ID, content, tenant ID, and user ID are required' },
        { status: 400 }
      );
    }

    // Validate session exists and belongs to tenant
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 404 }
      );
    }

    // Store user message
    const userMessageData = {
      session_id: sessionId,
      user_id: userId,
      tenant_id: tenantId,
      content,
      role: 'user',
      metadata: {},
    };

    const { data: userMessage, error: userMessageError } = await supabaseAdmin
      .from('chat_messages')
      .insert([userMessageData])
      .select()
      .single();

    if (userMessageError) {
      throw new Error(`Failed to store user message: ${userMessageError.message}`);
    }

    // Get conversation history
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20); // Limit context to last 20 messages

    if (messagesError) {
      throw new Error(`Failed to fetch conversation history: ${messagesError.message}`);
    }

    // Get tenant configuration
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      throw new Error(`Failed to fetch tenant settings: ${tenantError.message}`);
    }

    // Get chatbot configuration (with defaults)
    const chatbotConfig: ChatbotConfig = {
      tenant_id: tenantId,
      model: tenant.settings?.ai_model || 'gpt-3.5-turbo',
      temperature: tenant.settings?.ai_temperature || 0.7,
      max_tokens: tenant.settings?.ai_max_tokens || 1000,
      system_prompt: tenant.settings?.system_prompt || '',
      enabled_features: {
        stripe_integration: tenant.settings?.stripe_enabled || true,
        workflow_automation: tenant.settings?.workflow_automation || true,
        tutorial_system: tenant.settings?.tutorial_system || true,
        multi_tenant: true,
      },
    };

    // Search knowledge base for relevant context
    const knowledgeEntries = await aiService.searchKnowledgeBase(content, tenantId, 3);

    // Analyze user intent
    const intentAnalysis = await aiService.analyzeUserIntent(content, tenantId);

    // Generate AI response
    const aiResponse = await aiService.generateResponse(
      messages || [],
      chatbotConfig,
      {
        knowledgeBase: knowledgeEntries,
        stripeContext: session.context?.stripe_context,
        workflowContext: session.context?.current_workflow,
      }
    );

    // Store AI response
    const assistantMessageData = {
      session_id: sessionId,
      user_id: userId,
      tenant_id: tenantId,
      content: aiResponse,
      role: 'assistant',
      metadata: {
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        knowledge_entries_used: knowledgeEntries.length,
      },
    };

    const { data: assistantMessage, error: assistantMessageError } = await supabaseAdmin
      .from('chat_messages')
      .insert([assistantMessageData])
      .select()
      .single();

    if (assistantMessageError) {
      throw new Error(`Failed to store assistant message: ${assistantMessageError.message}`);
    }

    // Update session context if needed
    if (intentAnalysis.entities && Object.keys(intentAnalysis.entities).length > 0) {
      const updatedContext = {
        ...session.context,
        last_intent: intentAnalysis.intent,
        entities: intentAnalysis.entities,
      };

      await supabaseAdmin
        .from('chat_sessions')
        .update({ 
          context: updatedContext,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }

    await boltLogger.info('Chat message processed', {
      sessionId,
      intent: intentAnalysis.intent,
      confidence: intentAnalysis.confidence,
      knowledgeEntriesUsed: knowledgeEntries.length,
    }, {
      userId,
      tenantId,
      sessionId,
    });

    return NextResponse.json({
      message: assistantMessage,
      intent: intentAnalysis.intent,
      confidence: intentAnalysis.confidence,
    });
  } catch (error) {
    await boltLogger.error('Failed to process chat message', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}