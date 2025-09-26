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
    return `You are Bolt, an AI assistant specialized in helping SaaS creators with Stripe integration and platform workflows. You have comprehensive knowledge of Stripe APIs, payment processing, subscription management, and SaaS best practices.

Key capabilities:
- Stripe API guidance and implementation help
- Payment flow setup and troubleshooting
- Subscription management assistance
- Multi-tenant SaaS architecture advice
- Security best practices for payment processing
- Webhook configuration and handling
- Platform onboarding guidance

Guidelines:
1. Always prioritize security when handling payment information
2. Provide clear, actionable guidance with code examples when helpful
3. Reference official Stripe documentation when applicable
4. Consider multi-tenant implications in your responses
5. Suggest testing approaches for payment flows
6. Be aware of PCI compliance requirements

Current tenant features enabled: ${JSON.stringify(config.enabled_features)}

Always respond in a helpful, professional manner and ask clarifying questions when needed to provide the most relevant assistance.`;
  }

  async generateResponse(
    messages: ChatMessage[],
    config: ChatbotConfig,
    context?: {
      knowledgeBase?: KnowledgeBaseEntry[];
      stripeContext?: any;
      workflowContext?: any;
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
        const knowledgeContext = context.knowledgeBase
          .map(entry => `${entry.title}: ${entry.content}`)
          .join('\n\n');
        
        conversationMessages.push({
          role: 'system',
          content: `Relevant knowledge base entries:\n${knowledgeContext}`,
        });
      }

      // Add Stripe context if available
      if (context?.stripeContext) {
        conversationMessages.push({
          role: 'system',
          content: `Current Stripe context: ${JSON.stringify(context.stripeContext)}`,
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

  async searchKnowledgeBase(
    query: string,
    tenantId: string,
    limit: number = 5
  ): Promise<KnowledgeBaseEntry[]> {
    try {
      // Simple text search - in production, you might want to use vector embeddings
      const { data, error } = await supabaseAdmin
        .from('knowledge_base')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.cs.{${query}}`)
        .limit(limit);

      if (error) {
        throw new Error(`Failed to search knowledge base: ${error.message}`);
      }

      return data || [];
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