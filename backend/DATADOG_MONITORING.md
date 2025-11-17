# Datadog Monitoring & Alerting Configuration

## Overview
This document provides complete Datadog setup for monitoring the Identity Service backend.

---

## 1. Datadog Installation & Setup

### Install Datadog APM Agent
```bash
# Add Datadog npm package
npm install --save-dev @datadog/browser-rum
npm install dd-trace
```

### Initialize Datadog in Application
```typescript
// src/config/datadog.ts
import tracer from 'dd-trace';

export function initializeDatadog() {
    // Initialize DD Trace for APM
    tracer.init({
        service: 'identity-service',
        env: process.env.NODE_ENV,
        version: process.env.APP_VERSION,
        logInjection: true,
        analytics: true
    });

    console.log('Datadog APM initialized');
}

// src/main.ts - Call at application startup
import { initializeDatadog } from './config/datadog';
initializeDatadog();
```

### Environment Variables for Datadog
```env
# .env
DATADOG_SITE=datadoghq.com
DATADOG_API_KEY=<your-api-key>
DATADOG_APP_ID=<your-app-id>
DATADOG_CLIENT_TOKEN=<your-client-token>
DD_ENV=production
DD_SERVICE=identity-service
DD_VERSION=1.0.0
```

---

## 2. Metrics to Monitor

### Performance Metrics
```yaml
Metrics:
  - name: request_latency
    description: HTTP request latency in milliseconds
    units: ms
    percentiles: [p50, p95, p99]
    alert_threshold: p99 > 1000ms

  - name: request_count
    description: Total number of HTTP requests
    units: count
    tags: [method, path, status]

  - name: error_rate
    description: Percentage of failed requests (4xx, 5xx)
    units: percent
    alert_threshold: > 5%

  - name: token_generation_time
    description: Time to generate OAuth tokens
    units: ms
    alert_threshold: > 200ms

  - name: database_query_time
    description: Database query execution time
    units: ms
    percentiles: [p50, p95, p99]
    alert_threshold: p99 > 500ms

  - name: database_connection_pool_usage
    description: Percentage of database connections in use
    units: percent
    alert_threshold: > 90%

  - name: redis_cache_hit_ratio
    description: Cache hit ratio for Redis operations
    units: percent
    alert_threshold: < 75%

  - name: redis_operation_time
    description: Redis operation latency
    units: ms
    alert_threshold: > 100ms

  - name: active_users
    description: Number of active authenticated users
    units: count

  - name: oauth_flow_success_rate
    description: Success rate of OAuth flows
    units: percent
    alert_threshold: < 95%
```

### Infrastructure Metrics
```yaml
Metrics:
  - name: cpu_usage
    description: CPU utilization percentage
    units: percent
    alert_threshold: > 80%

  - name: memory_usage
    description: Memory utilization percentage
    units: percent
    alert_threshold: > 85%

  - name: disk_usage
    description: Disk space utilization
    units: percent
    alert_threshold: > 80%

  - name: network_in
    description: Inbound network traffic
    units: bytes/sec

  - name: network_out
    description: Outbound network traffic
    units: bytes/sec
```

---

## 3. Custom Metric Implementation

### Token Generation Metric
```typescript
// src/services/TokenService.ts
import tracer from 'dd-trace';

export class TokenService {
    async generateAccessToken(payload: any): Promise<string> {
        const span = tracer.startSpan('token_generation');
        span.setTag('token_type', 'access');
        
        const startTime = Date.now();

        try {
            const token = jwt.sign(payload, this.secret, {
                expiresIn: '15m'
            });

            const duration = Date.now() - startTime;
            span.setMetric('token_generation_time', duration);

            // Send metric to Datadog
            await this.sendMetric('token_generation_time', duration, ['type:access']);

            return token;
        } finally {
            span.finish();
        }
    }

    private async sendMetric(name: string, value: number, tags: string[] = []) {
        // Implementation to send custom metric to Datadog
        // This would use Datadog's API or agent
    }
}
```

### Database Query Metric
```typescript
// src/config/database.ts
import tracer from 'dd-trace';

export class Database {
    async query(sql: string, params?: any[]): Promise<any> {
        const span = tracer.startSpan('db_query');
        span.setTag('db.type', 'postgres');
        span.setTag('db.statement', sql);

        const startTime = Date.now();

        try {
            const result = await this.pool.query(sql, params);
            const duration = Date.now() - startTime;

            span.setMetric('db_query_time', duration);
            span.setTag('db.rows_affected', result.rowCount);

            return result;
        } catch (error) {
            span.setTag('error', true);
            span.setTag('error.message', error.message);
            throw error;
        } finally {
            span.finish();
        }
    }
}
```

