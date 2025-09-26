'use client';

import React, { useEffect, useState } from 'react';
import { Lightbulb, TrendingUp, Zap, ArrowRight, X } from 'lucide-react';
import { useConversation, SuggestedAction } from './ConversationContext';

interface PredictiveRecommendationsProps {
  tenantId: string;
  userId: string;
  className?: string;
}

export default function PredictiveRecommendations({
  tenantId,
  userId,
  className = ''
}: PredictiveRecommendationsProps) {
  const { state, dispatch } = useConversation();
  const [recommendations, setRecommendations] = useState<SuggestedAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    generateRecommendations();
  }, [state.messages, state.context.usagePatterns]);

  const generateRecommendations = async () => {
    if (state.messages.length === 0) return;
    
    setIsLoading(true);
    try {
      // Analyze conversation for patterns and recommendations
      const lastMessages = state.messages.slice(-5);
      const userQueries = lastMessages
        .filter(m => m.role === 'user')
        .map(m => m.content);
      
      const patterns = state.context.usagePatterns;
      const recommendations = await analyzeAndGenerateRecommendations(
        userQueries,
        patterns,
        tenantId,
        userId
      );
      
      setRecommendations(recommendations);
      dispatch({ type: 'SET_SUGGESTED_ACTIONS', payload: recommendations });
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeAndGenerateRecommendations = async (
    queries: string[],
    patterns: any,
    tenantId: string,
    userId: string
  ): Promise<SuggestedAction[]> => {
    const recommendations: SuggestedAction[] = [];
    
    // Pattern-based recommendations
    const topics = extractTopicsFromQueries(queries);
    
    // Tier-based recommendations
    if (topics.includes('stripe') || topics.includes('payment')) {
      recommendations.push({
        id: 'stripe-integration-tutorial',
        title: 'Complete Stripe Integration Tutorial',
        description: 'Step-by-step guide to implement Stripe payments',
        action: 'tutorial',
        priority: 'high',
        metadata: { tutorial: 'stripe-integration', estimatedTime: '30 minutes' }
      });
    }
    
    if (topics.includes('subscription') && patterns?.skillLevel === 'beginner') {
      recommendations.push({
        id: 'subscription-basics',
        title: 'Subscription Management Basics',
        description: 'Learn the fundamentals of subscription billing',
        action: 'tutorial',
        priority: 'medium',
        metadata: { tutorial: 'subscription-basics', estimatedTime: '20 minutes' }
      });
    }
    
    // Usage-based recommendations
    if (patterns?.commonQueries?.length > 5) {
      recommendations.push({
        id: 'upgrade-to-pro',
        title: 'Upgrade to Pro Plan',
        description: 'Get advanced features and priority support',
        action: 'upgrade',
        priority: 'medium',
        metadata: { tier: 'pro', features: ['Advanced AI', 'Priority Support', 'Custom Workflows'] }
      });
    }
    
    // Workflow suggestions
    if (topics.includes('webhook') || topics.includes('event')) {
      recommendations.push({
        id: 'webhook-setup-workflow',
        title: 'Set Up Webhook Workflow',
        description: 'Configure automated webhook handling',
        action: 'workflow',
        priority: 'high',
        metadata: { workflow: 'webhook-setup', complexity: 'intermediate' }
      });
    }
    
    // Context-aware suggestions
    if (hasRecentErrors(queries)) {
      recommendations.push({
        id: 'troubleshooting-assistant',
        title: 'Troubleshooting Assistant',
        description: 'Get help diagnosing and fixing issues',
        action: 'workflow',
        priority: 'high',
        metadata: { workflow: 'troubleshooting', type: 'diagnostic' }
      });
    }
    
    return recommendations.slice(0, 4); // Limit to top 4 recommendations
  };

  const extractTopicsFromQueries = (queries: string[]): string[] => {
    const topics = new Set<string>();
    const topicKeywords = {
      stripe: ['stripe', 'payment', 'charge', 'customer'],
      subscription: ['subscription', 'recurring', 'billing'],
      webhook: ['webhook', 'event', 'notification'],
      integration: ['api', 'integration', 'connect'],
      error: ['error', 'issue', 'problem', 'failed']
    };
    
    queries.forEach(query => {
      const lowerQuery = query.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => lowerQuery.includes(keyword))) {
          topics.add(topic);
        }
      });
    });
    
    return Array.from(topics);
  };

  const hasRecentErrors = (queries: string[]): boolean => {
    const errorKeywords = ['error', 'failed', 'issue', 'problem', 'not working'];
    return queries.some(query => 
      errorKeywords.some(keyword => query.toLowerCase().includes(keyword))
    );
  };

  const handleRecommendationClick = (recommendation: SuggestedAction) => {
    // Trigger the recommended action
    switch (recommendation.action) {
      case 'tutorial':
        startTutorial(recommendation.metadata?.tutorial);
        break;
      case 'workflow':
        startWorkflow(recommendation.metadata?.workflow);
        break;
      case 'upgrade':
        showUpgradeOptions(recommendation.metadata?.tier);
        break;
      case 'setup':
        startSetup(recommendation.metadata?.setup);
        break;
    }
  };

  const startTutorial = (tutorialId: string) => {
    dispatch({ 
      type: 'ADD_MESSAGE', 
      payload: {
        id: `system-${Date.now()}`,
        user_id: userId,
        tenant_id: tenantId,
        content: `Starting ${tutorialId} tutorial...`,
        role: 'system',
        created_at: new Date().toISOString()
      }
    });
  };

  const startWorkflow = (workflowId: string) => {
    dispatch({ 
      type: 'UPDATE_CONTEXT', 
      payload: { currentWorkflow: workflowId }
    });
  };

  const showUpgradeOptions = (tier: string) => {
    // Implementation for showing upgrade modal/flow
    console.log(`Showing upgrade options for ${tier}`);
  };

  const startSetup = (setupId: string) => {
    dispatch({ 
      type: 'UPDATE_CONTEXT', 
      payload: { currentWorkflow: `setup-${setupId}` }
    });
  };

  const getPriorityColor = (priority: SuggestedAction['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50 text-red-700';
      case 'medium': return 'border-yellow-200 bg-yellow-50 text-yellow-700';
      case 'low': return 'border-blue-200 bg-blue-50 text-blue-700';
      default: return 'border-gray-200 bg-gray-50 text-gray-700';
    }
  };

  const getPriorityIcon = (priority: SuggestedAction['priority']) => {
    switch (priority) {
      case 'high': return <Zap className="w-4 h-4" />;
      case 'medium': return <TrendingUp className="w-4 h-4" />;
      case 'low': return <Lightbulb className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  if (recommendations.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <Lightbulb className="w-4 h-4 text-yellow-500" />
        <h4 className="text-sm font-medium text-gray-900">Recommended Actions</h4>
      </div>
      
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-16 bg-gray-100 rounded-lg"></div>
          <div className="h-16 bg-gray-100 rounded-lg"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {recommendations.map((recommendation) => (
            <div
              key={recommendation.id}
              className={`p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${getPriorityColor(recommendation.priority)}`}
              onClick={() => handleRecommendationClick(recommendation)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    {getPriorityIcon(recommendation.priority)}
                    <h5 className="text-sm font-medium">{recommendation.title}</h5>
                  </div>
                  <p className="text-xs opacity-80">{recommendation.description}</p>
                  {recommendation.metadata?.estimatedTime && (
                    <p className="text-xs opacity-60 mt-1">
                      Est. time: {recommendation.metadata.estimatedTime}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 opacity-60" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}