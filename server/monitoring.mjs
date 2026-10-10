const round = (value, digits = 1) => Number(value.toFixed(digits));

export class RequestMonitor {
  constructor(options = {}) {
    this.now = options.now ?? (() => Date.now());
    this.monotonicNow = options.monotonicNow ?? (() => performance.now());
    this.startedAt = this.now();
    this.slowRequestThresholdMs = options.slowRequestThresholdMs ?? 1_000;
    this.activeRequests = 0;
    this.requestsTotal = 0;
    this.clientErrorsTotal = 0;
    this.serverErrorsTotal = 0;
    this.slowRequestsTotal = 0;
    this.totalDurationMs = 0;
    this.maxDurationMs = 0;
  }

  begin() {
    this.activeRequests += 1;
    return this.monotonicNow();
  }

  finish(startedAt, statusCode = 0) {
    const durationMs = Math.max(0, this.monotonicNow() - startedAt);
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.requestsTotal += 1;
    this.totalDurationMs += durationMs;
    this.maxDurationMs = Math.max(this.maxDurationMs, durationMs);
    if (statusCode >= 400 && statusCode < 500) this.clientErrorsTotal += 1;
    if (statusCode >= 500) this.serverErrorsTotal += 1;
    const slow = durationMs >= this.slowRequestThresholdMs;
    if (slow) this.slowRequestsTotal += 1;

    return { durationMs: Math.round(durationMs), slow };
  }

  snapshot() {
    const memory = process.memoryUsage();
    const averageDurationMs = this.requestsTotal > 0
      ? this.totalDurationMs / this.requestsTotal
      : 0;

    return {
      observedSince: new Date(this.startedAt).toISOString(),
      uptimeSeconds: Math.max(0, Math.floor((this.now() - this.startedAt) / 1_000)),
      activeRequests: this.activeRequests,
      requestsTotal: this.requestsTotal,
      clientErrorsTotal: this.clientErrorsTotal,
      serverErrorsTotal: this.serverErrorsTotal,
      slowRequestsTotal: this.slowRequestsTotal,
      averageDurationMs: round(averageDurationMs),
      maxDurationMs: round(this.maxDurationMs),
      slowRequestThresholdMs: this.slowRequestThresholdMs,
      memory: {
        rssMb: round(memory.rss / 1024 / 1024),
        heapUsedMb: round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: round(memory.heapTotal / 1024 / 1024)
      }
    };
  }
}
