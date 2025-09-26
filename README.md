# Bolt - AI Chatbot for SaaS Creators

A standalone, reusable AI chatbot built with Node.js, Next.js, and Supabase that guides SaaS creators through Stripe integration and platform workflows via natural language.

## 🚀 Features

- 🤖 **AI-Powered Assistance** - Natural language processing for complex Stripe APIs
- 💳 **Stripe Integration** - Complete knowledge base with code examples
- 🏢 **Multi-Tenant Support** - Built for SaaS platforms with tenant isolation
- 🔒 **Security First** - Enterprise-grade security and audit logs
- ⚡ **Workflow Automation** - Guided workflows for common tasks
- 📊 **Analytics Dashboard** - Track interactions and optimize experience
- 🔌 **Plug-and-Play** - Easy integration into existing applications

## 🎯 Use Cases

- **SaaS Onboarding**: Guide customers through payment setup and configuration
- **Developer Support**: Help with Stripe API integration and troubleshooting
- **Customer Success**: Self-service billing and subscription management
- **Internal Training**: Train teams on Stripe features and best practices

## 🏃‍♂️ Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/rkendel1/Bolt.git
   cd Bolt
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Add your API keys (Supabase, OpenAI, Stripe)
   ```

3. **Set up database**
   - Run `database/setup.sql` in your Supabase project

4. **Start development**
   ```bash
   npm run dev
   ```

5. **Open browser**
   - Visit `http://localhost:3000`
   - Try the live demo!

## 🏗️ Architecture

Built with modern technologies:
- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, OpenAI API
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe API integration
- **Logging**: Winston + database persistence

## 🔧 Integration

### React Component
```jsx
import { ChatInterface } from '@/components/chatbot/ChatInterface';

<ChatInterface 
  tenantId="your-tenant-id"
  userId="current-user-id"
/>
```

### API Integration
```javascript
// Create session and send messages via REST API
const response = await fetch('/api/chat/message', {
  method: 'POST',
  body: JSON.stringify({
    sessionId, content, tenantId, userId
  })
});
```

## 📊 Dashboard

Comprehensive management dashboard featuring:
- Real-time analytics and metrics
- Session management and monitoring
- Knowledge base administration
- Configurable AI settings
- Multi-tenant controls

## 🔒 Security

- Row-level security with Supabase
- Encrypted data at rest and in transit
- Complete audit logging
- Rate limiting and abuse protection
- Multi-tenant data isolation

## 📚 Documentation

- **[Complete Documentation](docs/README.md)** - Detailed setup and integration guide
- **[API Reference](docs/README.md#api-reference)** - All endpoints and examples
- **[Database Schema](database/setup.sql)** - Complete SQL setup
- **[Knowledge Base](src/knowledge-base/)** - Stripe API knowledge content

## 🚀 Deployment

Deploy to Vercel, AWS, or any platform supporting Next.js:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rkendel1/Bolt)

## 🤝 Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🆘 Support

- 📚 [Documentation](docs/)
- 🐛 [Issues](https://github.com/rkendel1/Bolt/issues)
- 💬 [Discussions](https://github.com/rkendel1/Bolt/discussions)

---

**Built for SaaS creators, by SaaS creators** 🚀
