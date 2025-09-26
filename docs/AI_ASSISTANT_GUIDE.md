# Bolt AI Assistant Guide

Bolt has been enhanced from a basic API executor into a comprehensive, intelligent assistant for SaaS creators. This guide covers the new AI capabilities and knowledge base system.

## Overview

The enhanced Bolt AI assistant provides:

- **Comprehensive Knowledge Base**: 25+ detailed entries covering Stripe APIs, SaaS workflows, best practices, and tutorials
- **Contextual Guidance**: Smart recommendations based on your current setup and workflow
- **Security-First Approach**: Proactive warnings about common pitfalls and security considerations
- **Step-by-Step Tutorials**: Interactive guidance for complex implementations
- **Multi-Tenant Awareness**: Context-appropriate advice for scalable SaaS architecture

## Knowledge Base Categories

### 1. Stripe API Guidance
- Customer and subscription management
- Payment processing and webhooks
- Security best practices
- Testing strategies
- Common integration patterns

### 2. SaaS Workflows
- Complete customer onboarding flows
- Multi-tenant architecture patterns
- Payment recovery and dunning management
- Subscription lifecycle management
- User management and permissions

### 3. Best Practices
- Security guidelines and compliance
- Performance optimization strategies
- Error handling and recovery patterns
- Testing and deployment practices
- Monitoring and observability

### 4. Interactive Tutorials
- Stripe integration setup (Beginner, 2-3h)
- SaaS subscription management (Intermediate, 4-6h)
- Multi-tenant architecture (Advanced, 6-8h)
- Dashboard development (Intermediate, 4-6h)
- Webhook processing (Intermediate, 3-4h)

## AI Assistant Capabilities

### Intent Recognition
The AI automatically detects and handles four main intent types:

1. **Stripe Help** - API questions, implementation guidance
2. **Workflow Guidance** - Process and architecture advice
3. **Tutorial Requests** - Step-by-step learning paths
4. **General Questions** - Conversational assistance

### Contextual Responses
The assistant provides:

- **Actionable Code Examples**: Working snippets with best practices
- **Security Warnings**: Alerts about common mistakes and vulnerabilities
- **Next Steps**: Clear guidance on what to do after current action
- **Testing Recommendations**: Specific strategies for validation
- **Architecture Advice**: Multi-tenant and scalability considerations

### Enhanced Search
The knowledge base search uses multiple strategies:

- Title and content matching
- Tag-based filtering
- Category relevance
- Semantic similarity
- Relevance scoring

## Using the AI Assistant

### Basic Interaction
```typescript
// The AI automatically analyzes your message intent
const response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: "How do I create a Stripe customer?",
    sessionId: "your-session-id",
    userId: "your-user-id",
    tenantId: "your-tenant-id"
  })
});
```

### Example Queries

**Stripe Integration:**
- "How do I create a subscription with a trial period?"
- "What webhooks should I handle for payment processing?"
- "How do I implement Strong Customer Authentication?"

**Workflow Guidance:**
- "Walk me through a complete onboarding workflow"
- "How should I structure my multi-tenant database?"
- "What's the best way to handle failed payments?"

**Tutorial Requests:**
- "I need a tutorial on Stripe setup"
- "Show me how to build a subscription management system"
- "Can you guide me through multi-tenant architecture?"

### Advanced Features

#### Context Preservation
The assistant maintains context across conversations:
- Previous actions and results
- Current workflow state
- Stripe integration status
- User permissions and tenant configuration

#### Execution Integration
The assistant can:
- Execute Stripe API calls
- Provide immediate feedback on actions
- Suggest follow-up steps
- Handle errors with detailed explanations

#### Multi-Tenant Support
All guidance considers:
- Tenant isolation requirements
- Data security implications
- Scalability considerations
- Permission models

## Knowledge Base Management

### Seeding the Knowledge Base

To populate the knowledge base with comprehensive entries:

```bash
# Using the API endpoint
curl -X POST http://localhost:3000/api/knowledge-base/seed \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "your-admin-key"}'

# Or in development mode (automatically authorized)
curl -X POST http://localhost:3000/api/knowledge-base/seed
```

### Knowledge Base Statistics

Get current knowledge base status:

```bash
curl http://localhost:3000/api/knowledge-base/seed
```

Returns statistics including:
- Total entries by type and category
- Recent additions
- Available entries for seeding

### Custom Knowledge Entries

Add your own knowledge entries by extending the knowledge base files:

```typescript
// src/knowledge-base/custom-knowledge.ts
export const customKnowledge: Omit<KnowledgeBaseEntry, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    type: 'tutorial',
    title: 'Your Custom Tutorial',
    content: 'Detailed tutorial content...',
    tags: ['custom', 'tutorial'],
    category: 'tutorials',
    metadata: {
      difficulty: 'intermediate',
      estimated_time: '2-3 hours'
    }
  }
];
```

## Configuration

### Environment Variables

Required for full functionality:

```env
# OpenAI API for AI responses
OPENAI_API_KEY=your_openai_api_key

# Supabase for knowledge base storage
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Admin keys for knowledge base management
ADMIN_SEED_KEY=your_admin_seed_key
ADMIN_SECRET_KEY=your_admin_secret_key
```

### AI Model Configuration

Configure the AI assistant per tenant:

```typescript
const chatbotConfig: ChatbotConfig = {
  tenant_id: tenantId,
  model: 'gpt-3.5-turbo', // or 'gpt-4'
  temperature: 0.7,
  max_tokens: 1000,
  enabled_features: {
    stripe_integration: true,
    workflow_automation: true,
    tutorial_system: true,
    multi_tenant: true,
  },
};
```

## Best Practices

### For Developers

1. **Always validate user input** before passing to the AI assistant
2. **Monitor API usage** to manage costs effectively
3. **Implement proper error handling** for AI service failures
4. **Use tenant-specific contexts** for multi-tenant applications
5. **Regularly update knowledge base** with new patterns and solutions

### For Content Creation

1. **Keep knowledge entries focused** on specific topics
2. **Include working code examples** with explanations
3. **Add security warnings** for sensitive operations
4. **Provide testing strategies** for implementations
5. **Use clear, actionable language** in guidance

### For Operations

1. **Monitor knowledge base usage** patterns
2. **Track successful vs failed interactions**
3. **Update entries based on user feedback**
4. **Maintain consistency** across knowledge categories
5. **Regular security reviews** of AI-generated content

## Troubleshooting

### Common Issues

**AI not providing contextual responses:**
- Check knowledge base is properly seeded
- Verify search functionality is working
- Ensure proper tenant context is provided

**Knowledge base search returning poor results:**
- Update search algorithms in `AIService.searchKnowledgeBase`
- Check database indexes are in place
- Verify content quality and tag accuracy

**High API costs:**
- Implement response caching
- Optimize token usage in prompts
- Use smaller models for simpler queries

**Performance issues:**
- Enable database query optimization
- Implement knowledge base caching
- Use async processing for complex requests

## Future Enhancements

Planned improvements include:

- **Vector embeddings** for semantic search
- **Conversation memory** across sessions
- **Learning from user feedback** loops
- **Custom knowledge domains** per tenant
- **Multi-language support** for global SaaS
- **Integration with external documentation** sources

## Support

For issues or questions about the AI assistant:

1. Check the troubleshooting section above
2. Review the knowledge base entries for similar problems
3. Enable debug logging for detailed error information
4. Consult the codebase documentation in `/docs`

The enhanced AI assistant transforms Bolt from a simple API executor into a comprehensive, intelligent partner for SaaS development, providing contextual guidance, security awareness, and step-by-step tutorials to help creators build successful applications.