'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader, X } from 'lucide-react';
import { ChatMessage, ChatSession } from '@/types';
import { toast } from 'react-hot-toast';

interface ChatInterfaceProps {
  tenantId: string;
  userId: string;
  initialMessages?: ChatMessage[];
  onClose?: () => void;
  className?: string;
}

export default function ChatInterface({
  tenantId,
  userId,
  initialMessages = [],
  onClose,
  className = ''
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize chat session
    initializeSession();
  }, [tenantId, userId]);

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
      setSessionId(newSessionId);
    } catch (error) {
      toast.error('Failed to initialize chat session');
      console.error('Session initialization error:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading || !sessionId) {
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

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          content: inputMessage.trim(),
          tenantId,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const { message: assistantMessage } = await response.json();
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Message sending error:', error);
      
      // Remove the user message if sending failed
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as any);
    }
  };

  const formatMessageContent = (content: string) => {
    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const escapedContent = escapeHtml(content);
    
    // Simple formatting for code blocks and links
    return escapedContent
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  };

  return (
    <div className={`flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Bolt AI Assistant</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="mb-2">Hi! I'm Bolt, your AI assistant for Stripe and SaaS workflows.</p>
            <p className="text-sm">Ask me about:</p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• Stripe API integration</li>
              <li>• Payment processing</li>
              <li>• Subscription management</li>
              <li>• SaaS best practices</li>
            </ul>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
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
              className={`flex-1 px-4 py-2 rounded-lg max-w-[80%] ${
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
              <div className="text-xs opacity-70 mt-1">
                {new Date(message.created_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Bot className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 px-4 py-2 rounded-lg bg-gray-100 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
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
            disabled={isLoading || !sessionId}
            rows={1}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || !sessionId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}