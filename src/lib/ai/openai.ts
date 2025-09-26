import { OpenAI } from 'openai';
import { ChatMessage, ChatbotConfig, KnowledgeBaseEntry } from '@/types';
import { boltLogger } from '../logging/logger';
import { supabaseAdmin } from '../supabase/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AIService {
  private static instance: AIService;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  private getSystemPrompt(config: ChatbotConfig): string {
    return `You are Bolt, an intelligent AI assistant specialized in helping SaaS creators build, scale, and optimize their applications. You have comprehensive knowledge of Stripe APIs, payment processing, subscription management, SaaS architecture, and industry best practices.

**Core Expertise:**
- Stripe API integration and payment processing
- SaaS subscription lifecycle management
- Multi-tenant architecture design
- Security best practices and compliance
- Performance optimization and scaling
- Workflow automation and guidance
- Troubleshooting and error resolution
- Tutorial and step-by-step guidance

**Guidance Principles:**
1. **Security First**: Always prioritize security in payment handling and data protection
2. **Actionable Advice**: Provide clear, implementable solutions with code examples
3. **Context Awareness**: Consider the user's current setup and multi-tenant implications
4. **Best Practices**: Recommend industry-standard approaches and patterns
5. **Proactive Warnings**: Alert users to common pitfalls and potential issues
6. **Testing Emphasis**: Always suggest proper testing strategies
7. **Compliance Awareness**: Consider PCI DSS, GDPR, and other regulatory requirements

**Response Style:**
- Be conversational but professional
- Ask clarifying questions when context is unclear
- Provide step-by-step guidance for complex tasks
- Include warnings about common mistakes
- Suggest next steps and related considerations
- Reference official documentation when appropriate

**Current Tenant Configuration:**
- Features enabled: ${JSON.stringify(config.enabled_features)}
- Model: ${config.model}
- Multi-tenant: ${config.enabled_features.multi_tenant ? 'Yes' : 'No'}

**Instructions:**
- For tutorials, provide complete, working examples
- For troubleshooting, ask diagnostic questions
- For architecture advice, consider scalability and maintainability
- For security questions, be thorough and specific
- Always confirm understanding before proceeding with complex implementations

You are here to be a helpful, knowledgeable partner in building successful SaaS applications.`;
  }

  async generateResponse(
    messages: ChatMessage[],
    config: ChatbotConfig,
    context?: {
      knowledgeBase?: KnowledgeBaseEntry[];
      stripeContext?: any;
      workflowContext?: any;
      executionResult?: any;
    }
  ): Promise<string> {
    try {
      // Prepare conversation history
      const conversationMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: this.getSystemPrompt(config),
        },
      ];

      // Add knowledge base context if available
      if (context?.knowledgeBase && context.knowledgeBase.length > 0) {
        const knowledgeContext = this.formatKnowledgeBaseContext(context.knowledgeBase);
        conversationMessages.push({
          role: 'system',
          content: `**Relevant Knowledge Base Information:**\n${knowledgeContext}`,
        });
      }

      // Add execution result as context if available
      if (context?.executionResult) {
        const executionContext = this.formatExecutionContext(context.executionResult);
        conversationMessages.push({
          role: 'system',
          content: `**Previous Action Result:**\n${executionContext}`,
        });
      }

      // Add Stripe context if available
      if (context?.stripeContext) {
        conversationMessages.push({
          role: 'system',
          content: `**Current Stripe Context:**\n${JSON.stringify(context.stripeContext, null, 2)}`,
        });
      }

      // Add workflow context if available
      if (context?.workflowContext) {
        conversationMessages.push({
          role: 'system',
          content: `**Current Workflow Context:**\n${JSON.stringify(context.workflowContext, null, 2)}`,
        });
      }

      // Add conversation history
      messages.forEach(message => {
        conversationMessages.push({
          role: message.role as 'user' | 'assistant',
          content: message.content,
        });
      });

      const completion = await openai.chat.completions.create({
        model: config.model,
        messages: conversationMessages,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
      });

      const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';

      await boltLogger.info('AI response generated', {
        model: config.model,
        tokens_used: completion.usage?.total_tokens,
        response_length: response.length,
        knowledge_entries_used: context?.knowledgeBase?.length || 0,
        has_execution_result: !!context?.executionResult,
        has_stripe_context: !!context?.stripeContext,
      }, {
        tenantId: config.tenant_id,
      });

      return response;
    } catch (error) {
      await boltLogger.error('Failed to generate AI response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: config.model,
      }, {
        tenantId: config.tenant_id,
      });

      return 'I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.';
    }
  }

  private formatKnowledgeBaseContext(entries: KnowledgeBaseEntry[]): string {
    return entries.map(entry => {
      const metadata = entry.metadata ? ` (${Object.entries(entry.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')})` : '';
      return `**${entry.title}** [${entry.type}]${metadata}\n${entry.content}\nTags: ${entry.tags.join(', ')}`;
    }).join('\n\n---\n\n');
  }

  private formatExecutionContext(executionResult: any): string {
    const status = executionResult.success ? '✅ Success' : '❌ Failed';
    let context = `${status}\n`;
    
    if (executionResult.message) {
      context += `Message: ${executionResult.message}\n`;
    }
    
    if (executionResult.actions_taken && executionResult.actions_taken.length > 0) {
      context += `Actions taken: ${executionResult.actions_taken.join(', ')}\n`;
    }
    
    if (executionResult.data) {
      context += `Data: ${JSON.stringify(executionResult.data, null, 2)}\n`;
    }
    
    if (executionResult.error) {
      context += `Error: ${executionResult.error}\n`;
    }
    
    return context;
  }

  async searchKnowledgeBase(
    query: string,
    tenantId: string,
    limit: number = 5
  ): Promise<KnowledgeBaseEntry[]> {
    try {
      // Enhanced search with multiple strategies
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
      
      if (searchTerms.length === 0) {
        return [];
      }

      // Build search query for PostgreSQL full-text search and pattern matching
      const searchQuery = `
        SELECT *, 
        (
          -- Score based on title match (highest weight)
          CASE WHEN LOWER(title) LIKE $1 THEN 100 ELSE 0 END +
          -- Score based on exact phrase match in content
          CASE WHEN LOWER(content) LIKE $1 THEN 50 ELSE 0 END +
          -- Score based on individual term matches
          ${searchTerms.map((_, index) => 
            `CASE WHEN LOWER(title) LIKE $${index + 2} THEN 20 ELSE 0 END +
             CASE WHEN LOWER(content) LIKE $${index + 2} THEN 10 ELSE 0 END`
          ).join(' + ')} +
          -- Score based on tag matches
          ${searchTerms.map((_, index) => 
            `CASE WHEN $${index + 2 + searchTerms.length} = ANY(LOWER(tags::text)::text[]) THEN 30 ELSE 0 END`
          ).join(' + ')} +
          -- Score based on category match
          CASE WHEN LOWER(category) LIKE $${2 + searchTerms.length * 2} THEN 15 ELSE 0 END
        ) as relevance_score
        FROM knowledge_base 
        WHERE (
          LOWER(title) LIKE $1 OR 
          LOWER(content) LIKE $1 OR
          ${searchTerms.map((_, index) => 
            `LOWER(title) LIKE $${index + 2} OR 
             LOWER(content) LIKE $${index + 2} OR
             $${index + 2 + searchTerms.length} = ANY(LOWER(tags::text)::text[])`
          ).join(' OR ')} OR
          LOWER(category) LIKE $${2 + searchTerms.length * 2}
        )
        ORDER BY relevance_score DESC, created_at DESC
        LIMIT $${3 + searchTerms.length * 2}
      `;

      const queryParams = [
        `%${query.toLowerCase()}%`, // Full query match
        ...searchTerms.map(term => `%${term}%`), // Individual term matches for title/content
        ...searchTerms.map(term => term), // Individual terms for tag matches
        `%${query.toLowerCase()}%`, // Category match
        limit
      ];

      const { data, error } = await supabaseAdmin.rpc('execute_search_query', {
        query_text: searchQuery,
        query_params: queryParams
      }).then(result => {
        // If custom function doesn't exist, fall back to simple search
        if (result.error) {
          return supabaseAdmin
            .from('knowledge_base')
            .select('*')
            .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.cs.{${searchTerms.join(',')}}`)
            .limit(limit);
        }
        return result;
      });

      if (error) {
        // Fallback to simple search if advanced search fails
        const fallbackResult = await supabaseAdmin
          .from('knowledge_base')
          .select('*')
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .limit(limit);
        
        if (fallbackResult.error) {
          throw new Error(`Failed to search knowledge base: ${fallbackResult.error.message}`);
        }
        
        return fallbackResult.data || [];
      }

      // Filter out low-relevance results if we have a relevance score
      const results = (data || []).filter((entry: any) => 
        !entry.relevance_score || entry.relevance_score > 5
      );

      await boltLogger.info('Knowledge base search performed', {
        query,
        results_count: results.length,
        search_terms: searchTerms,
      }, {
        tenantId,
      });

      return results;
    } catch (error) {
      await boltLogger.error('Failed to search knowledge base', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
      }, {
        tenantId,
      });
      return [];
    }
  }

  async analyzeUserIntent(message: string, tenantId: string): Promise<{
    intent: 'stripe_help' | 'workflow_guidance' | 'tutorial_request' | 'general_question';
    entities: Record<string, string>;
    confidence: number;
  }> {
    try {
      const prompt = `Analyze the following user message and determine the intent and extract relevant entities:

Message: "${message}"

Classify the intent as one of:
- stripe_help: Questions about Stripe API, payments, subscriptions
- workflow_guidance: Requests for SaaS workflow or process guidance
- tutorial_request: Asking for tutorials or step-by-step guides
- general_question: General questions or conversations

Extract entities like:
- stripe_object: customer, subscription, payment_intent, etc.
- action: create, update, delete, retrieve, etc.
- topic: specific topics mentioned

Respond with JSON format:
{
  "intent": "intent_type",
  "entities": {},
  "confidence": 0.0-1.0
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const analysis = JSON.parse(response);
      return analysis;
    } catch (error) {
      await boltLogger.error('Failed to analyze user intent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        message,
      }, {
        tenantId,
      });

      // Return default analysis
      return {
        intent: 'general_question',
        entities: {},
        confidence: 0.5,
      };
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      await boltLogger.error('Failed to generate embedding', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

export const aiService = AIService.getInstance();