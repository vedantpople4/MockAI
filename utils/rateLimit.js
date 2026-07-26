const attempts = new Map();

export function checkRateLimit(key, { limit = 5, windowMs = 60_000 } = {}) {
    const now = Date.now();
    const timestamps = (attempts.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= limit) {
        return { allowed: false };
    }

    timestamps.push(now);
    attempts.set(key, timestamps);
    return { allowed: true };
}
