import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { boltLogger } from '@/lib/logging/logger';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    await boltLogger.info('Stripe webhook received', {
      eventType: event.type,
      eventId: event.id,
    });

    // Handle different event types
    switch (event.type) {
      case 'customer.created':
        await handleCustomerCreated(event);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event);
        break;
      default:
        await boltLogger.info('Unhandled webhook event', {
          eventType: event.type,
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    await boltLogger.error('Stripe webhook error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

async function handleCustomerCreated(event: any) {
  const customer = event.data.object;
  
  await boltLogger.info('Customer created via webhook', {
    customerId: customer.id,
    email: customer.email,
    tenantId: customer.metadata?.tenant_id,
  }, {
    tenantId: customer.metadata?.tenant_id,
  });

  // Update local user record if needed
  if (customer.metadata?.user_id && customer.metadata?.tenant_id) {
    await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: customer.id })
      .eq('id', customer.metadata.user_id)
      .eq('tenant_id', customer.metadata.tenant_id);
  }
}

async function handleSubscriptionCreated(event: any) {
  const subscription = event.data.object;
  
  await boltLogger.info('Subscription created via webhook', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
  });
}

async function handleSubscriptionUpdated(event: any) {
  const subscription = event.data.object;
  
  await boltLogger.info('Subscription updated via webhook', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
  });
}

async function handleSubscriptionDeleted(event: any) {
  const subscription = event.data.object;
  
  await boltLogger.info('Subscription deleted via webhook', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });
}

async function handlePaymentSucceeded(event: any) {
  const invoice = event.data.object;
  
  await boltLogger.info('Payment succeeded via webhook', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amountPaid: invoice.amount_paid,
  });
}

async function handlePaymentFailed(event: any) {
  const invoice = event.data.object;
  
  await boltLogger.error('Payment failed via webhook', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amountDue: invoice.amount_due,
  });
}