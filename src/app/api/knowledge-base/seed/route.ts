import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { boltLogger } from '@/lib/logging/logger';
import { allKnowledgeEntries } from '@/knowledge-base';

export async function POST(request: NextRequest) {
  try {
    // Check if this is a development environment or has proper authorization
    const { adminKey } = await request.json();
    const authHeader = request.headers.get('authorization');
    const isAuthorized = (adminKey && adminKey === process.env.ADMIN_SEED_KEY) ||
                        (authHeader === `Bearer ${process.env.ADMIN_SECRET_KEY}`) || 
                        process.env.NODE_ENV === 'development';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear existing knowledge base entries (optional - be careful in production)
    const { data: existingEntries } = await supabaseAdmin
      .from('knowledge_base')
      .select('id')
      .limit(1);

    let seedingMessage = 'Seeding knowledge base with comprehensive entries...';
    
    if (existingEntries && existingEntries.length > 0) {
      // Clear existing entries
      await supabaseAdmin
        .from('knowledge_base')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      seedingMessage = 'Cleared existing entries and seeding fresh knowledge base...';
    }

    await boltLogger.info('Starting knowledge base seeding', {
      entries_count: allKnowledgeEntries.length,
      clear_existing: existingEntries && existingEntries.length > 0
    });

    // Prepare entries with timestamps
    const knowledgeEntries = allKnowledgeEntries.map(entry => ({
      ...entry,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Insert all knowledge entries in batches
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < knowledgeEntries.length; i += batchSize) {
      batches.push(knowledgeEntries.slice(i, i + batchSize));
    }

    let totalInserted = 0;
    const errors = [];

    for (const batch of batches) {
      try {
        const { data, error } = await supabaseAdmin
          .from('knowledge_base')
          .insert(batch)
          .select('id, title, type');

        if (error) {
          errors.push(`Batch error: ${error.message}`);
          await boltLogger.error('Knowledge base batch insert failed', {
            error: error.message,
            batch_size: batch.length
          });
        } else {
          totalInserted += data?.length || 0;
        }
      } catch (batchError) {
        const errorMessage = batchError instanceof Error ? batchError.message : 'Unknown batch error';
        errors.push(`Batch processing error: ${errorMessage}`);
        await boltLogger.error('Knowledge base batch processing failed', {
          error: errorMessage,
          batch_size: batch.length
        });
      }
    }

    // Get summary statistics
    const statsResult = await supabaseAdmin
      .from('knowledge_base')
      .select('type, category');

    const stats = statsResult.data ? (() => {
      const typeStats = statsResult.data.reduce((acc: any, entry: any) => {
        acc[entry.type] = (acc[entry.type] || 0) + 1;
        return acc;
      }, {});
      
      const categoryStats = statsResult.data.reduce((acc: any, entry: any) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
      }, {});

      return { typeStats, categoryStats, total: statsResult.data.length };
    })() : { typeStats: {}, categoryStats: {}, total: 0 };

    await boltLogger.info('Knowledge base seeding completed', {
      total_entries: totalInserted,
      total_in_db: stats.total,
      errors_count: errors.length,
      type_distribution: stats.typeStats,
      category_distribution: stats.categoryStats
    });

    const response = {
      success: true,
      message: seedingMessage,
      results: {
        entries_processed: allKnowledgeEntries.length,
        entries_inserted: totalInserted,
        total_in_database: stats.total,
        errors: errors,
        statistics: {
          by_type: stats.typeStats,
          by_category: stats.categoryStats
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await boltLogger.error('Knowledge base seeding failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to seed knowledge base',
        details: errorMessage
      }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get knowledge base statistics
    const { data: allEntries, error } = await supabaseAdmin
      .from('knowledge_base')
      .select('type, category, title, tags, created_at');

    if (error) {
      throw new Error(`Failed to fetch knowledge base: ${error.message}`);
    }

    const stats = {
      total_entries: allEntries?.length || 0,
      by_type: allEntries?.reduce((acc: any, entry: any) => {
        acc[entry.type] = (acc[entry.type] || 0) + 1;
        return acc;
      }, {}) || {},
      by_category: allEntries?.reduce((acc: any, entry: any) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
      }, {}) || {},
      recent_entries: allEntries
        ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        ?.slice(0, 10)
        ?.map((entry: any) => ({
          title: entry.title,
          type: entry.type,
          category: entry.category,
          tags: entry.tags?.slice(0, 3) || []
        })) || []
    };

    return NextResponse.json({
      success: true,
      statistics: stats,
      available_for_seeding: allKnowledgeEntries.length
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get knowledge base statistics',
        details: errorMessage
      }, 
      { status: 500 }
    );
  }
}