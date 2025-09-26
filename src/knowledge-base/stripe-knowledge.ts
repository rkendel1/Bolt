import { KnowledgeBaseEntry } from '@/types';

export const stripeKnowledgeBase: Omit<KnowledgeBaseEntry, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    type: 'stripe_api',
    title: 'Creating a Customer',
    content: `To create a customer in Stripe, use the Customers API:

\`\`\`javascript
const customer = await stripe.customers.create({
  email: 'customer@example.com',
  name: 'Customer Name',
  metadata: {
    user_id: 'internal_user_id'
  }
});
\`\`\`

Best practices:
- Always include email for customer identification
- Use metadata to link Stripe customers to your internal user system
- Store the customer ID in your database for future reference`,
    tags: ['customer', 'create', 'api'],
    category: 'customers',
    metadata: {
      api_endpoint: '/v1/customers',
      method: 'POST'
    }
  },
  {
    type: 'stripe_api',
    title: 'Creating a Subscription',
    content: `To create a subscription in Stripe:

\`\`\`javascript
const subscription = await stripe.subscriptions.create({
  customer: 'cus_customer_id',
  items: [{ price: 'price_id' }],
  payment_behavior: 'default_incomplete',
  payment_settings: { save_default_payment_method: 'on_subscription' },
  expand: ['latest_invoice.payment_intent']
});
\`\`\`

Key points:
- Use payment_behavior: 'default_incomplete' for better user experience
- Expand the latest_invoice.payment_intent to get client_secret
- Handle the payment confirmation on the frontend`,
    tags: ['subscription', 'create', 'payment'],
    category: 'subscriptions',
    metadata: {
      api_endpoint: '/v1/subscriptions',
      method: 'POST'
    }
  },
  {
    type: 'stripe_api',
    title: 'Handling Webhooks',
    content: `Stripe webhooks are essential for handling payment events:

\`\`\`javascript
const sig = req.headers['stripe-signature'];
let event;

try {
  event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
} catch (err) {
  console.log('Webhook signature verification failed.');
  return res.status(400).send('Webhook Error');
}

// Handle the event
switch (event.type) {
  case 'customer.subscription.created':
    // Handle new subscription
    break;
  case 'invoice.payment_succeeded':
    // Handle successful payment
    break;
  case 'invoice.payment_failed':
    // Handle failed payment
    break;
  default:
    console.log('Unhandled event type:', event.type);
}
\`\`\`

Important webhook events:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed`,
    tags: ['webhooks', 'events', 'security'],
    category: 'webhooks',
    metadata: {
      security_level: 'high'
    }
  },
  {
    type: 'stripe_api',
    title: 'Payment Intents',
    content: `Payment Intents provide a secure way to handle payments:

\`\`\`javascript
// Create payment intent on backend
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000, // $20.00
  currency: 'usd',
  customer: 'cus_customer_id',
  automatic_payment_methods: { enabled: true }
});

// On frontend, confirm payment
const {error} = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: 'https://your-website.com/return'
  }
});
\`\`\`

Advantages:
- Better fraud protection
- Support for 3D Secure authentication
- Ability to capture payments later`,
    tags: ['payment-intent', 'security', 'frontend'],
    category: 'payments',
    metadata: {
      frontend_required: true
    }
  },
  {
    type: 'workflow',
    title: 'SaaS Subscription Onboarding Flow',
    content: `Complete flow for onboarding new SaaS customers:

1. **User Registration**
   - Collect email and basic info
   - Create user account in your database
   - Send welcome email

2. **Plan Selection**
   - Display available plans
   - Handle plan selection
   - Store selected plan info

3. **Stripe Customer Creation**
   - Create Stripe customer
   - Link to internal user ID
   - Store customer ID

4. **Payment Method Setup**
   - Use Stripe Elements for card collection
   - Create setup intent for future payments
   - Confirm setup intent

5. **Subscription Creation**
   - Create subscription with selected plan
   - Handle initial payment
   - Activate user account

6. **Post-Setup**
   - Send confirmation email
   - Redirect to dashboard
   - Start feature onboarding`,
    tags: ['onboarding', 'saas', 'workflow'],
    category: 'workflows'
  },
  {
    type: 'tutorial',
    title: 'Multi-tenant Stripe Integration',
    content: `Setting up Stripe for multi-tenant SaaS:

**1. Database Schema**
\`\`\`sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  stripe_account_id VARCHAR,
  settings JSONB
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  stripe_customer_id VARCHAR
);
\`\`\`

**2. Tenant-specific Stripe Accounts**
- Use Stripe Connect for separate accounts per tenant
- Or use metadata to segment customers by tenant

**3. Request Context**
\`\`\`javascript
// Always include tenant context
const customer = await stripe.customers.create({
  email: user.email,
  metadata: {
    tenant_id: tenant.id,
    user_id: user.id
  }
});
\`\`\`

**4. Data Isolation**
- Filter all Stripe operations by tenant
- Use row-level security in database
- Validate tenant access in API routes`,
    tags: ['multi-tenant', 'architecture', 'saas'],
    category: 'architecture'
  },
  {
    type: 'faq',
    title: 'Common Stripe Integration Issues',
    content: `**Q: Why is my webhook not working?**
A: Common issues:
- Incorrect endpoint URL
- Wrong webhook secret
- Not returning 200 status
- Timeout (must respond within 20 seconds)

**Q: How to handle failed payments?**
A: 
- Listen to invoice.payment_failed webhook
- Implement dunning management
- Notify customers via email
- Provide retry mechanisms

**Q: How to handle plan upgrades/downgrades?**
A:
- Use subscription modifications
- Handle proration automatically
- Consider billing cycles
- Update user permissions immediately

**Q: How to test webhooks locally?**
A:
- Use Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks
- Use ngrok for public URL
- Test with Stripe's webhook testing tool`,
    tags: ['troubleshooting', 'webhooks', 'testing'],
    category: 'troubleshooting'
  },
  {
    type: 'stripe_api',
    title: 'Subscription Lifecycle Management',
    content: `Managing subscription states throughout their lifecycle:

**Creating with Trial**
\`\`\`javascript
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  trial_period_days: 14
});
\`\`\`

**Updating Subscription**
\`\`\`javascript
const subscription = await stripe.subscriptions.update(subscriptionId, {
  items: [{
    id: subscription.items.data[0].id,
    price: newPriceId,
  }],
  proration_behavior: 'create_prorations'
});
\`\`\`

**Canceling Subscription**
\`\`\`javascript
// Cancel at period end
const subscription = await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true
});

// Cancel immediately
const subscription = await stripe.subscriptions.cancel(subscriptionId);
\`\`\`

**Pausing Subscription**
\`\`\`javascript
const subscription = await stripe.subscriptions.update(subscriptionId, {
  pause_collection: {
    behavior: 'keep_as_draft'
  }
});
\`\`\``,
    tags: ['subscription', 'lifecycle', 'management'],
    category: 'subscriptions'
  }
];

export const defaultKnowledgeEntries = stripeKnowledgeBase;