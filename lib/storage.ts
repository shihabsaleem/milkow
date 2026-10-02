/**
 * Local storage hygiene for multi-tenant session data.
 *
 * Every `use*Logic` hook caches tenant-scoped data under a `milkow_*` key so
 * screens paint instantly instead of flashing a skeleton. That cache is plain
 * text and outlives the session.
 *
 * Without an explicit purge on sign-out, a shared device leaks one franchise's
 * data to whoever logs in next — driver phones get handed over mid-route, so
 * this is a real cross-tenant exposure, not a theoretical one.
 *
 * Purging by prefix (rather than an explicit key list) means any cache added in
 * future is covered automatically without touching this file again.
 */

const MILKOW_PREFIX = "milkow_";

/**
 * Removes every `milkow_*` local storage entry plus the legacy session cookie.
 * Safe to call repeatedly; never throws.
 */
export function clearMilkowStorage(): void {
  if (typeof window === "undefined") return;

  try {
    // Collect first, then delete — mutating during iteration skips keys.
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(MILKOW_PREFIX)) doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    // Storage can be unavailable (Safari private mode, disabled cookies).
    // Cleanup must never be able to block sign-out.
    console.error("[storage] Failed to clear cached session data:", error);
  }

  try {
    // Written by older code paths and never read back; cleared for completeness.
    document.cookie = "milkow_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  } catch (error) {
    console.error("[storage] Failed to clear session cookie:", error);
  }
}
