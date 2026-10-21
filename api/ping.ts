import { Redis } from '@upstash/redis';
import { list } from '@vercel/blob';

const redis = Redis.fromEnv();

export default async function handler(request: Request): Promise<Response> {
  const results: Record<string, any> = {};

  try {
    const p = await redis.ping();
    results.redis = p === 'PONG';
  } catch (e: any) {
    results.redisError = String(e?.message || e);
  }

  try {
    const { blobs, hasMore } = await list({ limit: 1 }, { token: process.env.BLOB_READ_WRITE_TOKEN! });
    results.blob = blobs[0]?.pathname || null;
    results.hasMore = hasMore;
  } catch (e: any) {
    results.blobError = String(e?.message || e);
  }

  results.kvRestUrlSet = !!process.env.KV_REST_API_URL;
  results.blobTokenSet = !!process.env.BLOB_READ_WRITE_TOKEN;

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = { runtime: 'edge' };