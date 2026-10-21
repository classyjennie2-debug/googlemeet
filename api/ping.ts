export default async function handler(request: Request): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, t: Date.now() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = { runtime: 'edge' };