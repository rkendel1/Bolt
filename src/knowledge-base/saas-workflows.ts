import { KnowledgeBaseEntry } from '@/types';

export const saasWorkflowKnowledge: Omit<KnowledgeBaseEntry, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    type: 'workflow',
    title: 'Complete SaaS Onboarding Workflow',
    content: `**Complete Customer Onboarding Process for SaaS**

**Phase 1: User Registration & Account Creation**
1. Collect essential information (email, name, company)
2. Email verification process
3. Create user account in your database
4. Send welcome email with next steps

**Phase 2: Plan Selection & Pricing**
1. Display pricing tiers with clear feature comparison
2. Highlight recommended plans based on company size
3. Allow trial periods without requiring payment method
4. Store plan selection for later subscription creation

**Phase 3: Stripe Integration Setup**
\`\`\`javascript
// Create Stripe customer
const customer = await stripe.customers.create({
  email: user.email,
  name: user.name,
  metadata: {
    user_id: user.id,
    tenant_id: tenant.id,
    plan_selected: selectedPlan.id
  }
});
\`\`\`

**Phase 4: Payment Setup (if not trial)**
1. Use Stripe Elements for secure card collection
2. Create setup intent for future payments
3. Confirm setup intent before subscription
4. Handle 3D Secure authentication

**Phase 5: Subscription Creation**
\`\`\`javascript
const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: selectedPlan.stripe_price_id }],
  trial_period_days: selectedPlan.trial_days || 0,
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent']
});
\`\`\`

**Phase 6: Account Activation**
1. Update user status to 'active'
2. Grant access to selected features
3. Send subscription confirmation email
4. Redirect to dashboard

**Phase 7: Feature Onboarding**
1. Interactive product tour
2. Setup wizards for key features
3. Sample data generation
4. Progress tracking and completion rewards

**Common Pitfalls to Avoid:**
- Don't require payment for trials
- Always validate plan limits before feature access
- Handle failed payments gracefully
- Provide clear cancellation process`,
    tags: ['onboarding', 'saas', 'workflow', 'stripe', 'best-practices'],
    category: 'workflows',
    metadata: {
      complexity: 'medium',
      estimated_time: '2-4 hours',
      prerequisites: ['stripe-setup', 'database-schema']
    }
  },
  {
    type: 'workflow',
    title: 'Multi-Tenant Architecture Best Practices',
    content: `**Multi-Tenant SaaS Architecture Guidelines**

**Data Isolation Strategies:**

**1. Shared Database, Shared Schema (Row-Level Security)**
\`\`\`sql
-- Enable RLS on all tenant-specific tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies to isolate data by tenant
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id'));
\`\`\`

**2. Shared Database, Separate Schemas**
\`\`\`javascript
// Dynamic schema selection
const schema = \`tenant_\${tenantId}\`;
await db.raw(\`SET search_path TO \${schema}\`);
\`\`\`

**3. Separate Databases per Tenant**
\`\`\`javascript
// Connection pooling by tenant
const getDbConnection = (tenantId) => {
  return connectionPool[\`tenant_\${tenantId}\`] || createConnection(tenantId);
};
\`\`\`

**Stripe Integration for Multi-Tenancy:**

**Option 1: Single Stripe Account with Metadata**
\`\`\`javascript
const customer = await stripe.customers.create({
  email: user.email,
  metadata: {
    tenant_id: tenant.id,
    user_id: user.id
  }
});

// Always filter by tenant when retrieving
const customers = await stripe.customers.list({
  limit: 100,
  metadata: { tenant_id: tenantId }
});
\`\`\`

**Option 2: Stripe Connect for Separate Accounts**
\`\`\`javascript
// Create connected account per tenant
const account = await stripe.accounts.create({
  type: 'standard',
  country: 'US',
  email: tenant.admin_email
});

// Use connected account for all operations
const customer = await stripe.customers.create({
  email: user.email
}, {
  stripeAccount: tenant.stripe_account_id
});
\`\`\`

**Security Considerations:**
- Always validate tenant access in middleware
- Use JWT tokens with tenant claims
- Implement rate limiting per tenant
- Audit all cross-tenant operations
- Encrypt sensitive tenant data

**Scalability Patterns:**
- Implement connection pooling
- Use caching with tenant-aware keys
- Consider read replicas for analytics
- Plan for tenant migration strategies`,
    tags: ['multi-tenant', 'architecture', 'security', 'scalability', 'stripe-connect'],
    category: 'architecture',
    metadata: {
      complexity: 'high',
      security_level: 'critical'
    }
  },
  {
    type: 'workflow',
    title: 'Payment Recovery and Dunning Management',
    content: `**Failed Payment Recovery Workflow**

**Immediate Response (webhook: invoice.payment_failed)**
\`\`\`javascript
const handleFailedPayment = async (invoice) => {
  const customer = await stripe.customers.retrieve(invoice.customer);
  
  // 1. Update user status
  await updateUserStatus(customer.metadata.user_id, 'payment_failed');
  
  // 2. Send immediate notification
  await sendPaymentFailedEmail(customer.email, {
    amount: invoice.amount_due,
    retry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
  });
  
  // 3. Schedule retry attempts
  await schedulePaymentRetry(invoice.id, 3); // 3 days later
};
\`\`\`

**Dunning Campaign Stages:**

**Day 0: Immediate (Payment Failed)**
- Send "Payment Failed" email
- Show payment update banner in app
- Allow immediate retry with new payment method

**Day 3: First Reminder**
\`\`\`javascript
const firstReminder = {
  subject: "Action Required: Update Your Payment Method",
  tone: "helpful",
  actions: ["update_payment", "contact_support"],
  app_restrictions: "none" // Full access maintained
};
\`\`\`

**Day 7: Second Reminder**
\`\`\`javascript
const secondReminder = {
  subject: "Payment Issue - Service at Risk",
  tone: "urgent_but_helpful",
  actions: ["update_payment", "downgrade_plan", "contact_support"],
  app_restrictions: "warning_banner" // Show persistent warning
};
\`\`\`

**Day 14: Final Notice**
\`\`\`javascript
const finalNotice = {
  subject: "Final Notice - Account Will Be Suspended",
  tone: "urgent",
  actions: ["update_payment", "export_data", "contact_support"],
  app_restrictions: "limited_access" // Read-only access
};
\`\`\`

**Day 21: Account Suspension**
\`\`\`javascript
const suspension = {
  status: "suspended",
  access_level: "none",
  data_retention_days: 30,
  reactivation_allowed: true
};
\`\`\`

**Smart Recovery Features:**

**1. Payment Method Health Check**
\`\`\`javascript
const checkPaymentMethodHealth = async (customerId) => {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card'
  });
  
  return paymentMethods.data.map(pm => ({
    id: pm.id,
    expires_soon: isExpiringSoon(pm.card.exp_month, pm.card.exp_year),
    needs_update: pm.card.exp_year < currentYear
  }));
};
\`\`\`

**2. Intelligent Retry Logic**
\`\`\`javascript
const smartRetry = {
  declined_insufficient_funds: { retry_in_days: 7, max_attempts: 3 },
  declined_expired_card: { retry_in_days: 1, max_attempts: 1 },
  declined_generic: { retry_in_days: 3, max_attempts: 2 }
};
\`\`\`

**3. Win-Back Offers**
- Temporary discount for payment update
- Extended trial for loyal customers
- Plan downgrade options

**Compliance & Best Practices:**
- Always provide clear cancellation options
- Maintain data export capabilities
- Follow local regulations (GDPR, etc.)
- Keep detailed audit logs
- Offer human support escalation`,
    tags: ['payments', 'dunning', 'recovery', 'retention', 'automation'],
    category: 'payments',
    metadata: {
      automation_level: 'high',
      customer_impact: 'high'
    }
  },
  {
    type: 'tutorial',
    title: 'Setting Up Usage-Based Billing',
    content: `**Complete Guide to Usage-Based Billing with Stripe**

**Step 1: Define Your Usage Metrics**

Common SaaS usage metrics:
- API Calls (per 1000 requests)
- Storage (per GB)
- Users/Seats (per active user)
- Compute Time (per hour)
- Transactions (per transaction)

**Step 2: Create Stripe Products and Prices**

\`\`\`javascript
// Create base product
const product = await stripe.products.create({
  name: 'API Access',
  description: 'API calls for your SaaS platform'
});

// Create usage-based price
const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 50, // $0.50 per unit
  currency: 'usd',
  recurring: {
    interval: 'month',
    usage_type: 'metered',
    aggregate_usage: 'sum'
  },
  billing_scheme: 'per_unit'
});
\`\`\`

**Step 3: Set Up Subscription with Usage Items**

\`\`\`javascript
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{
    price: usageBasedPriceId,
    // No quantity needed for metered usage
  }],
  // Optional: Add base fee
  items: [{
    price: baseFeePrice,
    quantity: 1
  }]
});
\`\`\`

**Step 4: Track and Report Usage**

\`\`\`javascript
// Report usage periodically (recommended: real-time or hourly)
const reportUsage = async (subscriptionItemId, quantity, timestamp) => {
  await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity: quantity,
    timestamp: timestamp || Math.floor(Date.now() / 1000),
    action: 'increment' // or 'set' for absolute values
  });
};

// Example: Report API usage
app.post('/api/endpoint', async (req, res) => {
  // Your API logic here...
  
  // Track usage
  await reportUsage(
    user.subscription.stripe_item_id,
    1, // 1 API call
    Math.floor(Date.now() / 1000)
  );
  
  res.json({ success: true });
});
\`\`\`

**Step 5: Handle Usage Aggregation**

\`\`\`javascript
// Batch reporting for efficiency
const batchReportUsage = async (usageEvents) => {
  const promises = usageEvents.map(event => 
    stripe.subscriptionItems.createUsageRecord(event.item_id, {
      quantity: event.quantity,
      timestamp: event.timestamp,
      action: 'increment'
    })
  );
  
  await Promise.all(promises);
};

// Report every hour
setInterval(async () => {
  const pendingUsage = await getPendingUsageEvents();
  await batchReportUsage(pendingUsage);
}, 60 * 60 * 1000);
\`\`\`

**Step 6: Implement Usage Limits and Overage Handling**

\`\`\`javascript
const checkUsageLimit = async (userId, requestedUsage) => {
  const user = await getUser(userId);
  const currentUsage = await getCurrentMonthUsage(userId);
  const usageLimit = user.plan.usage_limit;
  
  if (currentUsage + requestedUsage > usageLimit) {
    // Handle overage
    if (user.plan.allow_overage) {
      // Allow with overage charges
      return { allowed: true, overage: true };
    } else {
      // Block request
      return { allowed: false, reason: 'usage_limit_exceeded' };
    }
  }
  
  return { allowed: true, overage: false };
};
\`\`\`

**Step 7: Usage Analytics and Reporting**

\`\`\`javascript
// Get usage summary for customer dashboard
const getUsageSummary = async (subscriptionId) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  const usageRecords = await stripe.subscriptionItems.listUsageRecordSummaries(
    subscription.items.data[0].id,
    {
      limit: 100
    }
  );
  
  return {
    current_period_usage: usageRecords.data[0]?.total_usage || 0,
    period_start: subscription.current_period_start,
    period_end: subscription.current_period_end
  };
};
\`\`\`

**Advanced Patterns:**

**Tiered Usage Pricing:**
\`\`\`javascript
// Create graduated pricing tiers
const tieredPrice = await stripe.prices.create({
  product: product.id,
  currency: 'usd',
  recurring: {
    interval: 'month',
    usage_type: 'metered'
  },
  billing_scheme: 'tiered',
  tiers: [
    { up_to: 1000, unit_amount: 100 }, // First 1000: $1.00 each
    { up_to: 5000, unit_amount: 80 },  // Next 4000: $0.80 each
    { up_to: 'inf', unit_amount: 50 }  // Beyond 5000: $0.50 each
  ],
  tiers_mode: 'graduated'
});
\`\`\`

**Best Practices:**
- Report usage in real-time or near real-time
- Implement usage caching to avoid API limits
- Provide clear usage dashboards to customers
- Set up usage alerts and notifications
- Handle edge cases (refunds, prorations)
- Test thoroughly with Stripe's test clocks`,
    tags: ['usage-billing', 'metered', 'stripe', 'pricing', 'step-by-step'],
    category: 'tutorials',
    metadata: {
      difficulty: 'intermediate',
      implementation_time: '4-8 hours',
      stripe_features: ['metered_billing', 'usage_records', 'tiered_pricing']
    }
  },
  {
    type: 'workflow',
    title: 'Subscription Lifecycle Management',
    content: `**Complete Subscription Management Workflow**

**Subscription States and Transitions:**

1. **Trial** → **Active** (successful payment)
2. **Trial** → **Incomplete** (payment required)
3. **Active** → **Past Due** (payment failed)
4. **Past Due** → **Active** (payment recovered)
5. **Past Due** → **Canceled** (payment recovery failed)
6. **Active** → **Canceled** (user cancellation)

**Handling Subscription Changes:**

**Plan Upgrades (Immediate)**
\`\`\`javascript
const upgradeSubscription = async (subscriptionId, newPriceId) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: newPriceId,
    }],
    proration_behavior: 'create_prorations', // Charge immediately
    payment_behavior: 'error_if_incomplete' // Fail if payment issues
  });
};
\`\`\`

**Plan Downgrades (End of Period)**
\`\`\`javascript
const downgradeSubscription = async (subscriptionId, newPriceId) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Schedule change for end of current period
  return await stripe.subscriptions.modify(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: newPriceId,
    }],
    proration_behavior: 'none', // No immediate charges
    billing_cycle_anchor: subscription.current_period_end
  });
};
\`\`\`

**Pause/Resume Subscriptions**
\`\`\`javascript
const pauseSubscription = async (subscriptionId, resumeDate) => {
  return await stripe.subscriptions.update(subscriptionId, {
    pause_collection: {
      behavior: 'keep_as_draft',
      resumes_at: Math.floor(resumeDate.getTime() / 1000)
    }
  });
};

const resumeSubscription = async (subscriptionId) => {
  return await stripe.subscriptions.update(subscriptionId, {
    pause_collection: ''
  });
};
\`\`\`

**Cancellation Management:**

**Immediate Cancellation**
\`\`\`javascript
const cancelSubscriptionImmediate = async (subscriptionId) => {
  // Cancel immediately
  const canceledSub = await stripe.subscriptions.cancel(subscriptionId);
  
  // Update user access immediately
  await updateUserAccess(canceledSub.customer, 'canceled');
  
  // Send cancellation confirmation
  await sendCancellationEmail(canceledSub.customer);
  
  return canceledSub;
};
\`\`\`

**End-of-Period Cancellation**
\`\`\`javascript
const scheduleSubscriptionCancellation = async (subscriptionId) => {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
  
  // Schedule access revocation
  await scheduleAccessRevocation(
    subscription.customer,
    new Date(subscription.current_period_end * 1000)
  );
  
  // Send confirmation with retention offer
  await sendCancellationScheduledEmail(subscription.customer, {
    cancellation_date: subscription.current_period_end,
    retention_offer: generateRetentionOffer(subscription)
  });
  
  return subscription;
};
\`\`\`

**Reactivation Workflow:**
\`\`\`javascript
const reactivateSubscription = async (customerId, newPriceId) => {
  // Create new subscription
  const newSubscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: newPriceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent']
  });
  
  // Handle payment confirmation
  if (newSubscription.status === 'incomplete') {
    return {
      subscription: newSubscription,
      requires_payment: true,
      client_secret: newSubscription.latest_invoice.payment_intent.client_secret
    };
  }
  
  // Restore user access
  await updateUserAccess(customerId, 'active');
  
  return { subscription: newSubscription, requires_payment: false };
};
\`\`\`

**Prorations and Credits:**

**Managing Prorations**
\`\`\`javascript
const handleProrations = async (subscriptionId, changeType) => {
  const prorationBehavior = {
    'upgrade': 'create_prorations',     // Charge immediately
    'downgrade': 'none',               // No immediate change
    'addon': 'create_prorations',      // Charge for addon
    'removal': 'create_prorations'     // Credit for removal
  };
  
  return await stripe.subscriptions.update(subscriptionId, {
    proration_behavior: prorationBehavior[changeType] || 'create_prorations'
  });
};
\`\`\`

**Issue Credits**
\`\`\`javascript
const issueCredit = async (customerId, amount, reason) => {
  return await stripe.customers.createBalanceTransaction(customerId, {
    amount: -Math.abs(amount), // Negative for credit
    currency: 'usd',
    description: \`Credit issued: \${reason}\`
  });
};
\`\`\`

**Subscription Analytics:**
\`\`\`javascript
const getSubscriptionMetrics = async (tenantId) => {
  const subscriptions = await stripe.subscriptions.list({
    limit: 100,
    metadata: { tenant_id: tenantId }
  });
  
  return {
    total_subscriptions: subscriptions.data.length,
    active_subscriptions: subscriptions.data.filter(s => s.status === 'active').length,
    trial_subscriptions: subscriptions.data.filter(s => s.status === 'trialing').length,
    past_due_subscriptions: subscriptions.data.filter(s => s.status === 'past_due').length,
    monthly_recurring_revenue: calculateMRR(subscriptions.data),
    churn_rate: await calculateChurnRate(tenantId)
  };
};
\`\`\`

**Best Practices:**
- Always handle subscription webhooks
- Implement graceful degradation for failed payments
- Provide clear communication about changes
- Offer retention incentives before cancellation
- Maintain audit logs of all subscription changes
- Test all edge cases thoroughly`,
    tags: ['subscription', 'lifecycle', 'management', 'stripe', 'best-practices'],
    category: 'workflows',
    metadata: {
      complexity: 'high',
      business_impact: 'critical'
    }
  }
];

export default saasWorkflowKnowledge;