import Stripe from "stripe";

let _client: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) return null;

  if (!_client) {
    // Using the Stripe SDK's default API version — update when upgrading the SDK
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _client = new Stripe(key, { apiVersion: "2025-05-28.basil" as any });
  }
  return _client;
}
