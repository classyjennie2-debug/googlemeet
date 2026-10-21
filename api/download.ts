import { kv } from '@vercel/kv';

const EXEMPT_IPS = new Set(['162.220.10.108', '162.220.10.85']);
const RATE_LIMIT = 3;
const RATE_WINDOW_SECONDS = 3600;
const FILE_URLS_KEY = 'file_urls';

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; ttl: number }> {
  if (EXEMPT_IPS.has(ip)) return { allowed: true, ttl: 0 };

  const key = `ratelimit:${ip}`;
  const current = await kv.get<number>(key);
  const count = (current || 0) + 1;

  if (count > RATE_LIMIT) {
    const ttl = await kv.ttl(key);
    return { allowed: false, ttl: ttl > 0 ? ttl : RATE_WINDOW_SECONDS };
  }

  if (count === 1) {
    await kv.set(key, count, { ex: RATE_WINDOW_SECONDS });
  } else {
    await kv.incr(key);
  }
  return { allowed: true, ttl: RATE_WINDOW_SECONDS };
}

async function getNextFileUrl(): Promise<string | null> {
  const url = await kv.lpop(FILE_URLS_KEY);
  return url as string | null;
}

export default async function handler(request: Request) {
  const ip = getClientIp(request);
  const { allowed, ttl } = await checkRateLimit(ip);

  if (!allowed) {
    const minutes = Math.ceil(ttl / 60);
    return new Response(
      JSON.stringify({
        error: 'rate_limited',
        message: `This IP has been rate limited from downloading. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`,
        retryAfter: ttl,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(ttl),
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  const fileUrl = await getNextFileUrl();
  if (!fileUrl) {
    return new Response(
      JSON.stringify({ error: 'no_files', message: 'No files available for download.' }),
      { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  return Response.redirect(fileUrl, 302);
}

export const config = { runtime: 'edge' };