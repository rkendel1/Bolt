'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Users,
  TrendingUp,
  Activity,
  AlertTriangle,
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Bell
} from 'lucide-react';
import AnalyticsOverview from './AnalyticsOverview';

interface SaaSAnalyticsDashboardProps {
  tenantId: string;
  className?: string;
}

interface SaaSMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  ltv: number;
  cac: number;
  arpu: number;
  totalCustomers: number;
  activeUsers: number;
  usageGrowth: number;
  revenueGrowth: number;
}

interface AnalyticsData {
  saas: SaaSMetrics;
  usage: {
    totalApiCalls: number;
    totalEvents: number;
    topFeatures: Array<{
      name: string;
      usage: number;
      growth: number;
    }>;
    topUsers: Array<{
      userId: string;
      eventCount: number;
    }>;
  };
  summary: {
    mrr: number;
    totalCustomers: number;
    activeUsers: number;
    churnRate: number;
    revenueGrowth: number;
    usageGrowth: number;
  };
}

export default function SaaSAnalyticsDashboard({ tenantId, className = '' }: SaaSAnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'revenue' | 'optimization' | 'alerts'>('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [tenantId, dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/metrics?tenantId=${tenantId}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color: string;
    description?: string;
  }> = ({ title, value, change, icon, color, description }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
          {change !== undefined && (
            <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(change)} from last period
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SaaS Analytics Dashboard</h2>
          <p className="text-gray-600">Monitor your SaaS metrics, usage patterns, and growth</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'usage', label: 'Usage Analytics', icon: Activity },
            { id: 'revenue', label: 'Revenue', icon: DollarSign },
            { id: 'optimization', label: 'Optimization', icon: TrendingUp },
            { id: 'alerts', label: 'Alerts & Reports', icon: Bell },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && data && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Monthly Recurring Revenue"
              value={formatCurrency(data.saas.mrr)}
              change={data.saas.revenueGrowth}
              icon={<DollarSign className="w-6 h-6 text-white" />}
              color="bg-green-500"
              description="MRR"
            />
            <MetricCard
              title="Total Customers"
              value={data.saas.totalCustomers.toLocaleString()}
              icon={<Users className="w-6 h-6 text-white" />}
              color="bg-blue-500"
            />
            <MetricCard
              title="Active Users"
              value={data.saas.activeUsers.toLocaleString()}
              change={data.saas.usageGrowth}
              icon={<Activity className="w-6 h-6 text-white" />}
              color="bg-purple-500"
            />
            <MetricCard
              title="Churn Rate"
              value={formatPercentage(data.saas.churnRate * 100)}
              icon={<AlertTriangle className="w-6 h-6 text-white" />}
              color="bg-red-500"
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Customer Lifetime Value"
              value={formatCurrency(data.saas.ltv)}
              icon={<TrendingUp className="w-6 h-6 text-white" />}
              color="bg-indigo-500"
              description="LTV"
            />
            <MetricCard
              title="Customer Acquisition Cost"
              value={formatCurrency(data.saas.cac)}
              icon={<DollarSign className="w-6 h-6 text-white" />}
              color="bg-orange-500"
              description="CAC"
            />
            <MetricCard
              title="Average Revenue Per User"
              value={formatCurrency(data.saas.arpu)}
              icon={<Users className="w-6 h-6 text-white" />}
              color="bg-pink-500"
              description="ARPU"
            />
          </div>

          {/* Usage Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Top Features</h3>
                <PieChart className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                {data.usage.topFeatures.slice(0, 5).map((feature, index) => (
                  <div key={feature.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full bg-blue-${500 + index * 100}`}></div>
                      <span className="text-sm font-medium text-gray-900">{feature.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {feature.usage.toLocaleString()}
                      </div>
                      <div className={`text-xs ${feature.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(feature.growth)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Top Users</h3>
                <Users className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                {data.usage.topUsers.slice(0, 5).map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {user.userId.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {user.userId.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.eventCount.toLocaleString()} events
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Usage Analytics</h3>
            <LineChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Usage analytics charts will be implemented here</p>
              <p className="text-sm">Track API calls, feature usage, and user behavior patterns</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Revenue Analytics</h3>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Revenue charts and trends will be implemented here</p>
              <p className="text-sm">MRR/ARR trends, cohort analysis, and revenue forecasting</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'optimization' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">AI-Powered Optimization</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>AI optimization recommendations will be implemented here</p>
              <p className="text-sm">Tier pricing suggestions, churn risk alerts, and upsell opportunities</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <AnalyticsOverview tenantId={tenantId} />
      )}
    </div>
  );
}