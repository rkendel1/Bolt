'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import EnhancedChatInterface from './EnhancedChatInterface';

interface MobileOptimizedChatProps {
  tenantId: string;
  userId: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export default function MobileOptimizedChat({
  tenantId,
  userId,
  isOpen,
  onToggle,
  className = ''
}: MobileOptimizedChatProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) {
    // Floating chat button
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={onToggle}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  if (isMobile) {
    // Full-screen mobile chat
    return (
      <div className="fixed inset-0 z-50 bg-white">
        {isMinimized ? (
          // Minimized state - header only
          <div className="flex items-center justify-between p-4 bg-blue-600 text-white">
            <h3 className="font-semibold">Bolt AI Assistant</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(false)}
                className="p-2 hover:bg-blue-700 rounded-full"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={onToggle}
                className="p-2 hover:bg-blue-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          // Full mobile chat
          <div className="h-full flex flex-col">
            {/* Mobile header */}
            <div className="flex items-center justify-between p-4 bg-blue-600 text-white">
              <h3 className="font-semibold">Bolt AI Assistant</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-2 hover:bg-blue-700 rounded-full"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onToggle}
                  className="p-2 hover:bg-blue-700 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Chat interface */}
            <div className="flex-1">
              <EnhancedChatInterface
                tenantId={tenantId}
                userId={userId}
                isMobile={true}
                showRecommendations={true}
                className="h-full rounded-none border-none"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop modal chat
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-6xl h-[80vh] mx-4 relative">
        {isMinimized ? (
          // Minimized desktop state
          <div className="absolute bottom-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[300px]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Bolt AI Assistant</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMinimized(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onToggle}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Full desktop chat
          <EnhancedChatInterface
            tenantId={tenantId}
            userId={userId}
            onClose={onToggle}
            isMobile={false}
            showRecommendations={true}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}