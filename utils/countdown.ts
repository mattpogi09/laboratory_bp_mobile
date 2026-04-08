/**
 * Formats the time remaining until `expiresAt` into a human-readable string.
 * Returns "Expired" when the deadline has passed, or null if no date is given.
 */
export function formatTimeLeft(expiresAt: string | null | undefined, nowMs: number): string | null {
    if (!expiresAt) return null;
    const expiresMs = new Date(expiresAt).getTime();
    if (Number.isNaN(expiresMs)) return null;

    const diffMs = expiresMs - nowMs;
    if (diffMs <= 0) return "Expired";

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    return `${hours}h ${minutes}m ${seconds}s`;
}
