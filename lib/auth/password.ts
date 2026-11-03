import crypto from "crypto";

/**
 * Hashes a plaintext password using Node's native scrypt algorithm with a cryptographically secure random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored salt:hash string using constant-time equality check.
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}