### API Endpoint Metrics
```typescript
// src/middleware/metrics.middleware.ts
import tracer from 'dd-trace';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
    const span = tracer.startSpan('http_request');
    span.setTag('http.method', req.method);
    span.setTag('http.url', req.path);
    span.setTag('http.client_ip', req.ip);

    const startTime = Date.now();

    // Wrap response send
    const originalSend = res.send;
    res.send = function(data: any) {
        const duration = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${duration}ms`);

        span.setTag('http.status_code', res.statusCode);
        span.setMetric('request_latency', duration);

        if (res.statusCode >= 400) {
            span.setTag('error', true);
        }

        span.finish();
        return originalSend.call(this, data);
    };

    next();
}
```

---

## 4. Alert Configuration

### Alert 1: High Error Rate
```yaml
Name: High Error Rate
Metric: error_rate
Condition: error_rate > 5% for 5 minutes
Severity: Critical
Notification:
  - Slack: #identity-service-alerts
  - Email: devops@company.com
  - PagerDuty: identity-service-oncall
```

### Alert 2: High Response Latency
```yaml
Name: High API Latency
Metric: request_latency
Condition: request_latency{quantile:p99} > 1000ms for 10 minutes
Severity: Warning
Notification:
  - Slack: #identity-service-alerts
  - Email: devops@company.com
```

### Alert 3: Database Connection Pool Exhaustion
```yaml
Name: Database Connection Pool Near Capacity
Metric: database_connection_pool_usage
Condition: database_connection_pool_usage > 90% for 5 minutes
Severity: Critical
Notification:
  - Slack: #identity-service-alerts
  - PagerDuty: database-oncall
```

### Alert 4: Redis Connection Failure
```yaml
Name: Redis Connection Failure
Metric: redis_connection_errors
Condition: redis_connection_errors > 0 for 1 minute
Severity: Critical
Notification:
  - Slack: #identity-service-alerts
  - PagerDuty: cache-oncall
```

### Alert 5: Low Cache Hit Ratio
```yaml
Name: Low Redis Cache Hit Ratio
Metric: redis_cache_hit_ratio
Condition: redis_cache_hit_ratio < 75% for 15 minutes
Severity: Warning
Notification:
  - Slack: #identity-service-performance
```

### Alert 6: OAuth Flow Failure Rate
```yaml
Name: High OAuth Flow Failure Rate
Metric: oauth_flow_success_rate
Condition: oauth_flow_success_rate < 95% for 10 minutes
Severity: Warning
Notification:
  - Slack: #identity-service-alerts
  - Email: security@company.com
```

### Alert 7: High CPU Usage
```yaml
Name: High CPU Usage
Metric: cpu_usage
Condition: cpu_usage > 80% for 10 minutes
Severity: Warning
Notification:
  - Slack: #infrastructure-alerts
```

### Alert 8: High Memory Usage
```yaml
Name: High Memory Usage
Metric: memory_usage
Condition: memory_usage > 85% for 10 minutes
Severity: Warning
Notification:
  - Slack: #infrastructure-alerts
```

---

## 5. Dashboard Configuration

### Main Overview Dashboard
```yaml
Dashboard: Identity Service - Production Overview

Widgets:
  1. System Health
     - Request Rate (line chart)
     - Error Rate (line chart)
     - Active Users (gauge)

  2. Performance
     - API Latency p50, p95, p99 (line chart)
     - Token Generation Time (line chart)
     - Database Query Time (line chart)

  3. Infrastructure
     - CPU Usage (gauge)
     - Memory Usage (gauge)
     - Disk Usage (gauge)

  4. Caching
     - Redis Cache Hit Ratio (gauge)
     - Cache Operations (heatmap)

  5. OAuth Flows
     - Authorization Code Flow Success Rate
     - Client Credentials Flow Success Rate
     - Token Refresh Success Rate

  6. Errors
     - Top 10 Error Types (bar chart)
     - Error Trend (line chart)
     - Error Heat Map (heatmap)
```

### Performance Dashboard
```yaml
Dashboard: Identity Service - Performance Analysis

Widgets:
  1. Response Times
     - Request Latency Distribution (histogram)
     - Percentile Trends (line chart)
     - Response Time by Endpoint (table)

  2. Database Performance
     - Query Execution Times (histogram)
     - Slow Queries (table)
     - Connection Pool Utilization (line chart)

  3. Caching Performance
     - Cache Hit/Miss Ratio (donut chart)
     - Cache Operations by Type (bar chart)
     - Cache Size Trend (line chart)
```

### Security Dashboard
```yaml
Dashboard: Identity Service - Security Monitoring

Widgets:
  1. Authentication
     - Login Success Rate (gauge)
     - Failed Login Attempts (line chart)
     - Top Failed IPs (table)

  2. OAuth Security
     - Invalid Client Attempts (line chart)
     - Revoked Token Usage (counter)
     - Scope Violations (line chart)

  3. Rate Limiting
     - Rate Limit Hits (line chart)
     - Top Rate Limited IPs (table)
