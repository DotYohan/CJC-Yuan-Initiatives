import { assertDemoSeedAllowed } from "../../seed.mjs";

export function validateDemoSeedEnvironment(environment = process.env) {
  assertDemoSeedAllowed(environment);
  return { allowed: true };
}
