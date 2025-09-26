import { stripeHelper } from '../stripe/client';
import { boltLogger } from '../logging/logger';
import { StripeContext } from '@/types';

export interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  actions_taken?: string[];
}

export interface IntentExecutionParams {
  intent: string;
  entities: Record<string, string>;
  context: {
    tenantId: string;
    userId: string;
    sessionId: string;
    stripeContext?: StripeContext;
  };
}

export class IntentExecutor {
  private static instance: IntentExecutor;

  private constructor() {}

  public static getInstance(): IntentExecutor {
    if (!IntentExecutor.instance) {
      IntentExecutor.instance = new IntentExecutor();
    }
    return IntentExecutor.instance;
  }

  async executeIntent(params: IntentExecutionParams): Promise<ExecutionResult> {
    const { intent, entities, context } = params;

    try {
      switch (intent) {
        case 'stripe_help':
          return await this.handleStripeHelp(entities, context);
        case 'workflow_guidance':
          return await this.handleWorkflowGuidance(entities, context);
        case 'tutorial_request':
          return await this.handleTutorialRequest(entities, context);
        default:
          return {
            success: true,
            message: 'I understand your question. Let me help you with that.',
          };
      }
    } catch (error) {
      await boltLogger.error('Failed to execute intent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        intent,
        entities,
      }, context);

      return {
        success: false,
        error: 'I encountered an error while processing your request. Please try again.',
      };
    }
  }

  private async handleStripeHelp(
    entities: Record<string, string>,
    context: IntentExecutionParams['context']
  ): Promise<ExecutionResult> {
    const { stripe_object, action } = entities;
    const actions_taken: string[] = [];

    if (stripe_object && action) {
      switch (`${action}_${stripe_object}`) {
        case 'create_customer':
          // In a real implementation, you might extract customer details from entities
          actions_taken.push('Provided customer creation guidance');
          return {
            success: true,
            message: 'I can help you create a Stripe customer. You\'ll need the customer\'s email address and optionally their name. Would you like me to show you the code example?',
            actions_taken,
          };

        case 'create_subscription':
          actions_taken.push('Provided subscription creation guidance');
          return {
            success: true,
            message: 'To create a subscription, you\'ll need a customer ID and a price ID. I can walk you through the process step by step. Do you have these details ready?',
            actions_taken,
          };

        case 'retrieve_customer':
          if (context.stripeContext?.customer_id) {
            try {
              const customer = await stripeHelper.getCustomer(
                context.stripeContext.customer_id,
                context.tenantId
              );
              actions_taken.push('Retrieved customer information');
              return {
                success: true,
                data: customer,
                message: 'I found the customer information. Here are the details.',
                actions_taken,
              };
            } catch (error) {
              return {
                success: false,
                error: 'Failed to retrieve customer information.',
              };
            }
          } else {
            return {
              success: true,
              message: 'To retrieve customer information, I\'ll need the customer ID. Do you have it available?',
            };
          }

        default:
          return {
            success: true,
            message: `I can help you with ${action}ing ${stripe_object}s in Stripe. What specific information do you need?`,
          };
      }
    }

    return {
      success: true,
      message: 'I\'m here to help with Stripe integration. What specific Stripe functionality are you working with?',
    };
  }

  private async handleWorkflowGuidance(
    entities: Record<string, string>,
    context: IntentExecutionParams['context']
  ): Promise<ExecutionResult> {
    const { topic } = entities;
    const actions_taken: string[] = ['Provided workflow guidance'];

    if (topic) {
      switch (topic.toLowerCase()) {
        case 'onboarding':
          return {
            success: true,
            message: 'I can guide you through setting up a customer onboarding flow with Stripe. This typically involves: 1) Customer registration, 2) Payment method setup, 3) Subscription creation, 4) Welcome email. Which part would you like to focus on?',
            actions_taken,
          };

        case 'multi-tenant':
          return {
            success: true,
            message: 'For multi-tenant Stripe integration, you\'ll want to use metadata to isolate customer data by tenant, implement proper access controls, and consider using Stripe Connect for separate accounts. Would you like specific implementation details?',
            actions_taken,
          };

        default:
          return {
            success: true,
            message: `I can help you with ${topic} workflow guidance. What specific aspect would you like to explore?`,
            actions_taken,
          };
      }
    }

    return {
      success: true,
      message: 'I can provide guidance on SaaS workflows including onboarding, payment processing, subscription management, and more. What workflow are you working on?',
      actions_taken,
    };
  }

  private async handleTutorialRequest(
    entities: Record<string, string>,
    context: IntentExecutionParams['context']
  ): Promise<ExecutionResult> {
    const { topic } = entities;
    const actions_taken: string[] = ['Provided tutorial information'];

    return {
      success: true,
      message: topic 
        ? `I can provide a step-by-step tutorial for ${topic}. Would you like me to walk you through it?`
        : 'I have tutorials available for various Stripe integration topics. What would you like to learn about?',
      actions_taken,
    };
  }
}

export const intentExecutor = IntentExecutor.getInstance();