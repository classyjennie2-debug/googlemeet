import { kv } from '@vercel/kv';
import { createClient } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

const s3 = createClient({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const EXEMPT_IPS = new Set(['162.220.10.108', '162.220.10.85']);
const RATE_LIMIT = 3;
const RATE_WINDOW_SECONDS = 3600;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; count: number; ttl: number }> {
  if (EXEMPT_IPS.has(ip)) return { allowed: true, count: 0, ttl: 0 };

  const key = `ratelimit:${ip}`;
  const current = await kv.get<number>(key);
  const count = (current || 0) + 1;

  if (count > RATE_LIMIT) {
    const ttl = await kv.ttl(key);
    return { allowed: false, count, ttl: ttl > 0 ? ttl : RATE_WINDOW_SECONDS };
  }

  if (count === 1) {
    await kv.set(key, count, { ex: RATE_WINDOW_SECONDS });
  } else {
    await kv.incr(key);
  }
  return { allowed: true, count, ttl: RATE_WINDOW_SECONDS };
}

async function getNextFile(): Promise<string | null> {
  const file = await kv.spop('file_pool');
  return file as string | null;
}

async function initializeFilePool(files: string[]) {
  const existing = await kv.scard('file_pool');
  if (existing === 0) {
    await kv.sadd('file_pool', ...files);
  }
}

export default async function handler(request: Request) {
  const ip = getClientIp(request);
  const { allowed, count, ttl } = await checkRateLimit(ip);

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

  const filename = await getNextFile();
  if (!filename) {
    return new Response(
      JSON.stringify({ error: 'no_files', message: 'No files available for download.' }),
      { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  try {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: filename,
      ResponseContentDisposition: 'attachment; filename="GMeet.zip"',
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return Response.redirect(signedUrl, 302);
  } catch (error) {
    console.error('Download error:', error);
    await kv.sadd('file_pool', filename);
    return new Response(
      JSON.stringify({ error: 'server_error', message: 'Failed to generate download link.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export const config = { runtime: 'edge' };