import { KnowledgeBaseEntry } from '@/types';

export const bestPracticesKnowledge: Omit<KnowledgeBaseEntry, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    type: 'faq',
    title: 'SaaS Security Best Practices',
    content: `**Essential Security Practices for SaaS Applications**

**Authentication & Authorization:**

**1. Multi-Factor Authentication (MFA)**
\`\`\`javascript
// Implement MFA for admin accounts
const requireMFA = (roles) => {
  return (req, res, next) => {
    if (roles.includes(req.user.role) && !req.user.mfa_verified) {
      return res.status(403).json({ 
        error: 'MFA required for this action',
        mfa_setup_url: '/auth/mfa/setup'
      });
    }
    next();
  };
};
\`\`\`

**2. Role-Based Access Control (RBAC)**
\`\`\`javascript
const permissions = {
  'admin': ['*'],
  'owner': ['tenant:*', 'user:*', 'billing:*'],
  'member': ['user:read', 'user:update_own'],
  'viewer': ['user:read']
};

const hasPermission = (userRole, resource, action) => {
  const userPerms = permissions[userRole] || [];
  const requiredPerm = \`\${resource}:\${action}\`;
  
  return userPerms.includes('*') || 
         userPerms.includes(\`\${resource}:*\`) || 
         userPerms.includes(requiredPerm);
};
\`\`\`

**3. JWT Token Security**
\`\`\`javascript
const secureJWTConfig = {
  algorithm: 'RS256', // Use RSA, not HMAC
  expiresIn: '15m',   // Short-lived access tokens
  issuer: 'your-saas-app',
  audience: 'your-saas-users'
};

// Implement token refresh
const refreshToken = async (req, res) => {
  const { refresh_token } = req.body;
  
  try {
    const decoded = jwt.verify(refresh_token, REFRESH_SECRET);
    const newAccessToken = generateAccessToken(decoded.userId);
    
    res.json({ access_token: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};
\`\`\`

**Data Protection:**

**1. Data Encryption**
\`\`\`javascript
// Encrypt sensitive data at rest
const crypto = require('crypto');

const encrypt = (text, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-gcm', key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Use for PII data
const encryptedSSN = encrypt(user.ssn, process.env.ENCRYPTION_KEY);
\`\`\`

**2. Input Validation and Sanitization**
\`\`\`javascript
const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(50).required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])')).required()
});

const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
};
\`\`\`

**3. SQL Injection Prevention**
\`\`\`javascript
// Always use parameterized queries
const getUserByEmail = async (email) => {
  // ✅ Safe - parameterized query
  const query = 'SELECT * FROM users WHERE email = $1';
  return await db.query(query, [email]);
  
  // ❌ Dangerous - SQL injection vulnerable
  // const query = \`SELECT * FROM users WHERE email = '\${email}'\`;
};
\`\`\`

**API Security:**

**1. Rate Limiting**
\`\`\`javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to API routes
app.use('/api/', apiLimiter);
\`\`\`

**2. CORS Configuration**
\`\`\`javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 24 * 60 * 60 // 24 hours
};

app.use(cors(corsOptions));
\`\`\`

**3. API Key Management**
\`\`\`javascript
const generateAPIKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

const validateAPIKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  const keyRecord = await db.query(
    'SELECT * FROM api_keys WHERE key_hash = $1 AND active = true',
    [crypto.createHash('sha256').update(apiKey).digest('hex')]
  );
  
  if (!keyRecord.rows.length) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  req.apiKey = keyRecord.rows[0];
  next();
};
\`\`\`

**Stripe Security:**

**1. Webhook Signature Verification**
\`\`\`javascript
const verifyStripeWebhook = (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(\`Webhook signature verification failed: \${err.message}\`);
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }
  
  req.stripeEvent = event;
  next();
};
\`\`\`

**2. PCI Compliance**
- Never store card numbers, CVV, or expiry dates
- Use Stripe Elements for card collection
- Implement strong customer authentication (SCA)
- Maintain PCI DSS compliance if storing cardholder data

**Monitoring & Incident Response:**

**1. Security Logging**
\`\`\`javascript
const securityLogger = {
  logFailedLogin: (email, ip) => {
    console.log(JSON.stringify({
      event: 'failed_login',
      email,
      ip,
      timestamp: new Date().toISOString()
    }));
  },
  
  logSuspiciousActivity: (userId, activity, details) => {
    console.log(JSON.stringify({
      event: 'suspicious_activity',
      user_id: userId,
      activity,
      details,
      timestamp: new Date().toISOString()
    }));
  }
};
\`\`\`

**2. Vulnerability Scanning**
- Use tools like npm audit, Snyk, or OWASP ZAP
- Implement dependency scanning in CI/CD
- Regular penetration testing
- Bug bounty programs for critical applications

**Compliance Considerations:**
- **GDPR**: Data portability, right to erasure, consent management
- **SOC 2**: Controls for security, availability, processing integrity
- **HIPAA**: If handling health information
- **CCPA**: California consumer privacy rights

**Security Checklist:**
- [ ] HTTPS everywhere with proper certificates
- [ ] Secure headers (HSTS, CSP, X-Frame-Options)
- [ ] Regular security updates and patches
- [ ] Backup and disaster recovery plans
- [ ] Employee security training
- [ ] Incident response procedures
- [ ] Regular security audits and reviews`,
    tags: ['security', 'best-practices', 'authentication', 'encryption', 'compliance'],
    category: 'security',
    metadata: {
      security_level: 'critical',
      compliance_frameworks: ['GDPR', 'SOC2', 'PCI-DSS']
    }
  },
  {
    type: 'faq',
    title: 'SaaS Performance Optimization',
    content: `**Performance Best Practices for SaaS Applications**

**Database Optimization:**

**1. Query Optimization**
\`\`\`sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_users_tenant_id ON users(tenant_id);
CREATE INDEX CONCURRENTLY idx_subscriptions_status ON subscriptions(status) WHERE status IN ('active', 'trialing');

-- Use composite indexes for multi-column queries
CREATE INDEX CONCURRENTLY idx_events_tenant_created ON events(tenant_id, created_at DESC);
\`\`\`

**2. Connection Pooling**
\`\`\`javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 2000, // 2 seconds
});
\`\`\`

**3. Read Replicas**
\`\`\`javascript
const readDB = new Pool({ /* read replica config */ });
const writeDB = new Pool({ /* primary database config */ });

const getUsers = async (tenantId) => {
  // Use read replica for queries
  return await readDB.query('SELECT * FROM users WHERE tenant_id = $1', [tenantId]);
};

const createUser = async (userData) => {
  // Use primary for writes
  return await writeDB.query('INSERT INTO users ...', [userData]);
};
\`\`\`

**Caching Strategies:**

**1. Redis Caching**
\`\`\`javascript
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

const cacheGet = async (key) => {
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

const cacheSet = async (key, value, expiration = 3600) => {
  try {
    await client.setex(key, expiration, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
};
\`\`\`

**2. Application-Level Caching**
\`\`\`javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ 
  stdTTL: 600, // 10 minutes default
  checkperiod: 120 // check for expired keys every 2 minutes
});

const getCachedUser = async (userId) => {
  const cacheKey = \`user:\${userId}\`;
  let user = cache.get(cacheKey);
  
  if (!user) {
    user = await db.getUserById(userId);
    cache.set(cacheKey, user, 300); // 5 minutes
  }
  
  return user;
};
\`\`\`

**3. CDN and Static Asset Optimization**
\`\`\`javascript
// Next.js optimization
module.exports = {
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
\`\`\`

**API Performance:**

**1. Pagination**
\`\`\`javascript
const getPaginatedResults = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100
  const offset = (page - 1) * limit;
  
  const [results, total] = await Promise.all([
    db.query(
      'SELECT * FROM items WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.tenantId, limit, offset]
    ),
    db.query('SELECT COUNT(*) FROM items WHERE tenant_id = $1', [req.tenantId])
  ]);
  
  res.json({
    data: results.rows,
    pagination: {
      page,
      limit,
      total: parseInt(total.rows[0].count),
      pages: Math.ceil(total.rows[0].count / limit)
    }
  });
};
\`\`\`

**2. Response Compression**
\`\`\`javascript
const compression = require('compression');

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));
\`\`\`

**3. Request Batching**
\`\`\`javascript
// GraphQL-style batching for REST APIs
const batchRequests = async (requests) => {
  const results = await Promise.all(
    requests.map(async (req) => {
      try {
        return await processRequest(req);
      } catch (error) {
        return { error: error.message };
      }
    })
  );
  
  return results;
};

app.post('/api/batch', async (req, res) => {
  const { requests } = req.body;
  const results = await batchRequests(requests);
  res.json({ results });
});
\`\`\`

**Frontend Optimization:**

**1. Code Splitting**
\`\`\`javascript
// Dynamic imports for route-based splitting
const DashboardPage = dynamic(() => import('../components/Dashboard'), {
  loading: () => <div>Loading...</div>,
});

// Feature-based splitting
const AdvancedFeature = dynamic(
  () => import('../components/AdvancedFeature'),
  { ssr: false } // Client-side only
);
\`\`\`

**2. State Management Optimization**
\`\`\`javascript
// Use React Query for server state
const useUsers = (tenantId) => {
  return useQuery(
    ['users', tenantId],
    () => fetchUsers(tenantId),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    }
  );
};
\`\`\`

**Monitoring and Metrics:**

**1. Application Performance Monitoring**
\`\`\`javascript
const performanceMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(\`Slow request: \${req.method} \${req.path} - \${duration}ms\`);
    }
    
    // Send metrics to monitoring service
    metrics.timing('http.request.duration', duration, {
      method: req.method,
      route: req.path,
      status: res.statusCode
    });
  });
  
  next();
};
\`\`\`

**2. Database Query Monitoring**
\`\`\`javascript
const monitorQuery = (query, params) => {
  const start = Date.now();
  
  return db.query(query, params).then(result => {
    const duration = Date.now() - start;
    
    if (duration > 500) {
      console.warn(\`Slow query (\${duration}ms): \${query}\`);
    }
    
    return result;
  });
};
\`\`\`

**Performance Testing:**

**Load Testing with Artillery**
\`\`\`yaml
config:
  target: 'https://your-saas-app.com'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
      
scenarios:
  - name: "User flow"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password"
      - get:
          url: "/api/dashboard"
\`\`\`

**Performance Budget:**
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- First Input Delay: < 100ms
- Cumulative Layout Shift: < 0.1
- Time to Interactive: < 3.5s

**Optimization Checklist:**
- [ ] Database indexes on all query columns
- [ ] Caching layer implemented
- [ ] CDN for static assets
- [ ] Image optimization and lazy loading
- [ ] Code splitting and tree shaking
- [ ] Compression enabled
- [ ] Performance monitoring in place
- [ ] Regular performance audits`,
    tags: ['performance', 'optimization', 'caching', 'database', 'monitoring'],
    category: 'performance',
    metadata: {
      performance_impact: 'high',
      implementation_priority: 'high'
    }
  },
  {
    type: 'tutorial',
    title: 'SaaS Error Handling and Recovery',
    content: `**Comprehensive Error Handling for SaaS Applications**

**Error Classification:**

**1. System Errors (500-level)**
- Database connection failures
- External API timeouts
- Out of memory errors
- Unhandled exceptions

**2. Client Errors (400-level)**
- Invalid input data
- Authentication failures
- Authorization denials
- Resource not found

**3. Business Logic Errors**
- Insufficient funds
- Plan limits exceeded
- Invalid state transitions
- Workflow violations

**Error Handling Patterns:**

**1. Centralized Error Handler**
\`\`\`javascript
const errorHandler = (err, req, res, next) => {
  // Log error with context
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user_id: req.user?.id,
    tenant_id: req.tenant?.id,
    correlation_id: req.correlationId
  });
  
  // Handle different error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.details,
      code: 'VALIDATION_ERROR'
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Access denied',
      code: 'ACCESS_DENIED'
    });
  }
  
  // Don't leak internal errors to client
  res.status(500).json({
    error: 'An internal error occurred',
    code: 'INTERNAL_ERROR',
    correlation_id: req.correlationId
  });
};

app.use(errorHandler);
\`\`\`

**2. Custom Error Classes**
\`\`\`javascript
class AppError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class BusinessLogicError extends AppError {
  constructor(message, code) {
    super(message, 422, code);
  }
}

// Usage
const createUser = async (userData) => {
  if (!userData.email) {
    throw new ValidationError('Email is required', { field: 'email' });
  }
  
  if (await emailExists(userData.email)) {
    throw new BusinessLogicError('Email already exists', 'EMAIL_EXISTS');
  }
  
  // ... create user logic
};
\`\`\`

**3. Async Error Handling**
\`\`\`javascript
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage
app.get('/api/users/:id', asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  
  res.json(user);
}));
\`\`\`

**Circuit Breaker Pattern:**

\`\`\`javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000, monitor = false) {
    this.threshold = threshold; // Failure threshold
    this.timeout = timeout; // Recovery timeout
    this.monitor = monitor;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
  }
  
  async call(fn, ...args) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage
const stripeBreaker = new CircuitBreaker(3, 30000);

const createStripeCustomer = async (customerData) => {
  return await stripeBreaker.call(
    stripe.customers.create.bind(stripe.customers),
    customerData
  );
};
\`\`\`

**Retry Mechanisms:**

**1. Exponential Backoff**
\`\`\`javascript
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000; // Add jitter
      
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
};
\`\`\`

**2. Queue-Based Retry**
\`\`\`javascript
const Bull = require('bull');
const emailQueue = new Bull('email queue');

emailQueue.process(async (job) => {
  const { to, subject, body } = job.data;
  
  try {
    await sendEmail(to, subject, body);
  } catch (error) {
    if (job.attemptsMade < 3) {
      throw error; // Will trigger retry
    }
    
    // Final failure - log and notify
    logger.error('Email failed after all retries', { to, error: error.message });
    await notifyAdmins('Email delivery failed', { to, error: error.message });
  }
});

// Add job with retry options
emailQueue.add('send-email', emailData, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
});
\`\`\`

**Database Error Recovery:**

**1. Connection Pooling with Retry**
\`\`\`javascript
const { Pool } = require('pg');

const pool = new Pool({
  // ... connection config
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const queryWithRetry = async (query, params, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await pool.query(query, params);
    } catch (error) {
      logger.warn(\`Database query attempt \${attempt} failed\`, {
        error: error.message,
        query: query.substring(0, 100)
      });
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
\`\`\`

**2. Transaction Rollback**
\`\`\`javascript
const executeTransaction = async (operations) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const operation of operations) {
      const result = await operation(client);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
\`\`\`

**Frontend Error Handling:**

**1. Error Boundaries (React)**
\`\`\`javascript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service
    logger.error('React error boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>We've been notified and are working to fix this issue.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
\`\`\`

**2. API Error Handling**
\`\`\`javascript
const apiClient = {
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new APIError(errorData.error, response.status, errorData.code);
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      // Network or parsing error
      throw new APIError('Network error occurred', 0, 'NETWORK_ERROR');
    }
  }
};

class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
\`\`\`

**Monitoring and Alerting:**

**1. Error Tracking**
\`\`\`javascript
const trackError = (error, context = {}) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION
  };
  
  // Send to monitoring service (Sentry, Bugsnag, etc.)
  monitoringService.captureException(errorData);
  
  // Store in database for analysis
  db.query(
    'INSERT INTO error_logs (message, stack, context, created_at) VALUES ($1, $2, $3, $4)',
    [error.message, error.stack, JSON.stringify(context), new Date()]
  );
};
\`\`\`

**2. Health Checks**
\`\`\`javascript
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    stripe: await checkStripe(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  };
  
  const allHealthy = Object.values(checks).every(check => 
    typeof check === 'object' ? check.status === 'healthy' : check
  );
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks
  });
});
\`\`\`

**Recovery Strategies:**
- Graceful degradation (disable non-critical features)
- Fallback mechanisms (cached data, default responses)
- Auto-scaling for resource exhaustion
- Database failover procedures
- Circuit breakers for external services

**Error Response Best Practices:**
- Consistent error format across all APIs
- Include correlation IDs for tracking
- Provide actionable error messages
- Don't expose internal system details
- Support internationalization for error messages`,
    tags: ['error-handling', 'reliability', 'monitoring', 'recovery', 'best-practices'],
    category: 'reliability',
    metadata: {
      reliability_impact: 'critical',
      complexity: 'high'
    }
  }
];

export default bestPracticesKnowledge;