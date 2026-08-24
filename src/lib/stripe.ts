import "server-only";

import Stripe from "stripe";

let cachedClient: Stripe | null = null;

// Lazily constructed so the app can still build/run without a Stripe key —
// only routes that actually take a payment need it, and they'll get a clear
// error instead of a silent no-op if the key is missing.
export function getStripe(): Stripe {
  if (cachedClient) {
    return cachedClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add your Stripe secret key to .env.local to enable checkout."
    );
  }

  cachedClient = new Stripe(secretKey);
  return cachedClient;
}
