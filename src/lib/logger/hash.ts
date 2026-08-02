import crypto from "crypto";

// For PIPEDA compliance, IP addresses should be hashed rather than stored directly.
// This allows for uniqueness counting and rate limiting without exposing PII.
const SALT = process.env.LOGGING_SALT || "upside_tree_default_salt_2026";

/**
 * securely hashes an IP address
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  // Don't hash internal/localhost IPs for debugging ease, or optionally hash them too.
  if (ip === "127.0.0.1" || ip === "::1") return "localhost";

  return crypto
    .createHash("sha256")
    .update(ip + SALT)
    .digest("hex");
}

/**
 * Masks an email address: e.g. "farjad@example.com" -> "f***@example.com"
 */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  
  const [local, domain] = parts;
  if (local.length <= 1) return `*@${domain}`;
  
  return `${local[0]}***@${domain}`;
}

/**
 * Recursively scrubs sensitive data from JSON payloads before logging.
 */
export function scrubMetadata(metadata: Record<string, any> | null): Record<string, any> | null {
  if (!metadata) return null;

  const scrubbed = { ...metadata };
  const sensitiveKeys = ["password", "card", "credit_card", "sin", "ssn", "secret", "token"];

  for (const key of Object.keys(scrubbed)) {
    // If the key is sensitive, redact it
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      scrubbed[key] = "[REDACTED]";
    } else if (typeof scrubbed[key] === "object" && scrubbed[key] !== null) {
      // Recursively scrub nested objects
      scrubbed[key] = scrubMetadata(scrubbed[key]);
    }
  }

  return scrubbed;
}
