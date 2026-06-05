import crypto from "crypto";

/**
 * Single-use sign-in challenges for wallet auth (anti-replay).
 *
 * A signature over a static "Sign in to Ashnance + timestamp" message is
 * replayable by anyone who observes it (for the whole timestamp window). We
 * instead issue a server-generated random nonce per public key, require the
 * signed message to carry it, and consume it on first use — so a captured
 * signature can never be replayed.
 *
 * Storage is in-memory: the production API runs as a single pm2 process, and
 * challenges live for only 5 minutes, so this is sufficient. If the API is ever
 * scaled to multiple instances, move this to Redis (or a DB table) so the nonce
 * issued by one instance is visible to the one that verifies it.
 */

interface Challenge {
  nonce: string;
  expiresAt: number;
}

const challenges = new Map<string, Challenge>();
const TTL_MS = 5 * 60 * 1000;
const NONCE_RE = /nonce:([a-f0-9]{48})/;

function sweep(now: number): void {
  for (const [key, c] of challenges) {
    if (c.expiresAt < now) challenges.delete(key);
  }
}

/** Issue a fresh challenge for a public key and return the message to sign. */
export function issueChallenge(publicKey: string, now: number = Date.now()): string {
  sweep(now);
  const nonce = crypto.randomBytes(24).toString("hex"); // 48 hex chars
  challenges.set(publicKey, { nonce, expiresAt: now + TTL_MS });
  return [
    "Sign in to Ashnance",
    "",
    "This signature proves you own this wallet. It costs no SOL.",
    "",
    `nonce:${nonce}`,
    `timestamp:${now}`,
  ].join("\n");
}

/**
 * Validate that `message` carries the nonce we issued for `publicKey`, then
 * consume it (single use). Returns true only on a fresh, matching, unexpired
 * challenge.
 */
export function consumeChallenge(
  publicKey: string,
  message: string,
  now: number = Date.now()
): boolean {
  const entry = challenges.get(publicKey);
  if (!entry) return false;
  if (entry.expiresAt < now) {
    challenges.delete(publicKey);
    return false;
  }
  const m = message.match(NONCE_RE);
  if (!m || m[1] !== entry.nonce) return false;
  challenges.delete(publicKey); // single use — cannot be replayed
  return true;
}
