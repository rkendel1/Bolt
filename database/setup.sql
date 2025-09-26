-- Bolt AI Chatbot Database Schema
-- Run this in your Supabase SQL editor to set up the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR NOT NULL,
    stripe_account_id VARCHAR,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base table
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type VARCHAR NOT NULL CHECK (type IN ('stripe_api', 'tutorial', 'faq', 'workflow')),
    title VARCHAR NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    category VARCHAR NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    level VARCHAR NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_tenant_id ON chat_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tenant_id ON chat_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_type ON knowledge_base(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_logs_tenant_id ON logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO tenants (id, name, settings) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Demo Tenant', '{"stripe_enabled": true, "chatbot_enabled": true}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, tenant_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'demo@example.com', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;

-- Insert knowledge base entries
INSERT INTO knowledge_base (type, title, content, tags, category) VALUES
('stripe_api', 'Creating a Customer', 'To create a customer in Stripe, use the Customers API:

```javascript
const customer = await stripe.customers.create({
  email: ''customer@example.com'',
  name: ''Customer Name'',
  metadata: {
    user_id: ''internal_user_id''
  }
});
```

Best practices:
- Always include email for customer identification
- Use metadata to link Stripe customers to your internal user system
- Store the customer ID in your database for future reference', ARRAY['customer', 'create', 'api'], 'customers'),

('stripe_api', 'Creating a Subscription', 'To create a subscription in Stripe:

```javascript
const subscription = await stripe.subscriptions.create({
  customer: ''cus_customer_id'',
  items: [{ price: ''price_id'' }],
  payment_behavior: ''default_incomplete'',
  payment_settings: { save_default_payment_method: ''on_subscription'' },
  expand: [''latest_invoice.payment_intent'']
});
```

Key points:
- Use payment_behavior: ''default_incomplete'' for better user experience
- Expand the latest_invoice.payment_intent to get client_secret
- Handle the payment confirmation on the frontend', ARRAY['subscription', 'create', 'payment'], 'subscriptions'),

('faq', 'Common Stripe Integration Issues', '**Q: Why is my webhook not working?**
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
- Provide retry mechanisms', ARRAY['troubleshooting', 'webhooks', 'testing'], 'troubleshooting')
ON CONFLICT DO NOTHING;

-- Row Level Security (RLS) policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all data
CREATE POLICY "Service role can access all data" ON tenants FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all data" ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all data" ON chat_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all data" ON chat_messages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all data" ON knowledge_base FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can access all data" ON logs FOR ALL USING (auth.role() = 'service_role');