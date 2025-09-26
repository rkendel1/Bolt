import { NextRequest, NextResponse } from 'next/server';
import { AlertsManager } from '@/lib/analytics/alerts-manager';
import { boltLogger } from '@/lib/logging/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const action = searchParams.get('action') || 'list';

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'list':
        const alerts = await AlertsManager.getActiveAlerts(tenantId);
        const stats = await AlertsManager.getAlertStats(tenantId);
        
        return NextResponse.json({
          alerts,
          stats,
          summary: {
            total: stats.total,
            unread: stats.unread,
            critical: stats.bySeverity.critical || 0,
            high: stats.bySeverity.high || 0,
          },
        });

      case 'stats':
        const alertStats = await AlertsManager.getAlertStats(tenantId);
        return NextResponse.json(alertStats);

      case 'generate':
        const newAlerts = await AlertsManager.generateAlerts(tenantId);
        return NextResponse.json({
          success: true,
          generated: newAlerts.length,
          alerts: newAlerts,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    await boltLogger.error('Failed to handle alerts request', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to handle alerts request' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, tenantId } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'mark_read':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID is required' },
            { status: 400 }
          );
        }
        
        const readResult = await AlertsManager.markAsRead(alertId);
        return NextResponse.json({ success: readResult });

      case 'dismiss':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID is required' },
            { status: 400 }
          );
        }
        
        const dismissResult = await AlertsManager.dismissAlert(alertId);
        return NextResponse.json({ success: dismissResult });

      case 'generate':
        if (!tenantId) {
          return NextResponse.json(
            { error: 'Tenant ID is required' },
            { status: 400 }
          );
        }
        
        const newAlerts = await AlertsManager.generateAlerts(tenantId);
        return NextResponse.json({
          success: true,
          generated: newAlerts.length,
          alerts: newAlerts,
        });

      case 'cleanup':
        await AlertsManager.cleanupExpiredAlerts();
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    await boltLogger.error('Failed to handle alerts POST request', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to handle alerts request' },
      { status: 500 }
    );
  }
}