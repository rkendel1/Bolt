# Bolt AI Chatbot

A standalone, reusable AI chatbot built with Node.js, Next.js, and Supabase that guides SaaS creators through Stripe integration and platform workflows via natural language.

## Features

- 🤖 **AI-Powered Assistance**: Natural language processing for complex Stripe APIs and SaaS workflows
- 💳 **Stripe Integration**: Complete knowledge base with code examples and best practices
- 🏢 **Multi-Tenant Support**: Built for SaaS platforms with tenant isolation and custom branding
- 🔒 **Security First**: Enterprise-grade security with encrypted conversations and audit logs
- ⚡ **Workflow Automation**: Guided workflows for onboarding, payment setup, and subscriptions
- 📊 **Analytics & Insights**: Track interactions and optimize support experience
- 🔌 **Plug-and-Play**: Easy integration into existing applications

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key
- Stripe account (for API integration features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rkendel1/Bolt.git
   cd Bolt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your API keys and configuration:
   ```
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key

   # Stripe Configuration (optional for demo)
   STRIPE_SECRET_KEY=your_stripe_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```

4. **Set up the database**
   - Go to your Supabase project dashboard
   - Open the SQL editor
   - Run the SQL from `database/setup.sql`

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000` to see the application.

## Architecture

### Core Components

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── chat/          # Chat functionality
│   │   ├── dashboard/     # Dashboard APIs
│   │   └── webhooks/      # Webhook handling
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── chatbot/          # Chat interface
│   ├── dashboard/        # Management dashboard
│   └── ui/               # Reusable UI components
├── lib/                  # Core libraries
│   ├── ai/               # OpenAI integration
│   ├── stripe/           # Stripe helpers
│   ├── supabase/         # Database client
│   └── logging/          # Logging system
├── types/                # TypeScript definitions
├── utils/                # Utility functions
└── knowledge-base/       # Stripe knowledge content
```

### Data Flow

1. **User Input**: User sends message through chat interface
2. **Intent Analysis**: AI analyzes message intent and extracts entities
3. **Knowledge Search**: System searches knowledge base for relevant content
4. **Context Building**: Combines conversation history, knowledge, and Stripe context
5. **AI Response**: OpenAI generates contextual response
6. **Storage**: Message and metadata stored in database
7. **Logging**: All interactions logged for analytics

## Integration Guide

### Embedding the Chatbot

You can embed Bolt into your existing application in several ways:

#### 1. React Component Integration

```jsx
import { ChatInterface } from '@/components/chatbot/ChatInterface';

function MyApp() {
  return (
    <div>
      <ChatInterface 
        tenantId="your-tenant-id"
        userId="current-user-id"
      />
    </div>
  );
}
```

#### 2. iframe Embedding

```html
<iframe 
  src="https://your-bolt-instance.com/chat?tenant=your-tenant-id&user=user-id"
  width="400" 
  height="600"
  style="border: none; border-radius: 8px;">
</iframe>
```

#### 3. API Integration

Use the REST API directly:

```javascript
// Create a chat session
const session = await fetch('/api/chat/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tenantId, userId })
});

// Send a message
const response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: session.sessionId,
    content: 'How do I create a Stripe customer?',
    tenantId,
    userId
  })
});
```

### Multi-Tenant Setup

Each tenant can have customized settings:

```javascript
// Tenant configuration
const tenantSettings = {
  chatbot_enabled: true,
  stripe_enabled: true,
  ai_model: 'gpt-4',
  ai_temperature: 0.7,
  custom_branding: {
    logo_url: 'https://example.com/logo.png',
    primary_color: '#007bff',
    secondary_color: '#6c757d'
  }
};
```

## API Reference

### Chat Endpoints

#### POST /api/chat/session
Create a new chat session.

**Request:**
```json
{
  "tenantId": "string",
  "userId": "string"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "status": "success"
}
```

#### POST /api/chat/message
Send a message in a chat session.

**Request:**
```json
{
  "sessionId": "uuid",
  "content": "string",
  "tenantId": "string",
  "userId": "string"
}
```

**Response:**
```json
{
  "message": {
    "id": "uuid",
    "content": "AI response",
    "role": "assistant",
    "created_at": "timestamp"
  },
  "intent": "stripe_help",
  "confidence": 0.95
}
```

### Dashboard Endpoints

#### GET /api/dashboard/stats
Get dashboard statistics.

**Parameters:**
- `tenantId` (required): Tenant identifier

**Response:**
```json
{
  "totalSessions": 150,
  "activeUsers": 45,
  "messagesProcessed": 1250,
  "averageResponseTime": 1.2
}
```

## Configuration

### AI Model Configuration

Configure the AI behavior per tenant:

```json
{
  "ai_model": "gpt-4",
  "ai_temperature": 0.7,
  "ai_max_tokens": 1000,
  "system_prompt": "Custom system prompt for your tenant"
}
```

### Knowledge Base Customization

Add custom knowledge entries:

```sql
INSERT INTO knowledge_base (type, title, content, tags, category) VALUES (
  'custom',
  'Your Custom Guide',
  'Custom content specific to your platform...',
  ARRAY['custom', 'guide'],
  'platform'
);
```

## Security

- **Row Level Security**: Database access controlled by tenant
- **API Authentication**: Secure API endpoints with proper validation
- **Data Encryption**: All sensitive data encrypted at rest and in transit
- **Audit Logging**: Complete audit trail of all interactions
- **Rate Limiting**: Built-in protection against abuse

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Add all your API keys and configuration
# Never commit secrets to version control
```

## Monitoring

### Built-in Analytics

- Session metrics and user engagement
- Message volume and response times
- Intent analysis and confidence scores
- Error rates and system health

### Custom Monitoring

Integrate with your monitoring stack:

```javascript
import { boltLogger } from '@/lib/logging/logger';

// Custom metrics
await boltLogger.info('Custom event', {
  metric: 'user_signup',
  value: 1
}, { tenantId, userId });
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/rkendel1/Bolt/issues)
- 💬 [Discussions](https://github.com/rkendel1/Bolt/discussions)
- 📧 Email: support@boltai.dev

---

Built with ❤️ for SaaS creators everywhere.