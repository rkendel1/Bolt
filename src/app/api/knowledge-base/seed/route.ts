import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { boltLogger } from '@/lib/logging/logger';
import { stripeKnowledgeBase } from '@/knowledge-base/stripe-knowledge';

export async function POST(request: NextRequest) {
  try {
    // In production, you might want to add authentication here
    const { adminKey } = await request.json();
    
    if (!adminKey || adminKey !== process.env.ADMIN_SEED_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Clear existing knowledge base entries (optional)
    await supabaseAdmin
      .from('knowledge_base')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // Seed with stripe knowledge base
    const knowledgeEntries = stripeKnowledgeBase.map(entry => ({
      ...entry,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data: insertedEntries, error } = await supabaseAdmin
      .from('knowledge_base')
      .insert(knowledgeEntries)
      .select();

    if (error) {
      throw new Error(`Failed to seed knowledge base: ${error.message}`);
    }

    await boltLogger.info('Knowledge base seeded', {
      entriesCount: insertedEntries?.length || 0,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${insertedEntries?.length || 0} knowledge base entries`,
      data: insertedEntries,
    });
  } catch (error) {
    await boltLogger.error('Failed to seed knowledge base', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to seed knowledge base' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get current knowledge base count
    const { count, error } = await supabaseAdmin
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to count knowledge base entries: ${error.message}`);
    }

    return NextResponse.json({
      currentEntries: count || 0,
      availableEntries: stripeKnowledgeBase.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get knowledge base status' },
      { status: 500 }
    );
  }
}