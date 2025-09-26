import Stripe from 'stripe';
import { boltLogger } from '../logging/logger';
import { StripeContext } from '@/types';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export class StripeHelper {
  private static instance: StripeHelper;

  private constructor() {}

  public static getInstance(): StripeHelper {
    if (!StripeHelper.instance) {
      StripeHelper.instance = new StripeHelper();
    }
    return StripeHelper.instance;
  }

  async createCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
    tenantId: string;
  }) {
    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: {
          tenant_id: params.tenantId,
          ...params.metadata,
        },
      });

      await boltLogger.info('Customer created', {
        customerId: customer.id,
        email: params.email,
      }, {
        tenantId: params.tenantId,
      });

      return customer;
    } catch (error) {
      await boltLogger.error('Failed to create customer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: params.email,
      }, {
        tenantId: params.tenantId,
      });
      throw error;
    }
  }

  async createSubscription(params: {
    customerId: string;
    priceId: string;
    paymentMethodId?: string;
    trialPeriodDays?: number;
    tenantId: string;
  }) {
    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: params.customerId,
        items: [{ price: params.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      };

      if (params.paymentMethodId) {
        subscriptionParams.default_payment_method = params.paymentMethodId;
      }

      if (params.trialPeriodDays) {
        subscriptionParams.trial_period_days = params.trialPeriodDays;
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams);

      await boltLogger.info('Subscription created', {
        subscriptionId: subscription.id,
        customerId: params.customerId,
        priceId: params.priceId,
      }, {
        tenantId: params.tenantId,
      });

      return subscription;
    } catch (error) {
      await boltLogger.error('Failed to create subscription', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId: params.customerId,
        priceId: params.priceId,
      }, {
        tenantId: params.tenantId,
      });
      throw error;
    }
  }

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, string>;
    tenantId: string;
  }) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency,
        customer: params.customerId,
        description: params.description,
        metadata: {
          tenant_id: params.tenantId,
          ...params.metadata,
        },
        automatic_payment_methods: { enabled: true },
      });

      await boltLogger.info('Payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount: params.amount,
        currency: params.currency,
      }, {
        tenantId: params.tenantId,
      });

      return paymentIntent;
    } catch (error) {
      await boltLogger.error('Failed to create payment intent', {
        error: error instanceof Error ? error.message : 'Unknown error',
        amount: params.amount,
        currency: params.currency,
      }, {
        tenantId: params.tenantId,
      });
      throw error;
    }
  }

  async getCustomer(customerId: string, tenantId: string) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      await boltLogger.error('Failed to retrieve customer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId,
      }, {
        tenantId,
      });
      throw error;
    }
  }

  async getSubscription(subscriptionId: string, tenantId: string) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice', 'customer'],
      });
      return subscription;
    } catch (error) {
      await boltLogger.error('Failed to retrieve subscription', {
        error: error instanceof Error ? error.message : 'Unknown error',
        subscriptionId,
      }, {
        tenantId,
      });
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string, tenantId: string) {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);

      await boltLogger.info('Subscription cancelled', {
        subscriptionId,
      }, {
        tenantId,
      });

      return subscription;
    } catch (error) {
      await boltLogger.error('Failed to cancel subscription', {
        error: error instanceof Error ? error.message : 'Unknown error',
        subscriptionId,
      }, {
        tenantId,
      });
      throw error;
    }
  }

  async listProducts(tenantId: string) {
    try {
      const products = await stripe.products.list({
        active: true,
        expand: ['data.default_price'],
      });
      return products;
    } catch (error) {
      await boltLogger.error('Failed to list products', {
        error: error instanceof Error ? error.message : 'Unknown error',
      }, {
        tenantId,
      });
      throw error;
    }
  }

  // Helper method to extract Stripe context from conversation
  extractStripeContext(context: any): StripeContext {
    return {
      customer_id: context?.customer_id,
      subscription_id: context?.subscription_id,
      payment_intent_id: context?.payment_intent_id,
      product_id: context?.product_id,
      price_id: context?.price_id,
    };
  }
}

export const stripeHelper = StripeHelper.getInstance();