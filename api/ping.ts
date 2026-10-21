export default async function handler(request: Request) {
  const results: Record<string, any> = {};

  let t = Date.now();
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
    results.redisPing = await redis.ping();
  } catch (e: any) {
    results.redisError = String(e?.message || e);
  }
  results.redisMs = Date.now() - t;

  t = Date.now();
  try {
    const { list } = await import('@vercel/blob');
    const { blobs, hasMore } = await list({ limit: 1 });
    results.blobList = blobs[0]?.pathname || null;
    results.blobHasMore = hasMore;
    results.blobUrlPrefix = blobs[0]?.url?.slice(0, 40) || null;
  } catch (e: any) {
    results.blobError = String(e?.message || e);
  }
  results.blobMs = Date.now() - t;

  results.kvRestUrlSet = !!process.env.KV_REST_API_URL;
  results.blobTokenSet = !!process.env.BLOB_READ_WRITE_TOKEN;

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}