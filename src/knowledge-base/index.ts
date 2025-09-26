import { KnowledgeBaseEntry } from '@/types';
import { stripeKnowledgeBase } from './stripe-knowledge';
import saasWorkflowKnowledge from './saas-workflows';
import bestPracticesKnowledge from './best-practices';
import tutorialsKnowledge from './tutorials';

// Combine all knowledge base entries
export const allKnowledgeEntries: Omit<KnowledgeBaseEntry, 'id' | 'created_at' | 'updated_at'>[] = [
  ...stripeKnowledgeBase,
  ...saasWorkflowKnowledge,
  ...bestPracticesKnowledge,
  ...tutorialsKnowledge,
];

// Export individual knowledge bases
export {
  stripeKnowledgeBase,
  saasWorkflowKnowledge,
  bestPracticesKnowledge,
  tutorialsKnowledge,
};

// Helper functions for knowledge base management
export const getKnowledgeByCategory = (category: string) => {
  return allKnowledgeEntries.filter(entry => entry.category === category);
};

export const getKnowledgeByType = (type: string) => {
  return allKnowledgeEntries.filter(entry => entry.type === type);
};

export const getKnowledgeByTags = (tags: string[]) => {
  return allKnowledgeEntries.filter(entry => 
    tags.some(tag => entry.tags.includes(tag))
  );
};

export const searchKnowledge = (query: string) => {
  const searchTerm = query.toLowerCase();
  return allKnowledgeEntries.filter(entry => 
    entry.title.toLowerCase().includes(searchTerm) ||
    entry.content.toLowerCase().includes(searchTerm) ||
    entry.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
};

// Categories for easy navigation
export const knowledgeCategories = [
  'customers',
  'subscriptions',
  'payments',
  'webhooks',
  'workflows',
  'architecture',
  'security',
  'performance',
  'reliability',
  'tutorials',
  'troubleshooting',
];

// Types for filtering
export const knowledgeTypes = [
  'stripe_api',
  'tutorial',
  'faq',
  'workflow',
] as const;

export type KnowledgeType = typeof knowledgeTypes[number];