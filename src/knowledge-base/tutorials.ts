import { KnowledgeBaseEntry } from '@/types';

export const tutorialsKnowledge: Omit<KnowledgeBaseEntry, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    type: 'tutorial',
    title: 'Complete SaaS Setup Tutorial - Part 1: Foundation',
    content: `**Building a SaaS from Scratch - Part 1: Project Foundation**

**Prerequisites:**
- Node.js 18+ installed
- PostgreSQL database
- Stripe account
- Basic knowledge of React and TypeScript

**Step 1: Initialize Next.js Project**

\`\`\`bash
npx create-next-app@latest my-saas --typescript --tailwind --eslint --app
cd my-saas
npm install
\`\`\`

**Step 2: Install Essential Dependencies**

\`\`\`bash
# Authentication & Database
npm install @supabase/supabase-js
npm install @auth0/nextjs-auth0 # or your preferred auth provider
npm install prisma @prisma/client

# Payments
npm install stripe @types/stripe

# UI and Utilities
npm install react-hook-form zod
npm install lucide-react @radix-ui/react-dropdown-menu
npm install axios react-query

# Development
npm install -D @types/node
\`\`\`

**Step 3: Environment Configuration**

Create \`.env.local\`:
\`\`\`env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/myapp"
DIRECT_URL="postgresql://username:password@localhost:5432/myapp"

# Authentication
AUTH0_SECRET='your-auth0-secret'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-domain.auth0.com'
AUTH0_CLIENT_ID='your-client-id'
AUTH0_CLIENT_SECRET='your-client-secret'

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
\`\`\`

**Step 4: Database Schema Setup**

Create \`prisma/schema.prisma\`:
\`\`\`prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  tenantId  String
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  
  @@map("users")
}

model Tenant {
  id               String   @id @default(cuid())
  name             String
  stripeCustomerId String?  @unique
  subscriptionId   String?  @unique
  planId           String?
  status           String   @default("trial")
  trialEnds        DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  users        User[]
  subscription Subscription?
  
  @@map("tenants")
}

model Subscription {
  id                String   @id @default(cuid())
  tenantId          String   @unique
  stripeSubscriptionId String @unique
  status            String
  currentPeriodEnd  DateTime
  cancelAtPeriodEnd Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  
  @@map("subscriptions")
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}
\`\`\`

**Step 5: Initialize Database**

\`\`\`bash
npx prisma generate
npx prisma db push
\`\`\`

**Step 6: Create Prisma Client**

Create \`lib/prisma.ts\`:
\`\`\`typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
\`\`\`

**Step 7: Authentication Setup**

Create \`app/api/auth/[...nextauth]/route.ts\`:
\`\`\`typescript
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth0/nextjs-auth0/adapters/prisma';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user!.email! },
        include: { tenant: true },
      });
      
      if (dbUser) {
        session.user.id = dbUser.id;
        session.user.tenantId = dbUser.tenantId;
        session.user.role = dbUser.role;
      }
      
      return session;
    },
  },
});

export { handler as GET, handler as POST };
\`\`\`

**Step 8: Create Basic Layout**

Create \`app/layout.tsx\`:
\`\`\`typescript
import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'My SaaS App',
  description: 'Your SaaS application description',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
\`\`\`

**Step 9: Setup Providers**

Create \`app/providers.tsx\`:
\`\`\`typescript
'use client';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </SessionProvider>
    </QueryClientProvider>
  );
}
\`\`\`

**Step 10: Create Landing Page**

Update \`app/page.tsx\`:
\`\`\`typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-6xl">
            Welcome to My SaaS
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            The perfect solution for your business needs
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link href="/auth/signin">
              <Button size="lg">
                Get Started
              </Button>
            </Link>
            <Link href="/demo" className="text-sm font-semibold leading-6 text-gray-900">
              View Demo <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
\`\`\`

**Step 11: Create Sign-in Page**

Create \`app/auth/signin/page.tsx\`:
\`\`\`typescript
'use client';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function SignIn() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <div>
          <Button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="w-full"
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
\`\`\`

**Step 12: Create Dashboard Layout**

Create \`app/dashboard/layout.tsx\`:
\`\`\`typescript
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <div className="h-screen bg-gray-100">
      <div className="flex h-full">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
\`\`\`

**What's Next:**
- Part 2: Subscription Management & Stripe Integration
- Part 3: Multi-tenant Architecture
- Part 4: Advanced Features & Optimization

**Key Points:**
- ✅ Project structure established
- ✅ Database schema defined  
- ✅ Authentication configured
- ✅ Basic routing setup
- ✅ UI components ready

**Common Issues & Solutions:**
1. **Database connection errors**: Check your DATABASE_URL format
2. **Auth0 configuration**: Ensure callback URLs match your environment
3. **TypeScript errors**: Run \`npm run type-check\` to verify types
4. **Build errors**: Check all environment variables are set

Continue with Part 2 to add Stripe integration and subscription management!`,
    tags: ['tutorial', 'setup', 'nextjs', 'saas', 'foundation', 'step-by-step'],
    category: 'tutorials',
    metadata: {
      difficulty: 'beginner',
      estimated_time: '2-3 hours',
      prerequisites: ['nodejs', 'react', 'typescript'],
      next_tutorial: 'saas-setup-part-2'
    }
  },
  {
    type: 'tutorial',
    title: 'Complete SaaS Setup Tutorial - Part 2: Stripe Integration',
    content: `**Building a SaaS from Scratch - Part 2: Stripe Integration & Subscriptions**

**Prerequisites:**
- Completed Part 1 (Foundation setup)
- Stripe account with test keys
- Basic understanding of webhooks

**Step 1: Stripe Configuration**

Add to your \`.env.local\`:
\`\`\`env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
\`\`\`

**Step 2: Create Stripe Client**

Create \`lib/stripe.ts\`:
\`\`\`typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Client-side Stripe
export const getStripe = () => {
  if (typeof window !== 'undefined') {
    const stripePromise = import('@stripe/stripe-js').then(({ loadStripe }) =>
      loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
    );
    return stripePromise;
  }
  return null;
};
\`\`\`

**Step 3: Define Pricing Plans**

Create \`lib/plans.ts\`:
\`\`\`typescript
export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  stripePriceId: string;
  features: string[];
  limits: {
    users: number;
    projects: number;
    storage: number; // GB
  };
}

export const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for individuals and small teams',
    price: 29,
    interval: 'month',
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID!,
    features: [
      'Up to 5 users',
      '10 projects',
      '10GB storage',
      'Email support',
    ],
    limits: {
      users: 5,
      projects: 10,
      storage: 10,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing teams and businesses',
    price: 99,
    interval: 'month',
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: [
      'Up to 25 users',
      'Unlimited projects',
      '100GB storage',
      'Priority support',
      'Advanced analytics',
    ],
    limits: {
      users: 25,
      projects: -1, // unlimited
      storage: 100,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 299,
    interval: 'month',
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    features: [
      'Unlimited users',
      'Unlimited projects',
      '1TB storage',
      '24/7 phone support',
      'Custom integrations',
      'SLA guarantee',
    ],
    limits: {
      users: -1, // unlimited
      projects: -1, // unlimited
      storage: 1000,
    },
  },
];

export const getPlanById = (planId: string): Plan | undefined => {
  return plans.find(plan => plan.id === planId);
};
\`\`\`

**Step 4: Create Subscription API Routes**

Create \`app/api/subscriptions/create/route.ts\`:
\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { getPlanById } from '@/lib/plans';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await request.json();
    const plan = getPlanById(planId);
    
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get user and tenant
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let customerId = user.tenant.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: {
          tenantId: user.tenantId,
          userId: user.id,
        },
      });

      customerId = customer.id;

      // Update tenant with customer ID
      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create Stripe subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.stripePriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // Update tenant with subscription info
    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        subscriptionId: subscription.id,
        planId: plan.id,
        status: 'incomplete',
      },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
\`\`\`

**Step 5: Handle Stripe Webhooks**

Create \`app/api/webhooks/stripe/route.ts\`:
\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(\`Unhandled event type: \${event.type}\`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const tenant = await prisma.tenant.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  });

  if (!tenant) {
    console.error('Tenant not found for customer:', subscription.customer);
    return;
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      subscriptionId: subscription.id,
      status: subscription.status,
    },
  });

  // Update or create subscription record
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    update: {
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    create: {
      tenantId: tenant.id,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tenant = await prisma.tenant.findUnique({
    where: { stripeCustomerId: subscription.customer as string },
  });

  if (tenant) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: 'canceled',
        subscriptionId: null,
        planId: null,
      },
    });
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const tenant = await prisma.tenant.findUnique({
    where: { stripeCustomerId: invoice.customer as string },
  });

  if (tenant) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'active' },
    });
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const tenant = await prisma.tenant.findUnique({
    where: { stripeCustomerId: invoice.customer as string },
  });

  if (tenant) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'past_due' },
    });
  }
}
\`\`\`

**Step 6: Create Pricing Page**

Create \`app/pricing/page.tsx\`:
\`\`\`typescript
'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { plans } from '@/lib/plans';

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (!session) {
      router.push('/auth/signin?callbackUrl=/pricing');
      return;
    }

    setLoading(planId);

    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const { subscriptionId, clientSecret } = await response.json();

      // Redirect to payment confirmation
      router.push(\`/subscription/confirm?subscription_id=\${subscriptionId}&client_secret=\${clientSecret}\`);
    } catch (error) {
      console.error('Error creating subscription:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600">
          Select the perfect plan for your needs
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="text-3xl font-bold">
                \${plan.price}
                <span className="text-lg font-normal text-gray-600">
                  /{plan.interval}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading === plan.id}
                className="w-full mb-6"
              >
                {loading === plan.id ? 'Creating...' : 'Get Started'}
              </Button>
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
\`\`\`

**Step 7: Create Payment Confirmation Page**

Create \`app/subscription/confirm/page.tsx\`:
\`\`\`typescript
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { PaymentForm } from '@/components/subscription/payment-form';

export default function ConfirmSubscription() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stripePromise, setStripePromise] = useState<any>(null);
  
  const clientSecret = searchParams.get('client_secret');
  const subscriptionId = searchParams.get('subscription_id');

  useEffect(() => {
    if (!clientSecret || !subscriptionId) {
      router.push('/pricing');
      return;
    }

    setStripePromise(getStripe());
  }, [clientSecret, subscriptionId, router]);

  if (!clientSecret || !stripePromise) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">
          Complete Your Subscription
        </h1>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm 
            clientSecret={clientSecret}
            subscriptionId={subscriptionId}
          />
        </Elements>
      </div>
    </div>
  );
}
\`\`\`

**Step 8: Create Payment Form Component**

Create \`components/subscription/payment-form.tsx\`:
\`\`\`typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useStripe,
  useElements,
  PaymentElement,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';

interface PaymentFormProps {
  clientSecret: string;
  subscriptionId: string;
}

export function PaymentForm({ clientSecret, subscriptionId }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: \`\${window.location.origin}/subscription/success?subscription_id=\${subscriptionId}\`,
      },
    });

    if (error) {
      setErrorMessage(error.message || 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="text-red-600 text-sm">{errorMessage}</div>
      )}
      
      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full"
      >
        {isLoading ? 'Processing...' : 'Subscribe Now'}
      </Button>
    </form>
  );
}
\`\`\`

**Step 9: Test Your Integration**

1. **Create test products in Stripe Dashboard:**
   - Go to Stripe Dashboard > Products
   - Create products matching your plans
   - Copy the price IDs to your environment variables

2. **Set up webhook endpoint:**
   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: \`https://yourdomain.com/api/webhooks/stripe\`
   - Select events: \`customer.subscription.*\`, \`invoice.*\`
   - Copy webhook secret to environment

3. **Test the flow:**
   - Visit \`/pricing\`
   - Select a plan
   - Complete payment with test card: \`4242 4242 4242 4242\`

**What's Next:**
- Part 3: Multi-tenant Architecture & User Management
- Part 4: Advanced Features & Analytics

**Key Points:**
- ✅ Stripe integration complete
- ✅ Subscription creation working
- ✅ Webhook handling implemented
- ✅ Payment flow tested

**Common Issues:**
1. **Webhook not receiving events**: Check your endpoint URL and selected events
2. **Payment not confirming**: Verify your client secret handling
3. **Database not updating**: Check webhook signature verification
4. **CORS issues**: Ensure proper domain configuration in Stripe Dashboard

Continue with Part 3 to add multi-tenant features and user management!`,
    tags: ['tutorial', 'stripe', 'subscriptions', 'payments', 'saas', 'step-by-step'],
    category: 'tutorials',
    metadata: {
      difficulty: 'intermediate',
      estimated_time: '3-4 hours',
      prerequisites: ['saas-setup-part-1', 'stripe-account'],
      next_tutorial: 'saas-setup-part-3'
    }
  },
  {
    type: 'tutorial',
    title: 'Building a Multi-Tenant Dashboard',
    content: `**Complete Guide to Building a Multi-Tenant SaaS Dashboard**

**What You'll Build:**
A comprehensive dashboard with tenant isolation, role-based access control, and real-time features.

**Prerequisites:**
- Next.js 13+ with App Router
- Authentication system in place
- Database with multi-tenant schema
- Basic understanding of React and TypeScript

**Step 1: Dashboard Layout Structure**

Create \`components/dashboard/layout.tsx\`:
\`\`\`typescript
'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileSidebar } from './mobile-sidebar';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <div className="h-screen flex bg-gray-100">
      <MobileSidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <Sidebar />
      </div>
      
      <div className="lg:pl-64 flex flex-col flex-1">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
\`\`\`

**Step 2: Dynamic Navigation Based on Permissions**

Create \`components/dashboard/sidebar.tsx\`:
\`\`\`typescript
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  Users,
  Settings,
  CreditCard,
  BarChart3,
  Shield,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: string[];
}

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Users',
    href: '/dashboard/users',
    icon: Users,
    requiredRole: ['OWNER', 'ADMIN'],
  },
  {
    name: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    requiredRole: ['OWNER', 'ADMIN'],
  },
  {
    name: 'Billing',
    href: '/dashboard/billing',
    icon: CreditCard,
    requiredRole: ['OWNER'],
  },
  {
    name: 'Organization',
    href: '/dashboard/organization',
    icon: Building,
    requiredRole: ['OWNER', 'ADMIN'],
  },
  {
    name: 'Security',
    href: '/dashboard/security',
    icon: Shield,
    requiredRole: ['OWNER'],
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const hasAccess = (item: NavItem) => {
    if (!item.requiredRole) return true;
    return item.requiredRole.includes(session?.user?.role || '');
  };

  const filteredNavigation = navigationItems.filter(hasAccess);

  return (
    <div className="flex h-full flex-col bg-white shadow-sm">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">
          {session?.user?.tenant?.name || 'My SaaS'}
        </h1>
      </div>
      
      <nav className="flex-1 px-4 pb-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
\`\`\`

**Step 3: Dashboard Header with User Menu**

Create \`components/dashboard/header.tsx\`:
\`\`\`typescript
'use client';
import { Fragment } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Menu, Transition } from '@headlessui/react';
import { 
  Bars3Icon, 
  BellIcon, 
  ChevronDownIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon 
} from '@heroicons/react/24/outline';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Bars3Icon className="h-6 w-6" />
      </Button>

      <div className="h-6 w-px bg-gray-200 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="relative flex flex-1">
          {/* Search could go here */}
        </div>
        
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <button
            type="button"
            className="p-2.5 text-gray-400 hover:text-gray-500"
          >
            <BellIcon className="h-6 w-6" />
          </button>

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-x-1 text-sm leading-6 text-gray-900">
              <Avatar className="h-8 w-8">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" />
                ) : (
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                )}
              </Avatar>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-2 text-sm font-semibold">
                  {session?.user?.name}
                </span>
                <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" />
              </span>
            </Menu.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="/dashboard/settings"
                      className={cn(
                        active ? 'bg-gray-50' : '',
                        'flex items-center px-3 py-1 text-sm leading-6 text-gray-900'
                      )}
                    >
                      <Cog6ToothIcon className="mr-2 h-4 w-4" />
                      Settings
                    </a>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => signOut()}
                      className={cn(
                        active ? 'bg-gray-50' : '',
                        'flex w-full items-center px-3 py-1 text-sm leading-6 text-gray-900'
                      )}
                    >
                      <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </div>
  );
}
\`\`\`

**Step 4: Dashboard Overview with Metrics**

Create \`app/dashboard/page.tsx\`:
\`\`\`typescript
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { UsageChart } from '@/components/dashboard/usage-chart';

async function getDashboardData(tenantId: string) {
  const [userCount, projectCount, subscription] = await Promise.all([
    prisma.user.count({ where: { tenantId } }),
    prisma.project.count({ where: { tenantId } }), // Assuming you have projects
    prisma.subscription.findUnique({ 
      where: { tenantId },
      include: { tenant: true }
    }),
  ]);

  return {
    userCount,
    projectCount,
    subscription,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession();
  
  if (!session?.user?.tenantId) {
    redirect('/auth/signin');
  }

  const data = await getDashboardData(session.user.tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {session.user.name}!
        </p>
      </div>

      <StatsCards data={data} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsageChart tenantId={session.user.tenantId} />
        <RecentActivity tenantId={session.user.tenantId} />
      </div>
      
      <QuickActions userRole={session.user.role} />
    </div>
  );
}
\`\`\`

**Step 5: Stats Cards Component**

Create \`components/dashboard/stats-cards.tsx\`:
\`\`\`typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderOpen, CreditCard, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  data: {
    userCount: number;
    projectCount: number;
    subscription: any;
  };
}

export function StatsCards({ data }: StatsCardsProps) {
  const stats = [
    {
      name: 'Total Users',
      value: data.userCount,
      icon: Users,
      change: '+2 from last month',
      changeType: 'positive' as const,
    },
    {
      name: 'Active Projects',
      value: data.projectCount,
      icon: FolderOpen,
      change: '+1 from last week',
      changeType: 'positive' as const,
    },
    {
      name: 'Subscription',
      value: data.subscription?.status || 'Inactive',
      icon: CreditCard,
      change: data.subscription?.status === 'active' ? 'Active' : 'Needs attention',
      changeType: data.subscription?.status === 'active' ? 'positive' : 'negative',
    },
    {
      name: 'Monthly Usage',
      value: '87%',
      icon: TrendingUp,
      change: '+5% from last month',
      changeType: 'positive' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <Icon className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={cn(
                'text-xs',
                stat.changeType === 'positive' 
                  ? 'text-green-600' 
                  : 'text-red-600'
              )}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
\`\`\`

**Step 6: Usage Chart Component**

Create \`components/dashboard/usage-chart.tsx\`:
\`\`\`typescript
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { name: 'Jan', users: 4, projects: 2 },
  { name: 'Feb', users: 6, projects: 3 },
  { name: 'Mar', users: 8, projects: 5 },
  { name: 'Apr', users: 12, projects: 7 },
  { name: 'May', users: 15, projects: 9 },
  { name: 'Jun', users: 18, projects: 12 },
];

interface UsageChartProps {
  tenantId: string;
}

export function UsageChart({ tenantId }: UsageChartProps) {
  // In a real app, fetch data based on tenantId
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="users" 
              stroke="#8884d8" 
              strokeWidth={2} 
            />
            <Line 
              type="monotone" 
              dataKey="projects" 
              stroke="#82ca9d" 
              strokeWidth={2} 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
\`\`\`

**Step 7: Real-time Activity Feed**

Create \`components/dashboard/recent-activity.tsx\`:
\`\`\`typescript
'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: Date;
}

interface RecentActivityProps {
  tenantId: string;
}

export function RecentActivity({ tenantId }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch activities for the tenant
    const fetchActivities = async () => {
      try {
        const response = await fetch(\`/api/activities?tenant=\${tenantId}\`);
        const data = await response.json();
        setActivities(data);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // Set up real-time updates (could use WebSocket or Server-Sent Events)
    const interval = setInterval(fetchActivities, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [tenantId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <Avatar className="h-8 w-8">
                <div className="bg-blue-100 text-blue-700 text-sm font-medium flex items-center justify-center h-full w-full rounded-full">
                  {activity.user.charAt(0).toUpperCase()}
                </div>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.user}</span>{' '}
                  {activity.action}{' '}
                  <span className="font-medium">{activity.target}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          
          {activities.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              No recent activity
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
\`\`\`

**Step 8: Quick Actions Component**

Create \`components/dashboard/quick-actions.tsx\`:
\`\`\`typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users, Settings, BarChart3 } from 'lucide-react';

interface QuickActionsProps {
  userRole: string;
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const actions = [
    {
      name: 'Invite User',
      description: 'Add a new team member',
      href: '/dashboard/users/invite',
      icon: Users,
      requiredRole: ['OWNER', 'ADMIN'],
    },
    {
      name: 'Create Project',
      description: 'Start a new project',
      href: '/dashboard/projects/new',
      icon: Plus,
    },
    {
      name: 'View Analytics',
      description: 'Check your metrics',
      href: '/dashboard/analytics',
      icon: BarChart3,
      requiredRole: ['OWNER', 'ADMIN'],
    },
    {
      name: 'Settings',
      description: 'Configure your account',
      href: '/dashboard/settings',
      icon: Settings,
    },
  ];

  const filteredActions = actions.filter(action => 
    !action.requiredRole || action.requiredRole.includes(userRole)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.name} href={action.href}>
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center space-y-2 w-full"
                >
                  <Icon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">{action.name}</div>
                    <div className="text-xs text-gray-500">
                      {action.description}
                    </div>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
\`\`\`

**Key Features Implemented:**
- ✅ Role-based navigation
- ✅ Tenant-isolated data
- ✅ Real-time activity feed
- ✅ Usage analytics
- ✅ Quick action shortcuts
- ✅ Responsive design
- ✅ Loading states

**Security Considerations:**
- All data queries include tenant filtering
- Role-based UI component rendering
- Server-side session validation
- API routes with tenant authorization

**Performance Optimizations:**
- Static generation where possible
- Efficient database queries with proper indexing
- Client-side caching with React Query
- Lazy loading of non-critical components

**Next Steps:**
- Add user management pages
- Implement billing dashboard
- Create analytics views
- Add real-time notifications
- Set up automated testing

This dashboard provides a solid foundation for a multi-tenant SaaS application with proper security, performance, and user experience considerations.`,
    tags: ['tutorial', 'dashboard', 'multi-tenant', 'react', 'nextjs', 'step-by-step'],
    category: 'tutorials',
    metadata: {
      difficulty: 'intermediate',
      estimated_time: '4-6 hours',
      prerequisites: ['nextjs', 'react', 'database-setup', 'authentication']
    }
  }
];

export default tutorialsKnowledge;