```

---

## 6. Logging Integration

### Centralized Logging
```typescript
// src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: {
        service: 'identity-service',
        environment: process.env.NODE_ENV,
        version: process.env.APP_VERSION
    },
    transports: [
        // Console for development
        new winston.transports.Console({
            format: winston.format.simple()
        }),
        // Datadog transport for production
        ...(process.env.NODE_ENV === 'production'
            ? [
                new winston.transports.Http({
                    host: 'http-intake.logs.datadoghq.com',
                    path: `/v1/input/${process.env.DATADOG_API_KEY}`,
                    ssl: true,
                    auth: {
                        bearer: process.env.DATADOG_API_KEY
                    }
                })
            ]
            : [])
    ]
});

export default logger;
```

### Log Injection
```typescript
// All logs automatically include trace context
logger.info('Token generated', {
    userId: user.id,
    clientId: client.id,
    scopes: scopes,
    // Datadog will automatically add:
    // - dd.trace_id
    // - dd.span_id
    // - dd.service
});
```

---

## 7. SLA & Performance Targets

```yaml
SLO - Service Level Objectives:

  Availability:
    - Target: 99.9%
    - Error Budget: 43.2 minutes/month
    - Alert Threshold: 99.5% (rolling hour)

  Latency (API Responses):
    - p50: < 100ms
    - p95: < 500ms
    - p99: < 1000ms
    - Alert Threshold: p99 > 1000ms for 10 minutes

  Error Rate:
    - Target: < 0.5%
    - Alert Threshold: > 5% for 5 minutes

  Token Generation:
    - Target: < 50ms (p95)
    - Alert Threshold: > 200ms

  Database Queries:
    - Target: < 100ms (p95)
    - Alert Threshold: > 500ms (p99)

  Cache Hit Ratio:
    - Target: > 80%
    - Alert Threshold: < 75%
```

---

## 8. Implementation Checklist

### Datadog Setup
- [ ] Datadog account created
- [ ] API key and app ID obtained
- [ ] DD_TRACE installed
- [ ] APM agent initialized in application
- [ ] Custom metrics implemented
- [ ] Logging integrated

### Metrics
- [ ] Request latency metrics
- [ ] Error rate metrics
- [ ] Token generation metrics
- [ ] Database query metrics
- [ ] Redis cache metrics
- [ ] OAuth flow metrics
- [ ] Infrastructure metrics

### Alerts
- [ ] High error rate alert
- [ ] High latency alert
- [ ] Database connection pool alert
- [ ] Redis connection alert
- [ ] Cache hit ratio alert
- [ ] OAuth flow failure alert
- [ ] CPU usage alert
- [ ] Memory usage alert

### Dashboards
- [ ] Overview dashboard created
- [ ] Performance dashboard created
- [ ] Security dashboard created
- [ ] Alerts dashboard created

### Notifications
- [ ] Slack integration configured
- [ ] Email notifications configured
- [ ] PagerDuty integration (optional)
- [ ] WebHook integration (optional)

---

## 9. Datadog Configuration as Code

### Using Terraform (Optional)
```hcl
# datadog-terraform/monitors.tf
resource "datadog_monitor" "high_error_rate" {
  name       = "High Error Rate - Identity Service"
  type       = "metric alert"
  query      = "avg(last_5m):avg:error_rate{service:identity-service} > 5"
  thresholds = {
    critical = 5
  }
  notification_channels = [
    datadog_integration_slack_channel.alerts.id
  ]
}

resource "datadog_monitor" "high_latency" {
  name       = "High API Latency - Identity Service"
  type       = "metric alert"
  query      = "avg(last_10m):p99:request_latency{service:identity-service} > 1000"
  thresholds = {
    warning = 800
    critical = 1000
  }
}

# Apply with: terraform apply
```

---

## 10. Troubleshooting & Support

### Common Issues

**Issue: Metrics not appearing in Datadog**
- Check Datadog API key is correct
- Verify application is sending metrics
- Check network connectivity to Datadog

**Issue: Alerts not triggering**
- Verify metric query is correct
- Check notification channels are configured
- Test alert manually

**Issue: High latency in metrics collection**
- Increase agent flush interval if safe
- Check network performance to Datadog
- Reduce metric cardinality

### Support Resources
- Datadog Documentation: https://docs.datadoghq.com
- Support Email: support@datadoghq.com
- Slack Community: Datadog Slack Community

---

## Next Steps
1. Create Datadog account
2. Obtain API credentials
3. Install DD_TRACE in application
4. Implement custom metrics
5. Configure alerts
6. Create dashboards
7. Test monitoring pipeline
