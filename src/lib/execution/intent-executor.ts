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
    const { stripe_object, action, topic } = entities;
    const actions_taken: string[] = [];

    // Provide contextual recommendations based on the specific request
    if (stripe_object && action) {
      const actionKey = `${action}_${stripe_object}`;
      
      switch (actionKey) {
        case 'create_customer':
          actions_taken.push('Provided customer creation guidance with best practices');
          return {
            success: true,
            message: this.getCustomerCreationGuidance(),
            actions_taken,
            data: {
              next_steps: ['setup_payment_method', 'create_subscription'],
              security_notes: ['Always validate email addresses', 'Use metadata for internal references'],
              common_pitfalls: ['Not storing customer ID', 'Missing email validation']
            }
          };

        case 'create_subscription':
          actions_taken.push('Provided subscription creation guidance with recommendations');
          return {
            success: true,
            message: this.getSubscriptionCreationGuidance(),
            actions_taken,
            data: {
              next_steps: ['handle_payment_confirmation', 'setup_webhooks'],
              warnings: ['Always use payment_behavior: default_incomplete', 'Handle SCA requirements'],
              testing_tips: ['Use test cards', 'Test failed payments', 'Verify webhook handling']
            }
          };

        case 'handle_webhooks':
          actions_taken.push('Provided webhook handling guidance');
          return {
            success: true,
            message: this.getWebhookGuidance(),
            actions_taken,
            data: {
              critical_events: ['invoice.payment_succeeded', 'invoice.payment_failed', 'customer.subscription.updated'],
              security_requirements: ['Verify webhook signatures', 'Use HTTPS endpoints', 'Return 200 status'],
              common_issues: ['Timeout handling', 'Idempotency', 'Event order dependencies']
            }
          };

        case 'retrieve_customer':
          if (context.stripeContext?.customer_id) {
            try {
              const customer = await stripeHelper.getCustomer(
                context.stripeContext.customer_id,
                context.tenantId
              );
              actions_taken.push('Retrieved customer information successfully');
              return {
                success: true,
                data: {
                  customer,
                  recommendations: this.getCustomerRecommendations(customer),
                  available_actions: ['update_customer', 'create_subscription', 'add_payment_method']
                },
                message: 'I found the customer information. Here are the details and some recommendations based on their current state.',
                actions_taken,
              };
            } catch (error) {
              actions_taken.push('Failed to retrieve customer information');
              return {
                success: false,
                error: 'Failed to retrieve customer information. Please verify the customer ID and try again.',
                actions_taken,
                data: {
                  troubleshooting_steps: [
                    'Verify customer ID format',
                    'Check API key permissions',
                    'Ensure customer exists in your account'
                  ]
                }
              };
            }
          } else {
            return {
              success: true,
              message: 'To retrieve customer information, I\'ll need the customer ID. Once you provide it, I can show you their details and suggest relevant actions.',
              actions_taken: ['Requested customer ID for retrieval'],
              data: {
                required_info: 'customer_id',
                help_text: 'Customer IDs start with "cus_" followed by alphanumeric characters'
              }
            };
          }

        case 'update_subscription':
          actions_taken.push('Provided subscription update guidance');
          return {
            success: true,
            message: this.getSubscriptionUpdateGuidance(),
            actions_taken,
            data: {
              update_types: ['plan_change', 'quantity_change', 'pause_resume', 'cancel'],
              proration_handling: 'Consider when to prorate charges vs. apply at period end',
              important_notes: ['Always handle payment confirmation', 'Update user permissions immediately']
            }
          };

        default:
          actions_taken.push(`Provided general guidance for ${action}ing ${stripe_object}`);
          return {
            success: true,
            message: `I can help you with ${action}ing ${stripe_object}s in Stripe. This operation typically involves specific API calls and best practices. What specific aspect would you like guidance on?`,
            actions_taken,
            data: {
              suggested_topics: ['implementation_steps', 'error_handling', 'testing_approach', 'security_considerations']
            }
          };
      }
    }

    // Handle topic-based requests
    if (topic) {
      actions_taken.push(`Provided guidance on ${topic}`);
      return this.getTopicGuidance(topic, actions_taken);
    }

    return {
      success: true,
      message: 'I\'m here to help with Stripe integration! I can assist with customers, subscriptions, payments, webhooks, and more. What specific Stripe functionality are you working with?',
      actions_taken: ['Offered general Stripe assistance'],
      data: {
        available_areas: ['customers', 'subscriptions', 'payments', 'webhooks', 'connect', 'billing'],
        common_workflows: ['customer_onboarding', 'subscription_management', 'payment_recovery']
      }
    };
  }

  private getCustomerCreationGuidance(): string {
    return `Here's how to create a Stripe customer with best practices:

\`\`\`javascript
const customer = await stripe.customers.create({
  email: 'customer@example.com', // Required for identification
  name: 'Customer Name',
  metadata: {
    user_id: 'internal_user_id', // Link to your system
    tenant_id: 'tenant_123',     // For multi-tenant apps
    source: 'web_signup'         // Track acquisition
  },
  // Optional: Add payment method or setup intent
  payment_method: paymentMethodId,
  invoice_settings: {
    default_payment_method: paymentMethodId
  }
});

// Store the customer ID in your database
await db.users.update(userId, {
  stripe_customer_id: customer.id
});
\`\`\`

**Key Best Practices:**
- Always include email for customer identification
- Use metadata to link customers to your internal system
- Store the customer ID immediately after creation
- Consider adding default payment methods during creation`;
  }

  private getSubscriptionCreationGuidance(): string {
    return `Here's the recommended approach for creating subscriptions:

\`\`\`javascript
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  payment_behavior: 'default_incomplete', // Recommended
  payment_settings: { 
    save_default_payment_method: 'on_subscription' 
  },
  expand: ['latest_invoice.payment_intent'], // Get client_secret
  // Optional: Add trial or proration settings
  trial_period_days: 14,
  proration_behavior: 'create_prorations'
});

// Handle the response based on status
if (subscription.status === 'incomplete') {
  // Requires payment confirmation on frontend
  const clientSecret = subscription.latest_invoice.payment_intent.client_secret;
  // Send clientSecret to frontend for confirmation
}
\`\`\`

**Critical Considerations:**
- Use \`payment_behavior: 'default_incomplete'\` for better UX
- Always expand the payment_intent to get client_secret
- Handle Strong Customer Authentication (SCA) requirements
- Set up proper webhook handling for status updates`;
  }

  private getWebhookGuidance(): string {
    return `Essential webhook handling for SaaS applications:

\`\`\`javascript
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log('Webhook signature verification failed.');
    return res.status(400).send('Webhook Error');
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }

  res.json({received: true});
});
\`\`\`

**Security & Reliability:**
- Always verify webhook signatures
- Use raw body parser for webhook endpoints
- Return 200 status for successful processing
- Implement idempotency for duplicate events
- Handle events within 20-second timeout`;
  }

  private getSubscriptionUpdateGuidance(): string {
    return `Subscription updates require careful handling of prorations and timing:

\`\`\`javascript
// For immediate upgrades (with proration)
const subscription = await stripe.subscriptions.update(subscriptionId, {
  items: [{
    id: subscription.items.data[0].id,
    price: newPriceId,
  }],
  proration_behavior: 'create_prorations'
});

// For downgrades (apply at period end)
const subscription = await stripe.subscriptions.update(subscriptionId, {
  items: [{
    id: subscription.items.data[0].id,
    price: newPriceId,
  }],
  proration_behavior: 'none',
  billing_cycle_anchor: subscription.current_period_end
});
\`\`\`

**Update Strategies:**
- Upgrades: Apply immediately with prorations
- Downgrades: Apply at period end to avoid refunds
- Quantity changes: Handle based on business logic
- Always update user permissions immediately`;
  }

  private getCustomerRecommendations(customer: any): string[] {
    const recommendations = [];
    
    if (!customer.default_source && !customer.invoice_settings?.default_payment_method) {
      recommendations.push('Add a default payment method for smoother transactions');
    }
    
    if (!customer.subscriptions?.data?.length) {
      recommendations.push('Consider creating a subscription for recurring billing');
    }
    
    if (customer.delinquent) {
      recommendations.push('Customer has unpaid invoices - review payment recovery options');
    }
    
    return recommendations;
  }

  private getTopicGuidance(topic: string, actions_taken: string[]): ExecutionResult {
    const topicGuidance = {
      testing: {
        message: `Here's a comprehensive testing strategy for Stripe integration:

**Test Cards:**
- Success: 4242 4242 4242 4242
- Declined: 4000 0000 0000 0002
- SCA Required: 4000 0027 6000 3184

**Testing Checklist:**
- ✅ Successful payments
- ✅ Failed payments and error handling
- ✅ Webhook event processing
- ✅ Subscription lifecycle events
- ✅ Proration calculations
- ✅ Refund and dispute handling

**Test Environment Best Practices:**
- Use Stripe CLI for local webhook testing
- Test with different currencies
- Verify mobile payment flows
- Test async webhook processing`,
        data: {
          test_cards: {
            success: '4242424242424242',
            declined: '4000000000000002',
            sca_required: '4000002760003184'
          }
        }
      },
      security: {
        message: `Security essentials for Stripe integration:

**API Key Management:**
- Use environment variables for keys
- Restrict API key permissions
- Rotate keys regularly
- Never expose secret keys client-side

**Data Protection:**
- Never store card numbers
- Use Stripe Elements/Payment Element
- Implement proper webhook signature verification
- Follow PCI DSS compliance guidelines

**Best Practices:**
- Validate all input data
- Use HTTPS everywhere
- Implement rate limiting
- Log security events`,
        data: {
          security_checklist: [
            'API keys properly configured',
            'Webhook signatures verified',
            'No sensitive data stored',
            'HTTPS enforced',
            'Input validation implemented'
          ]
        }
      }
    };

    const guidance = topicGuidance[topic as keyof typeof topicGuidance];
    if (guidance) {
      return {
        success: true,
        message: guidance.message,
        actions_taken,
        data: guidance.data
      };
    }

    return {
      success: true,
      message: `I can provide guidance on ${topic}. What specific aspect would you like to explore?`,
      actions_taken
    };
  }

  private async handleWorkflowGuidance(
    entities: Record<string, string>,
    context: IntentExecutionParams['context']
  ): Promise<ExecutionResult> {
    const { topic } = entities;
    const actions_taken: string[] = ['Provided comprehensive workflow guidance'];

    if (topic) {
      switch (topic.toLowerCase()) {
        case 'onboarding':
          return {
            success: true,
            message: this.getOnboardingWorkflowGuidance(),
            actions_taken,
            data: {
              workflow_steps: [
                'user_registration',
                'plan_selection',
                'payment_setup',
                'account_activation',
                'feature_introduction'
              ],
              estimated_time: '15-30 minutes',
              success_metrics: ['signup_completion_rate', 'time_to_first_value', 'trial_conversion'],
              common_drop_off_points: ['payment_method_entry', 'plan_selection', 'email_verification']
            }
          };

        case 'multi-tenant':
        case 'multi_tenant':
          return {
            success: true,
            message: this.getMultiTenantGuidance(),
            actions_taken,
            data: {
              architecture_patterns: ['shared_database_shared_schema', 'shared_database_separate_schemas', 'separate_databases'],
              security_considerations: ['row_level_security', 'api_key_scoping', 'data_isolation'],
              scalability_factors: ['connection_pooling', 'caching_strategies', 'database_sharding']
            }
          };

        case 'payment_recovery':
        case 'dunning':
          return {
            success: true,
            message: this.getPaymentRecoveryGuidance(),
            actions_taken,
            data: {
              recovery_stages: ['immediate_retry', 'smart_retries', 'customer_communication', 'account_suspension'],
              best_practices: ['personalized_messaging', 'multiple_payment_methods', 'win_back_offers'],
              automation_tools: ['stripe_smart_retries', 'email_sequences', 'grace_periods']
            }
          };

        case 'subscription_management':
          return {
            success: true,
            message: this.getSubscriptionManagementGuidance(),
            actions_taken,
            data: {
              lifecycle_stages: ['trial', 'active', 'past_due', 'canceled', 'unpaid'],
              management_features: ['plan_changes', 'pause_resume', 'cancellation', 'reactivation'],
              revenue_optimization: ['upgrade_prompts', 'retention_offers', 'usage_analytics']
            }
          };

        case 'webhook_handling':
          return {
            success: true,
            message: this.getWebhookWorkflowGuidance(),
            actions_taken,
            data: {
              critical_events: ['payment_succeeded', 'payment_failed', 'subscription_updated'],
              processing_patterns: ['idempotency', 'retry_logic', 'dead_letter_queues'],
              monitoring_metrics: ['processing_time', 'failure_rate', 'event_volume']
            }
          };

        case 'user_management':
          return {
            success: true,
            message: this.getUserManagementGuidance(),
            actions_taken,
            data: {
              user_roles: ['owner', 'admin', 'member', 'viewer'],
              permission_patterns: ['role_based', 'attribute_based', 'resource_based'],
              onboarding_flows: ['email_invitation', 'self_signup', 'admin_creation']
            }
          };

        case 'analytics':
        case 'reporting':
          return {
            success: true,
            message: this.getAnalyticsGuidance(),
            actions_taken,
            data: {
              key_metrics: ['mrr', 'churn_rate', 'ltv', 'cac', 'arpu'],
              data_sources: ['stripe_data', 'application_events', 'user_behavior'],
              reporting_tools: ['custom_dashboards', 'automated_reports', 'real_time_alerts']
            }
          };

        default:
          return {
            success: true,
            message: `I can help you with ${topic} workflow guidance. Let me provide you with a structured approach to implement this workflow effectively.`,
            actions_taken,
            data: {
              suggested_next_steps: [
                'Define workflow requirements',
                'Map out user journey',
                'Identify integration points',
                'Plan error handling',
                'Set up monitoring'
              ]
            }
          };
      }
    }

    return {
      success: true,
      message: this.getGeneralWorkflowGuidance(),
      actions_taken,
      data: {
        available_workflows: [
          'customer_onboarding',
          'multi_tenant_setup',
          'payment_recovery',
          'subscription_management',
          'user_management',
          'webhook_handling',
          'analytics_setup'
        ],
        workflow_categories: ['onboarding', 'billing', 'user_management', 'analytics', 'security']
      }
    };
  }

  private getOnboardingWorkflowGuidance(): string {
    return `Here's a comprehensive customer onboarding workflow for SaaS:

**Phase 1: Registration & Account Setup**
1. User signs up with email/password or OAuth
2. Email verification (if required)
3. Basic profile completion
4. Company/organization setup (for B2B)

**Phase 2: Plan Selection & Billing**
1. Display pricing tiers with feature comparison
2. Offer trial period without payment method
3. Collect payment information when trial converts
4. Handle failed payments gracefully

**Phase 3: Account Activation**
1. Create Stripe customer record
2. Set up subscription (if not trial)
3. Provision user account and permissions
4. Send welcome email with next steps

**Phase 4: Product Onboarding**
1. Interactive product tour
2. Setup wizards for key features
3. Sample data generation
4. Progress tracking with completion rewards

**Key Success Factors:**
- Minimize friction in early steps
- Progressive information gathering
- Clear value demonstration
- Excellent error handling and recovery`;
  }

  private getMultiTenantGuidance(): string {
    return `Multi-tenant SaaS architecture strategies:

**Data Isolation Approaches:**

**1. Shared Database, Row-Level Security (RLS)**
- Single database with tenant_id filtering
- PostgreSQL RLS policies for automatic filtering
- Cost-effective but requires careful security design

**2. Schema-per-Tenant**
- Separate schemas within shared database
- Better isolation, moderate complexity
- Good balance of security and cost

**3. Database-per-Tenant**
- Complete isolation per tenant
- Highest security, highest operational complexity
- Best for enterprise/compliance requirements

**Stripe Integration Patterns:**
- Single Stripe account with metadata filtering
- Stripe Connect for separate merchant accounts
- Hybrid approach based on tenant tier

**Security Considerations:**
- Always validate tenant context in API calls
- Use middleware for automatic tenant scoping
- Implement proper RBAC within tenants
- Regular security audits and testing`;
  }

  private getPaymentRecoveryGuidance(): string {
    return `Effective payment recovery (dunning) workflow:

**Immediate Response (Day 0)**
- Send payment failed notification
- Provide easy payment update link
- Maintain full service access temporarily

**Smart Retry Strategy (Days 1-3)**
- Automatic retry based on decline reason
- Different schedules for different decline types
- Update customer about retry attempts

**Customer Engagement (Days 3-7)**
- Personalized email campaigns
- Multiple payment method options
- Live chat or phone support offer

**Grace Period Management (Days 7-14)**
- Limited service access warnings
- Compelling retention offers
- Easy reactivation process

**Account Management (Days 14+)**
- Service suspension with data retention
- Final win-back campaigns
- Clear reactivation terms

**Best Practices:**
- Personalize messaging based on customer value
- Test different message tones and timing
- Provide multiple recovery paths
- Track and optimize recovery rates`;
  }

  private getSubscriptionManagementGuidance(): string {
    return `Complete subscription lifecycle management:

**Subscription States & Transitions:**
- Trial → Incomplete → Active → Past Due → Canceled
- Handle each transition with appropriate UX

**Plan Change Management:**
- Immediate upgrades with prorations
- Downgrades at period end
- Usage-based billing adjustments
- Grandfathered plan handling

**Customer Self-Service Features:**
- Plan comparison and switching
- Billing history and invoices
- Payment method management
- Pause/resume subscriptions

**Revenue Optimization:**
- Upgrade prompts based on usage
- Retention offers for cancellations
- Win-back campaigns for churned users
- Usage analytics and alerts

**Operational Excellence:**
- Automated dunning management
- Revenue recognition compliance
- Tax calculation and remittance
- Subscription analytics and reporting`;
  }

  private getWebhookWorkflowGuidance(): string {
    return `Robust webhook processing workflow:

**Event Processing Pipeline:**
1. Signature verification
2. Event deduplication (idempotency)
3. Event routing to handlers
4. Asynchronous processing
5. Retry logic for failures
6. Dead letter queue for unprocessable events

**Critical Events to Handle:**
- customer.subscription.* (all lifecycle events)
- invoice.payment_succeeded/failed
- payment_method.attached/detached
- customer.updated

**Processing Best Practices:**
- Return 200 immediately, process async
- Implement exponential backoff retries
- Use idempotency keys to prevent duplicates
- Log all events for debugging
- Monitor processing latency and failures

**Error Handling:**
- Graceful degradation for non-critical events
- Manual review queue for complex failures
- Automatic alerts for processing issues
- Regular webhook health monitoring`;
  }

  private getUserManagementGuidance(): string {
    return `Comprehensive user management workflow:

**User Roles & Permissions:**
- Owner: Full account access
- Admin: User management, billing (limited)
- Member: Standard feature access
- Viewer: Read-only access

**Invitation Workflow:**
1. Admin sends invitation with role
2. Email invitation with secure token
3. New user accepts and creates account
4. Automatic role assignment and access

**Permission Management:**
- Resource-based permissions
- Feature flags for gradual rollouts
- Audit logs for permission changes
- Regular access reviews

**User Lifecycle:**
- Onboarding checklist completion
- Activity monitoring and engagement
- Offboarding and data retention
- Account transfer capabilities`;
  }

  private getAnalyticsGuidance(): string {
    return `SaaS analytics and reporting strategy:

**Key Metrics to Track:**
- MRR (Monthly Recurring Revenue)
- Customer Churn Rate
- Customer Lifetime Value (LTV)
- Customer Acquisition Cost (CAC)
- Average Revenue Per User (ARPU)

**Data Collection Strategy:**
- Event tracking for user actions
- Integration with Stripe for revenue data
- Custom metrics for business-specific KPIs
- Real-time and batch processing

**Reporting Infrastructure:**
- Executive dashboards for high-level metrics
- Operational reports for daily management
- Customer health scores and alerts
- Automated anomaly detection

**Implementation Approach:**
1. Define metrics and success criteria
2. Set up data collection infrastructure
3. Build dashboards and reports
4. Establish review and action processes`;
  }

  private getGeneralWorkflowGuidance(): string {
    return `I can provide detailed guidance on various SaaS workflows including:

**Customer Experience Workflows:**
- Customer onboarding and activation
- User management and permissions
- Support and success processes

**Business Operations:**
- Subscription and billing management
- Payment recovery and dunning
- Analytics and reporting

**Technical Implementation:**
- Multi-tenant architecture
- Webhook processing
- API design and security
- Performance optimization

**Growth & Optimization:**
- A/B testing frameworks
- Feature rollout strategies
- Customer feedback loops
- Retention and expansion

What specific workflow would you like to explore in detail?`;
  }

  private async handleTutorialRequest(
    entities: Record<string, string>,
    context: IntentExecutionParams['context']
  ): Promise<ExecutionResult> {
    const { topic, difficulty, step } = entities;
    const actions_taken: string[] = ['Provided tutorial guidance'];

    // If user is asking for a specific step in an ongoing tutorial
    if (step && context.sessionId) {
      return await this.handleTutorialStep(step, context);
    }

    if (topic) {
      const tutorialInfo = this.getTutorialInfo(topic.toLowerCase());
      if (tutorialInfo) {
        actions_taken.push(`Provided ${topic} tutorial information`);
        return {
          success: true,
          message: tutorialInfo.description,
          actions_taken,
          data: {
            tutorial: tutorialInfo,
            available_formats: ['step_by_step', 'code_examples', 'video_walkthrough'],
            next_action: 'Would you like me to start the step-by-step tutorial?'
          }
        };
      }
    }

    return {
      success: true,
      message: this.getAvailableTutorials(),
      actions_taken,
      data: {
        tutorial_categories: [
          { name: 'Getting Started', topics: ['saas_foundation', 'stripe_setup', 'database_design'] },
          { name: 'Core Features', topics: ['subscriptions', 'user_management', 'multi_tenant'] },
          { name: 'Advanced Topics', topics: ['webhooks', 'analytics', 'performance'] },
          { name: 'Best Practices', topics: ['security', 'testing', 'deployment'] }
        ],
        difficulty_levels: ['beginner', 'intermediate', 'advanced'],
        formats: ['interactive', 'code_walkthrough', 'conceptual']
      }
    };
  }

  private async handleTutorialStep(step: string, context: IntentExecutionParams['context']): Promise<ExecutionResult> {
    // This would integrate with a tutorial state management system
    // For now, provide general step guidance
    return {
      success: true,
      message: `Let me help you with step ${step} of your tutorial. What specific aspect of this step are you working on?`,
      actions_taken: [`Provided guidance for tutorial step ${step}`],
      data: {
        current_step: step,
        available_actions: ['get_code_example', 'explain_concept', 'troubleshoot_issue', 'next_step']
      }
    };
  }

  private getTutorialInfo(topic: string): any {
    const tutorials: Record<string, any> = {
      'stripe_setup': {
        title: 'Complete Stripe Integration Setup',
        description: `I'll walk you through setting up Stripe integration from scratch:

**What You'll Learn:**
- Stripe account configuration
- API key management
- Basic payment processing
- Webhook setup and handling
- Testing with test data

**Prerequisites:** 
- Node.js development environment
- Basic understanding of APIs
- Stripe account (free)

**Estimated Time:** 2-3 hours

The tutorial covers everything from initial setup to processing your first payment, with plenty of code examples and best practices along the way.`,
        difficulty: 'beginner',
        estimated_time: '2-3 hours',
        steps: 8
      },
      'subscription_management': {
        title: 'Building SaaS Subscription Management',
        description: `Learn to build a complete subscription management system:

**What You'll Build:**
- Customer onboarding flow
- Plan selection and pricing
- Subscription creation and management
- Payment method handling
- Billing portal integration

**Key Features:**
- Trial periods and conversions
- Plan upgrades and downgrades  
- Proration handling
- Customer self-service portal

**Prerequisites:**
- Basic Stripe integration completed
- Database setup (PostgreSQL recommended)
- Authentication system in place

**Estimated Time:** 4-6 hours`,
        difficulty: 'intermediate',
        estimated_time: '4-6 hours',
        steps: 12
      },
      'multi_tenant': {
        title: 'Multi-Tenant SaaS Architecture',
        description: `Build a scalable multi-tenant SaaS application:

**Architecture Patterns:**
- Data isolation strategies
- Tenant context management
- Permission and role systems
- Stripe integration patterns

**Advanced Topics:**
- Database schema design
- Performance optimization
- Security considerations
- Scaling strategies

**Prerequisites:**
- Solid understanding of databases
- Experience with authentication
- Basic SaaS app structure

**Estimated Time:** 6-8 hours`,
        difficulty: 'advanced',
        estimated_time: '6-8 hours',
        steps: 15
      },
      'webhook_handling': {
        title: 'Robust Webhook Processing',
        description: `Master webhook handling for reliable payment processing:

**Core Concepts:**
- Event types and processing
- Signature verification
- Idempotency and deduplication
- Error handling and retries

**Production Readiness:**
- Monitoring and alerting
- Performance optimization
- Testing strategies
- Debugging techniques

**Prerequisites:**
- Basic Stripe integration
- Understanding of async processing
- Node.js/Express experience

**Estimated Time:** 3-4 hours`,
        difficulty: 'intermediate',
        estimated_time: '3-4 hours',
        steps: 10
      }
    };

    return tutorials[topic] || null;
  }

  private getAvailableTutorials(): string {
    return `I have comprehensive tutorials available for various SaaS development topics:

**🚀 Getting Started Tutorials:**
- **Stripe Setup**: Complete integration from scratch (Beginner, 2-3h)
- **SaaS Foundation**: Project structure and basic architecture (Beginner, 3-4h)
- **Database Design**: Multi-tenant schema patterns (Intermediate, 2-3h)

**💰 Billing & Subscriptions:**
- **Subscription Management**: Full lifecycle handling (Intermediate, 4-6h)
- **Payment Recovery**: Dunning and retry strategies (Intermediate, 2-3h)
- **Usage Billing**: Metered and consumption-based pricing (Advanced, 4-5h)

**🏗️ Architecture & Scaling:**
- **Multi-Tenant Setup**: Complete architecture guide (Advanced, 6-8h)
- **Performance Optimization**: Database and API scaling (Advanced, 4-5h)
- **Security Best Practices**: Authentication and data protection (Intermediate, 3-4h)

**🔧 Advanced Topics:**
- **Webhook Handling**: Robust event processing (Intermediate, 3-4h)
- **Analytics Setup**: Metrics and reporting (Intermediate, 3-4h)
- **Testing Strategies**: Automated testing for SaaS (Advanced, 4-5h)

**Tutorial Formats:**
- 📖 **Step-by-step**: Detailed instructions with code
- 🎯 **Interactive**: Hands-on guided practice
- 📹 **Conceptual**: Theory and best practices

Which tutorial interests you most? I can provide detailed step-by-step guidance, code examples, and answer questions as we go through it together.`;
  }
}

export const intentExecutor = IntentExecutor.getInstance();