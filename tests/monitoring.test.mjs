import assert from "node:assert/strict";
import { test } from "node:test";
import { RequestMonitor } from "../server/monitoring.mjs";

test("request monitor tracks latency, errors, slow requests, and runtime health", () => {
  let wallClock = Date.parse("2026-09-27T04:00:00.000Z");
  let monotonic = 100;
  const monitor = new RequestMonitor({
    now: () => wallClock,
    monotonicNow: () => monotonic,
    slowRequestThresholdMs: 50
  });

  const first = monitor.begin();
  monotonic += 25;
  assert.deepEqual(monitor.finish(first, 200), { durationMs: 25, slow: false });

  const second = monitor.begin();
  monotonic += 75;
  assert.deepEqual(monitor.finish(second, 503), { durationMs: 75, slow: true });
  wallClock += 2_000;

  const snapshot = monitor.snapshot();
  assert.equal(snapshot.requestsTotal, 2);
  assert.equal(snapshot.serverErrorsTotal, 1);
  assert.equal(snapshot.clientErrorsTotal, 0);
  assert.equal(snapshot.slowRequestsTotal, 1);
  assert.equal(snapshot.averageDurationMs, 50);
  assert.equal(snapshot.maxDurationMs, 75);
  assert.equal(snapshot.uptimeSeconds, 2);
  assert.equal(snapshot.slowRequestThresholdMs, 50);
  assert.ok(snapshot.memory.rssMb >= 0);
});
