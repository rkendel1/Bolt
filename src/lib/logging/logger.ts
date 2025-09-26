import winston from 'winston';
import { supabaseAdmin } from '../supabase/client';
import { LogEntry } from '@/types';

// Winston logger configuration
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bolt-ai-chatbot' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Enhanced logger with Supabase integration
export class BoltLogger {
  private static instance: BoltLogger;

  private constructor() {}

  public static getInstance(): BoltLogger {
    if (!BoltLogger.instance) {
      BoltLogger.instance = new BoltLogger();
    }
    return BoltLogger.instance;
  }

  async log(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata?: Record<string, any>,
    context?: {
      userId?: string;
      tenantId?: string;
      sessionId?: string;
    }
  ) {
    // Log to Winston
    logger.log(level, message, { ...metadata, ...context });

    // Log to Supabase for persistence and analytics
    try {
      const logEntry: Omit<LogEntry, 'id'> = {
        level,
        message,
        metadata,
        user_id: context?.userId,
        tenant_id: context?.tenantId,
        session_id: context?.sessionId,
        timestamp: new Date().toISOString(),
      };

      await supabaseAdmin
        .from('logs')
        .insert([logEntry]);
    } catch (error) {
      // Fallback to console if Supabase logging fails
      console.error('Failed to log to Supabase:', error);
    }
  }

  async info(
    message: string,
    metadata?: Record<string, any>,
    context?: { userId?: string; tenantId?: string; sessionId?: string }
  ) {
    await this.log('info', message, metadata, context);
  }

  async warn(
    message: string,
    metadata?: Record<string, any>,
    context?: { userId?: string; tenantId?: string; sessionId?: string }
  ) {
    await this.log('warn', message, metadata, context);
  }

  async error(
    message: string,
    metadata?: Record<string, any>,
    context?: { userId?: string; tenantId?: string; sessionId?: string }
  ) {
    await this.log('error', message, metadata, context);
  }

  async debug(
    message: string,
    metadata?: Record<string, any>,
    context?: { userId?: string; tenantId?: string; sessionId?: string }
  ) {
    await this.log('debug', message, metadata, context);
  }

  // Get logs for analytics and monitoring
  async getLogs(filters?: {
    tenantId?: string;
    userId?: string;
    level?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    let query = supabaseAdmin
      .from('logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (filters?.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters?.level) {
      query = query.eq('level', filters.level);
    }
    if (filters?.startDate) {
      query = query.gte('timestamp', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('timestamp', filters.endDate);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch logs: ${error.message}`);
    }

    return data;
  }
}

export const boltLogger = BoltLogger.getInstance();