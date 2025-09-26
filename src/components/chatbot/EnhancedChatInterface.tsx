'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader, X, MessageCircle, GitBranch, MoreHorizontal, Smartphone, Monitor } from 'lucide-react';
import { ChatMessage } from '@/types';
import { toast } from 'react-hot-toast';
import { ConversationProvider, useConversation, useConversationBranching } from './ConversationContext';
import PredictiveRecommendations from './PredictiveRecommendations';
import RealtimeValidation from './RealtimeValidation';

interface EnhancedChatInterfaceProps {
  tenantId: string;
  userId: string;
  initialMessages?: ChatMessage[];
  onClose?: () => void;
  className?: string;
  showRecommendations?: boolean;
  isMobile?: boolean;
}

function EnhancedChatContent({
  tenantId,
  userId,
  initialMessages = [],
  onClose,
  className = '',
  showRecommendations = true,
  isMobile = false
}: EnhancedChatInterfaceProps) {
  const { state, dispatch } = useConversation();
  const { branches, currentBranch, createBranch, switchBranch } = useConversationBranching();
  const [inputMessage, setInputMessage] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showBranches, setShowBranches] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  useEffect(() => {
    // Initialize chat session
    initializeSession();
  }, [tenantId, userId]);

  useEffect(() => {
    // Set initial messages if provided
    if (initialMessages.length > 0) {
      initialMessages.forEach(message => {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
      });
    }
  }, [initialMessages, dispatch]);

  const initializeSession = async () => {
    try {
      const response = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize chat session');
      }

      const { sessionId: newSessionId } = await response.json();
      dispatch({ type: 'SET_SESSION_ID', payload: newSessionId });
    } catch (error) {
      toast.error('Failed to initialize chat session');
      console.error('Session initialization error:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || state.isLoading || !state.sessionId) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: userId,
      tenant_id: tenantId,
      content: inputMessage.trim(),
      role: 'user',
      created_at: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    setInputMessage('');
    dispatch({ type: 'SET_LOADING', payload: true });
    setTypingIndicator(true);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          content: inputMessage.trim(),
          tenantId,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const { message: assistantMessage } = await response.json();
      
      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Message sending error:', error);
      
      // Remove the user message if sending failed
      // In a real implementation, you'd filter out the temp message
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      setTypingIndicator(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as any);
    }
  };

  const handleBranchConversation = (messageId: string) => {
    const branchId = createBranch(messageId);
    toast.success(`Created conversation branch: ${branchId}`);
  };

  const formatMessageContent = (content: string) => {
    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const escapedContent = escapeHtml(content);
    
    // Enhanced formatting for code blocks, links, and markdown
    return escapedContent
      .replace(/```([^`]+)```/g, '<pre class="bg-gray-800 text-green-400 p-3 rounded-lg text-sm overflow-x-auto my-2"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-blue-600 underline hover:text-blue-800">$1</a>');
  };

  const getMessageActions = (message: ChatMessage) => {
    if (message.role === 'assistant') {
      return (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleBranchConversation(message.id)}
            className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
            title="Branch conversation from here"
          >
            <GitBranch className="w-3 h-3" />
          </button>
        </div>
      );
    }
    return null;
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Bot className="w-6 h-6 text-blue-600" />
          {state.isLoading && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Bolt AI Assistant</h3>
          <p className="text-xs text-gray-500">
            {isMobile ? <Smartphone className="w-3 h-3 inline mr-1" /> : <Monitor className="w-3 h-3 inline mr-1" />}
            {currentBranch !== 'main' ? `Branch: ${currentBranch}` : 'Main conversation'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {branches.length > 1 && (
          <button
            onClick={() => setShowBranches(!showBranches)}
            className="p-2 hover:bg-white hover:bg-opacity-50 rounded-full transition-colors"
            title="Conversation branches"
          >
            <GitBranch className="w-4 h-4 text-gray-600" />
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-50 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );

  const renderBranchSelector = () => {
    if (!showBranches || branches.length <= 1) return null;

    return (
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center space-x-2 text-sm">
          <GitBranch className="w-4 h-4 text-blue-600" />
          <span className="text-blue-700 font-medium">Branches:</span>
          {branches.map(branchId => (
            <button
              key={branchId}
              onClick={() => switchBranch(branchId)}
              className={`px-2 py-1 rounded ${
                branchId === currentBranch
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-blue-600 hover:bg-blue-100'
              }`}
            >
              {branchId === 'main' ? 'Main' : branchId.split('-')[1]}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderWelcomeMessage = () => (
    <div className="text-center text-gray-500 py-8">
      <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
      <p className="mb-2 font-medium">Hi! I'm Bolt, your AI assistant for Stripe and SaaS workflows.</p>
      <p className="text-sm mb-4">I can help you with:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm max-w-md mx-auto">
        <div className="bg-blue-50 p-2 rounded">• Stripe API integration</div>
        <div className="bg-green-50 p-2 rounded">• Payment processing</div>
        <div className="bg-purple-50 p-2 rounded">• Subscription management</div>
        <div className="bg-yellow-50 p-2 rounded">• SaaS best practices</div>
      </div>
      {showRecommendations && (
        <div className="mt-6">
          <PredictiveRecommendations
            tenantId={tenantId}
            userId={userId}
            className="max-w-md mx-auto"
          />
        </div>
      )}
    </div>
  );

  const chatLayout = isMobile ? 'flex flex-col h-full' : 'grid grid-cols-1 lg:grid-cols-4 gap-4 h-full';
  const messagesLayout = isMobile ? 'flex-1' : 'lg:col-span-3';
  const sidebarLayout = isMobile ? '' : 'lg:col-span-1';

  return (
    <div className={`${chatLayout} bg-white border border-gray-200 rounded-lg shadow-lg ${className}`}>
      {/* Main Chat Area */}
      <div className={`${messagesLayout} flex flex-col`}>
        {renderHeader()}
        {renderBranchSelector()}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {state.messages.length === 0 && renderWelcomeMessage()}

          {state.messages.map((message) => (
            <div
              key={message.id}
              className={`group flex items-start space-x-3 ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div
                className={`flex-1 px-4 py-3 rounded-lg max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatMessageContent(message.content),
                  }}
                  className="whitespace-pre-wrap break-words"
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs opacity-70">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </div>
                  {getMessageActions(message)}
                </div>
              </div>
            </div>
          ))}

          {typingIndicator && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 px-4 py-3 rounded-lg bg-gray-100 max-w-[85%]">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-gray-600 text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Validation Feedback */}
        <div className="px-4">
          <RealtimeValidation
            input={inputMessage}
            onValidationResult={setValidationResult}
          />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about Stripe, payments, or SaaS workflows..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[40px] max-h-[120px]"
              disabled={state.isLoading || !state.sessionId}
              rows={1}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || state.isLoading || !state.sessionId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Sidebar for Recommendations (Desktop only) */}
      {!isMobile && showRecommendations && (
        <div className={`${sidebarLayout} border-l border-gray-200 p-4 bg-gray-50`}>
          <PredictiveRecommendations
            tenantId={tenantId}
            userId={userId}
            className="sticky top-4"
          />
        </div>
      )}
    </div>
  );
}

export default function EnhancedChatInterface(props: EnhancedChatInterfaceProps) {
  return (
    <ConversationProvider>
      <EnhancedChatContent {...props} />
    </ConversationProvider>
  );
}