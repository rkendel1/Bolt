'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bell,
  Download,
  FileText,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  CheckCircle,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

interface Alert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, any>;
}

interface AlertsData {
  alerts: Alert[];
  stats: {
    total: number;
    unread: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  summary: {
    total: number;
    unread: number;
    critical: number;
    high: number;
  };
}

interface AnalyticsOverviewProps {
  tenantId: string;
  className?: string;
}

export default function AnalyticsOverview({ tenantId, className = '' }: AnalyticsOverviewProps) {
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'alerts' | 'reports' | 'insights'>('alerts');
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    loadAlertsData();
  }, [tenantId]);

  const loadAlertsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/alerts?tenantId=${tenantId}&action=list`);
      if (response.ok) {
        const data = await response.json();
        setAlertsData(data);
      }
    } catch (error) {
      console.error('Failed to load alerts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (alertId: string) => {
    try {
      const response = await fetch('/api/analytics/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          alertId,
        }),
      });

      if (response.ok) {
        await loadAlertsData();
      }
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/analytics/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss',
          alertId,
        }),
      });

      if (response.ok) {
        await loadAlertsData();
      }
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const generateReport = async (reportType: string) => {
    try {
      setGeneratingReport(true);
      
      const response = await fetch('/api/analytics/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          reportType,
          format: 'json',
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create and download the report
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_${tenantId}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'usage_threshold': return <Activity className="w-4 h-4" />;
      case 'churn_risk': return <Users className="w-4 h-4" />;
      case 'upsell_opportunity': return <TrendingUp className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Analytics Overview</h2>
          <p className="text-gray-600">Monitor alerts, generate reports, and get insights</p>
        </div>
        
        {alertsData && alertsData.summary.unread > 0 && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-800 rounded-full">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">
              {alertsData.summary.unread} unread alert{alertsData.summary.unread !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'alerts', label: 'Alerts', icon: Bell },
            { id: 'reports', label: 'Reports', icon: FileText },
            { id: 'insights', label: 'Insights', icon: TrendingUp },
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
              {id === 'alerts' && alertsData?.summary.unread ? (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {alertsData.summary.unread}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'alerts' && alertsData && (
        <div className="space-y-4">
          {/* Alert Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Alerts</p>
                  <p className="text-2xl font-bold text-gray-900">{alertsData.summary.total}</p>
                </div>
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Unread</p>
                  <p className="text-2xl font-bold text-orange-600">{alertsData.summary.unread}</p>
                </div>
                <EyeOff className="w-8 h-8 text-orange-400" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-red-600">{alertsData.summary.critical}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-orange-600">{alertsData.summary.high}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </div>

          {/* Alerts List */}
          <div className="space-y-3">
            {alertsData.alerts.length === 0 ? (
              <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
                <p className="text-gray-600">Great! Everything looks good at the moment.</p>
              </div>
            ) : (
              alertsData.alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`bg-white p-4 rounded-lg border-l-4 border shadow-sm ${getSeverityColor(alert.severity)} ${
                    !alert.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getAlertTypeIcon(alert.alert_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900">{alert.title}</h4>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          {!alert.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!alert.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(alert.id)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Mark as read"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDismissAlert(alert.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Usage Report */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Usage Report</h3>
                  <p className="text-sm text-gray-600">API calls, feature usage, and user activity</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
              <button
                onClick={() => generateReport('usage_summary')}
                disabled={generatingReport}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Generate Report</span>
              </button>
            </div>

            {/* Revenue Report */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Revenue Report</h3>
                  <p className="text-sm text-gray-600">MRR, ARR, churn, and growth metrics</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
              <button
                onClick={() => generateReport('revenue_summary')}
                disabled={generatingReport}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Generate Report</span>
              </button>
            </div>

            {/* Customer Report */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Customer Report</h3>
                  <p className="text-sm text-gray-600">User behavior and engagement analysis</p>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
              <button
                onClick={() => generateReport('customer_analytics')}
                disabled={generatingReport}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Generate Report</span>
              </button>
            </div>

            {/* Comprehensive Report */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 md:col-span-2 lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Comprehensive Report</h3>
                  <p className="text-sm text-gray-600">Complete analytics package with usage, revenue, and customer data</p>
                </div>
                <FileText className="w-8 h-8 text-indigo-500" />
              </div>
              <button
                onClick={() => generateReport('comprehensive')}
                disabled={generatingReport}
                className="flex items-center justify-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{generatingReport ? 'Generating...' : 'Generate Comprehensive Report'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">AI Insights Coming Soon</h3>
            <p className="text-gray-600">
              Advanced AI-powered insights will provide actionable recommendations
              for pricing optimization, churn prevention, and growth strategies.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}