'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ChatMessage } from '@/types';

// Enhanced conversation state to support branching and context retention
export interface ConversationState {
  sessionId: string | null;
  messages: ChatMessage[];
  context: {
    currentWorkflow?: string;
    userIntent?: string;
    lastRecommendations?: string[];
    usagePatterns?: {
      commonQueries: string[];
      preferredTopics: string[];
      skillLevel: 'beginner' | 'intermediate' | 'advanced';
    };
    conversationBranches?: {
      [branchId: string]: {
        messages: ChatMessage[];
        context: Record<string, any>;
      };
    };
  };
  isLoading: boolean;
  currentBranch: string;
  suggestedActions?: SuggestedAction[];
}

export interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  action: 'workflow' | 'tutorial' | 'upgrade' | 'setup';
  priority: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

type ConversationAction =
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_CONTEXT'; payload: Partial<ConversationState['context']> }
  | { type: 'BRANCH_CONVERSATION'; payload: { branchId: string; fromMessageId: string } }
  | { type: 'SWITCH_BRANCH'; payload: string }
  | { type: 'SET_SUGGESTED_ACTIONS'; payload: SuggestedAction[] }
  | { type: 'RESET_CONVERSATION' };

const initialState: ConversationState = {
  sessionId: null,
  messages: [],
  context: {
    usagePatterns: {
      commonQueries: [],
      preferredTopics: [],
      skillLevel: 'beginner'
    },
    conversationBranches: {}
  },
  isLoading: false,
  currentBranch: 'main',
  suggestedActions: []
};

function conversationReducer(state: ConversationState, action: ConversationAction): ConversationState {
  switch (action.type) {
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'UPDATE_CONTEXT':
      return {
        ...state,
        context: { ...state.context, ...action.payload }
      };
    
    case 'BRANCH_CONVERSATION':
      const { branchId, fromMessageId } = action.payload;
      const messageIndex = state.messages.findIndex(m => m.id === fromMessageId);
      const branchMessages = state.messages.slice(0, messageIndex + 1);
      
      return {
        ...state,
        context: {
          ...state.context,
          conversationBranches: {
            ...state.context.conversationBranches,
            [branchId]: {
              messages: branchMessages,
              context: { ...state.context }
            }
          }
        },
        currentBranch: branchId
      };
    
    case 'SWITCH_BRANCH':
      const branch = state.context.conversationBranches?.[action.payload];
      if (branch) {
        return {
          ...state,
          messages: branch.messages,
          context: { ...state.context, ...branch.context },
          currentBranch: action.payload
        };
      }
      return state;
    
    case 'SET_SUGGESTED_ACTIONS':
      return { ...state, suggestedActions: action.payload };
    
    case 'RESET_CONVERSATION':
      return { ...initialState };
    
    default:
      return state;
  }
}

const ConversationContext = createContext<{
  state: ConversationState;
  dispatch: React.Dispatch<ConversationAction>;
} | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(conversationReducer, initialState);

  return (
    <ConversationContext.Provider value={{ state, dispatch }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}

// Helper hooks for specific functionality
export function useConversationBranching() {
  const { state, dispatch } = useConversation();
  
  const createBranch = (fromMessageId: string) => {
    const branchId = `branch-${Date.now()}`;
    dispatch({ type: 'BRANCH_CONVERSATION', payload: { branchId, fromMessageId } });
    return branchId;
  };
  
  const switchBranch = (branchId: string) => {
    dispatch({ type: 'SWITCH_BRANCH', payload: branchId });
  };
  
  return {
    branches: Object.keys(state.context.conversationBranches || {}),
    currentBranch: state.currentBranch,
    createBranch,
    switchBranch
  };
}

export function useUsagePatterns() {
  const { state, dispatch } = useConversation();
  
  const updateUsagePattern = (query: string, topic: string) => {
    const patterns = state.context.usagePatterns;
    if (!patterns) return;
    
    const updatedPatterns = {
      ...patterns,
      commonQueries: [...new Set([...patterns.commonQueries, query])].slice(-10),
      preferredTopics: [...new Set([...patterns.preferredTopics, topic])].slice(-5)
    };
    
    dispatch({ type: 'UPDATE_CONTEXT', payload: { usagePatterns: updatedPatterns } });
  };
  
  return {
    patterns: state.context.usagePatterns,
    updateUsagePattern
  };
}