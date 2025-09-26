import { NextRequest } from 'next/server';
import { UsageTracker } from './usage-tracker';

/**
 * Middleware to automatically track API usage
 */
export class UsageMiddleware {
  /**
   * Track an API request
   */
  static async trackRequest(
    request: NextRequest,
    tenantId?: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Skip tracking for certain endpoints
      const skipPaths = [
        '/api/analytics',
        '/favicon.ico',
        '/_next',
        '/api/health',
      ];

      const pathname = new URL(request.url).pathname;
      const shouldSkip = skipPaths.some(path => pathname.startsWith(path));

      if (shouldSkip) {
        return;
      }

      // Extract tenant and user ID from various sources if not provided
      if (!tenantId) {
        tenantId = this.extractTenantId(request);
      }

      if (!userId) {
        userId = this.extractUserId(request);
      }

      if (!tenantId) {
        return; // Can't track without tenant ID
      }

      // Track the API call
      await UsageTracker.trackApiCall(
        tenantId,
        userId,
        pathname,
        {
          ...metadata,
          method: request.method,
          userAgent: request.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      // Silently fail to avoid breaking the main request
      console.error('Usage tracking failed:', error);
    }
  }

  /**
   * Track a feature usage
   */
  static async trackFeature(
    featureName: string,
    tenantId: string,
    userId?: string,
    usageAmount = 1,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await UsageTracker.trackFeatureUsage(
        tenantId,
        featureName,
        userId,
        usageAmount,
        metadata
      );
    } catch (error) {
      console.error('Feature tracking failed:', error);
    }
  }

  /**
   * Extract tenant ID from request
   */
  private static extractTenantId(request: NextRequest): string | undefined {
    // Try query parameter first
    const { searchParams } = new URL(request.url);
    let tenantId = searchParams.get('tenantId');
    
    if (tenantId) {
      return tenantId;
    }

    // Try header
    tenantId = request.headers.get('x-tenant-id');
    if (tenantId) {
      return tenantId;
    }

    // Try to extract from path (e.g., /api/tenant/{tenantId}/...)
    const pathname = new URL(request.url).pathname;
    const tenantMatch = pathname.match(/\/tenant\/([^\/]+)/);
    if (tenantMatch) {
      return tenantMatch[1];
    }

    return undefined;
  }

  /**
   * Extract user ID from request
   */
  private static extractUserId(request: NextRequest): string | undefined {
    // Try query parameter first
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    
    if (userId) {
      return userId;
    }

    // Try header
    userId = request.headers.get('x-user-id');
    if (userId) {
      return userId;
    }

    // Try authorization header (JWT decode would be here in real app)
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      // In a real app, you'd decode the JWT here
      // For demo purposes, we'll use a mock user ID
      return 'demo-user-' + Math.random().toString(36).substr(2, 9);
    }

    return undefined;
  }

  /**
   * Create a wrapper for API routes to automatically track usage
   */
  static withUsageTracking(
    handler: (request: NextRequest, ...args: any[]) => Promise<Response>,
    options: {
      featureName?: string;
      trackingEnabled?: boolean;
    } = {}
  ) {
    return async (request: NextRequest, ...args: any[]): Promise<Response> => {
      const { featureName, trackingEnabled = true } = options;

      if (trackingEnabled) {
        // Track the API call
        await this.trackRequest(request);

        // Track feature usage if specified
        if (featureName) {
          const tenantId = this.extractTenantId(request);
          const userId = this.extractUserId(request);
          
          if (tenantId) {
            await this.trackFeature(featureName, tenantId, userId);
          }
        }
      }

      // Execute the original handler
      return handler(request, ...args);
    };
  }
}

/**
 * Helper function to create usage-tracked API routes
 */
export function withUsageTracking(
  handler: (request: NextRequest, ...args: any[]) => Promise<Response>,
  options?: {
    featureName?: string;
    trackingEnabled?: boolean;
  }
) {
  return UsageMiddleware.withUsageTracking(handler, options);
}