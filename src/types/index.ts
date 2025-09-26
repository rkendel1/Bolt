// Core types for the Bolt AI Chatbot

export interface User {
  id: string;
  email: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  stripe_account_id?: string;
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  stripe_enabled: boolean;
  chatbot_enabled: boolean;
  custom_branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

export interface ChatMessage {
  id: string;
  user_id: string;
  tenant_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  metadata?: {
    stripe_intent_id?: string;
    workflow_id?: string;
    tutorial_step?: number;
  };
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  tenant_id: string;
  messages: ChatMessage[];
  status: 'active' | 'completed' | 'abandoned';
  context?: {
    current_workflow?: string;
    stripe_context?: StripeContext;
  };
  created_at: string;
  updated_at: string;
}

export interface StripeContext {
  customer_id?: string;
  subscription_id?: string;
  payment_intent_id?: string;
  product_id?: string;
  price_id?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  action_type: 'stripe_api' | 'guidance' | 'tutorial' | 'validation';
  parameters?: Record<string, any>;
  next_steps?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: 'onboarding' | 'payment_setup' | 'subscription_management' | 'general';
  steps: WorkflowStep[];
  tenant_id?: string;
}

export interface KnowledgeBaseEntry {
  id: string;
  type: 'stripe_api' | 'tutorial' | 'faq' | 'workflow';
  title: string;
  content: string;
  tags: string[];
  category: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ChatbotConfig {
  tenant_id: string;
  model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo';
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  enabled_features: {
    stripe_integration: boolean;
    workflow_automation: boolean;
    tutorial_system: boolean;
    multi_tenant: boolean;
  };
}

export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
  user_id?: string;
  tenant_id?: string;
  session_id?: string;
  timestamp: string;
}