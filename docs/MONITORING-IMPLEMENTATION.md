# Monitoring implementation plan

The monitoring work is delivered in incremental phases so that security events remain useful while operational telemetry is added safely.

## Completed

- Phase 1 — system log storage and server-side logging foundation.
- Phase 2 — administrator system-log API and dashboard with severity/status controls.
- Phase 3 — security monitoring for suspicious JSON payload patterns (SQL injection and XSS indicators).
- Phase 4 — operational and performance monitoring:
  - administrator-only `GET /api/v1/admin/monitoring/health` endpoint;
  - database availability and latency check;
  - process uptime and memory snapshot;
  - request totals, average/max latency, active requests, client/server errors, and slow-request counts;
  - automatic `API` warning logs for requests at or above `CJC_SLOW_REQUEST_MS` (default: 1,000 ms);
  - automatic `APPLICATION` high-severity logs for unexpected 500 responses;
  - administrator portal overview cards for health, performance, and open incidents.

## Configuration

`CJC_SLOW_REQUEST_MS` controls the slow-request threshold. The default is 1,000 milliseconds. Slow request records include the request ID, route (without query parameters), status code, duration, and hashed client address; credentials and tokens are not recorded.

## Verification

The request monitor has a deterministic unit test, the health endpoint is covered by the authentication integration test (administrator allowed, student denied), and the full Node test suite is run with `npm test`.

## Next phase candidates

The next monitoring increment can add retention/archival for `system_logs`, notification delivery for critical events, and an external metrics sink. Those should be enabled only after an institutional retention policy and notification ownership are approved.
