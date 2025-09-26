'use client';

import React, { useState } from 'react';
import { Bot, MessageSquare, Settings, Zap, Shield, Code, Users, BarChart3, ArrowRight, Play } from 'lucide-react';
import ChatInterface from '@/components/chatbot/ChatInterface';
import EnhancedChatInterface from '@/components/chatbot/EnhancedChatInterface';
import MobileOptimizedChat from '@/components/chatbot/MobileOptimizedChat';
import Dashboard from '@/components/dashboard/Dashboard';
import ChatDashboardIntegration from '@/components/dashboard/ChatDashboardIntegration';

export default function Home() {
  const [showChat, setShowChat] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showEnhancedChat, setShowEnhancedChat] = useState(false);
  const [showChatDashboard, setShowChatDashboard] = useState(false);
  
  // Demo data - in real app, this would come from authentication
  const demoTenantId = 'demo-tenant-123';
  const demoUserId = 'demo-user-456';

  const features = [
    {
      icon: <Bot className="w-6 h-6" />,
      title: 'AI-Powered Assistance',
      description: 'Natural language processing helps users navigate complex Stripe APIs and SaaS workflows with ease.'
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: 'Stripe Integration',
      description: 'Complete knowledge base of Stripe APIs with code examples, best practices, and troubleshooting guides.'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Multi-Tenant Support',
      description: 'Built for SaaS platforms with tenant isolation, customizable branding, and role-based access.'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Security First',
      description: 'Enterprise-grade security with encrypted conversations, audit logs, and compliance features.'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Workflow Automation',
      description: 'Guided workflows for common tasks like onboarding, payment setup, and subscription management.'
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Analytics & Insights',
      description: 'Track user interactions, identify common issues, and optimize the support experience.'
    }
  ];

  const useCases = [
    {
      title: 'SaaS Onboarding',
      description: 'Guide new customers through payment setup, subscription creation, and account configuration.'
    },
    {
      title: 'Developer Support',
      description: 'Help developers integrate Stripe APIs with code examples and troubleshooting assistance.'
    },
    {
      title: 'Customer Success',
      description: 'Provide self-service support for billing questions, plan changes, and account management.'
    },
    {
      title: 'Internal Training',
      description: 'Train your team on Stripe features, best practices, and platform workflows.'
    }
  ];

  if (showDashboard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Bot className="w-8 h-8 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Bolt AI</h1>
              </div>
              <button
                onClick={() => setShowDashboard(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Back to Home
              </button>
            </div>
          </div>
        </nav>
        <Dashboard tenantId={demoTenantId} userId={demoUserId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Bot className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Bolt</h1>
              <span className="text-sm text-gray-500">AI Chatbot for SaaS</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowDashboard(true)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => setShowChat(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Try Demo</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              AI Chatbot for
              <span className="text-blue-600"> SaaS Creators</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
              Standalone, reusable AI chatbot that guides SaaS creators through Stripe integration 
              and platform workflows via natural language. Plug-and-play for any application.
            </p>
            <div className="mt-10 flex items-center justify-center space-x-6">
              <button
                onClick={() => setShowEnhancedChat(true)}
                className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="w-5 h-5" />
                <span>Try Enhanced Demo</span>
              </button>
              <button
                onClick={() => setShowChatDashboard(true)}
                className="flex items-center space-x-2 px-8 py-3 bg-white text-gray-900 text-lg font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <span>View Analytics Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Key Features</h2>
            <p className="mt-4 text-lg text-gray-600">
              Everything you need to provide intelligent support for your SaaS platform
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                </div>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Use Cases</h2>
            <p className="mt-4 text-lg text-gray-600">
              Accelerate onboarding and reduce support burden across multiple scenarios
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <div key={index} className="p-6 bg-white rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{useCase.title}</h3>
                <p className="text-gray-600">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your SaaS Support?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Get started with Bolt AI today and provide your users with intelligent, 
            context-aware assistance for all their Stripe and platform needs.
          </p>
          <button
            onClick={() => setShowChat(true)}
            className="px-8 py-3 bg-white text-blue-600 text-lg font-medium rounded-lg hover:bg-gray-100 transition-colors"
          >
            Start Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Bot className="w-8 h-8 text-blue-400" />
              <span className="text-xl font-bold">Bolt AI</span>
            </div>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-white">Documentation</a>
              <a href="#" className="text-gray-400 hover:text-white">API</a>
              <a href="#" className="text-gray-400 hover:text-white">Support</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2024 Bolt AI. All rights reserved. Built for SaaS creators everywhere.</p>
          </div>
        </div>
      </footer>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl h-[80vh] mx-4">
            <ChatInterface
              tenantId={demoTenantId}
              userId={demoUserId}
              onClose={() => setShowChat(false)}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* Enhanced Chat Modal */}
      {showEnhancedChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-6xl h-[85vh] mx-4">
            <EnhancedChatInterface
              tenantId={demoTenantId}
              userId={demoUserId}
              onClose={() => setShowEnhancedChat(false)}
              showRecommendations={true}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* Chat Dashboard Modal */}
      {showChatDashboard && (
        <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
          <div className="min-h-screen">
            <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center space-x-4">
                    <Bot className="w-8 h-8 text-blue-600" />
                    <h1 className="text-xl font-bold text-gray-900">Bolt AI Analytics</h1>
                  </div>
                  <button
                    onClick={() => setShowChatDashboard(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    ← Back to Home
                  </button>
                </div>
              </div>
            </nav>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <ChatDashboardIntegration
                tenantId={demoTenantId}
                userId={demoUserId}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Optimized Chat */}
      <MobileOptimizedChat
        tenantId={demoTenantId}
        userId={demoUserId}
        isOpen={showEnhancedChat}
        onToggle={() => setShowEnhancedChat(!showEnhancedChat)}
      />
    </div>
  );
}
