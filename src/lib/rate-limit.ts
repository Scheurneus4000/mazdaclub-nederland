/**
 * Eenvoudige sliding-window rate limiter in het geheugen. Voldoende voor één server-instantie;
 * bij meerdere instanties (horizontaal schalen) vervangen door Redis/Upstash met dezelfde interface.
 */
type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - bucket.hits[0])) / 1000);
    buckets.set(key, bucket);
    return { ok: false, retryAfter };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);

  // Opruimen zodat de map niet onbeperkt groeit.
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.hits.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "onbekend"
  );
}
