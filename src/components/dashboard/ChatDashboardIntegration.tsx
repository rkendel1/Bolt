'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  TrendingUp, 
  Clock, 
  Users, 
  Target,
  Activity,
  BarChart3,
  Zap,
  AlertCircle
} from 'lucide-react';
import EnhancedChatInterface from '../chatbot/EnhancedChatInterface';

interface DashboardMetrics {
  totalConversations: number;
  avgResponseTime: number;
  userSatisfaction: number;
  activeUsers: number;
  commonTopics: { topic: string; count: number }[];
  conversionRate: number;
  recommendationsAccepted: number;
}

interface ChatDashboardIntegrationProps {
  tenantId: string;
  userId: string;
  className?: string;
}

export default function ChatDashboardIntegration({
  tenantId,
  userId,
  className = ''
}: ChatDashboardIntegrationProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [realTimeStats, setRealTimeStats] = useState({
    messagesPerHour: 0,
    activeConversations: 0,
    avgSessionLength: 0
  });

  useEffect(() => {
    loadDashboardMetrics();
    
    // Set up real-time updates
    const interval = setInterval(updateRealTimeStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [tenantId]);

  const loadDashboardMetrics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dashboard/chat-metrics?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRealTimeStats = async () => {
    try {
      const response = await fetch(`/api/dashboard/real-time-stats?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setRealTimeStats(data);
      }
    } catch (error) {
      console.error('Failed to update real-time stats:', error);
    }
  };

  const MetricCard = ({ 
    icon: Icon, 
    title, 
    value, 
    change, 
    trend 
  }: { 
    icon: any; 
    title: string; 
    value: string | number; 
    change?: string; 
    trend?: 'up' | 'down' | 'neutral' 
  }) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 flex items-center ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {trend === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
              {change}
            </p>
          )}
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>
  );

  const TopicsChart = ({ topics }: { topics: { topic: string; count: number }[] }) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Topics</h3>
      <div className="space-y-3">
        {topics.slice(0, 5).map((topic, index) => {
          const maxCount = Math.max(...topics.map(t => t.count));
          const percentage = (topic.count / maxCount) * 100;
          
          return (
            <div key={topic.topic}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 capitalize">{topic.topic}</span>
                <span className="text-gray-500">{topic.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const ActionableInsights = () => (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Zap className="w-5 h-5 mr-2 text-yellow-500" />
        Actionable Insights
      </h3>
      <div className="space-y-3">
        <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">High Response Time</p>
            <p className="text-xs text-yellow-700">Average response time is above target. Consider optimizing AI model configuration.</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Target className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Recommendation Success</p>
            <p className="text-xs text-green-700">Users are accepting 85% of AI recommendations. Great job!</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Growing Usage</p>
            <p className="text-xs text-blue-700">30% increase in conversations this week. Consider scaling resources.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const RealTimeIndicators = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Messages/Hour</p>
            <p className="text-2xl font-bold">{realTimeStats.messagesPerHour}</p>
          </div>
          <Activity className="w-8 h-8 text-blue-200" />
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm">Active Chats</p>
            <p className="text-2xl font-bold">{realTimeStats.activeConversations}</p>
          </div>
          <MessageSquare className="w-8 h-8 text-green-200" />
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm">Avg Session</p>
            <p className="text-2xl font-bold">{realTimeStats.avgSessionLength}m</p>
          </div>
          <Clock className="w-8 h-8 text-purple-200" />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chat Analytics Dashboard</h2>
          <p className="text-gray-600">Monitor AI chatbot performance and user engagement</p>
        </div>
        <button
          onClick={() => setShowChat(!showChat)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{showChat ? 'Hide Chat' : 'Open Chat'}</span>
        </button>
      </div>

      {/* Real-time indicators */}
      <RealTimeIndicators />

      {/* Main metrics grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            icon={MessageSquare}
            title="Total Conversations"
            value={metrics.totalConversations.toLocaleString()}
            change="+12% from last week"
            trend="up"
          />
          <MetricCard
            icon={Clock}
            title="Avg Response Time"
            value={`${metrics.avgResponseTime}s`}
            change="-5% improvement"
            trend="up"
          />
          <MetricCard
            icon={Users}
            title="Active Users"
            value={metrics.activeUsers.toLocaleString()}
            change="+8% from yesterday"
            trend="up"
          />
          <MetricCard
            icon={Target}
            title="Satisfaction Score"
            value={`${metrics.userSatisfaction}%`}
            change="+2% from last month"
            trend="up"
          />
        </div>
      )}

      {/* Detailed analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Interface */}
        {showChat && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 h-[600px]">
              <EnhancedChatInterface
                tenantId={tenantId}
                userId={userId}
                showRecommendations={false}
                className="h-full"
              />
            </div>
          </div>
        )}
        
        {/* Analytics panels */}
        <div className={`space-y-6 ${showChat ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
          {metrics?.commonTopics && <TopicsChart topics={metrics.commonTopics} />}
          <ActionableInsights />
        </div>
      </div>
    </div>
  );
}