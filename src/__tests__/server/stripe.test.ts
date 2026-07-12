import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const originalSecretKey = process.env.STRIPE_SECRET_KEY;

afterEach(() => {
  vi.resetModules();
  if (originalSecretKey === undefined) {
    delete process.env.STRIPE_SECRET_KEY;
  } else {
    process.env.STRIPE_SECRET_KEY = originalSecretKey;
  }
});

describe("Stripe configuration", () => {
  it("does not require payment configuration when the module is imported", async () => {
    delete process.env.STRIPE_SECRET_KEY;

    await expect(import("@/server/stripe")).resolves.toBeDefined();
  });

  it("fails clearly when payment functionality is used without configuration", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { stripe } = await import("@/server/stripe");

    expect(() => stripe.checkout).toThrow(
      "STRIPE_SECRET_KEY environment variable is required for payments"
    );
  });
});
