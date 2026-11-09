const storeOrigin = 'https://hamthelsmartliving.lovableholdings.chatgpt.site';
const publicCollections = new Set([
  'Product', 'Category', 'SiteConfig', 'HeroSlide', 'Testimonial', 'Faq', 'VideoShowcase',
]);
const publicActions = new Set(['list', 'filter', 'get', 'count']);
const guestSubmissions = new Set(['Order', 'ContactMessage', 'Subscriber']);

const error = (message, status) => Response.json({ message }, { status });

export async function POST(request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return error('Cross-origin writes are not allowed', 403);
  }
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return error('JSON required', 415);
  }
  const body = await request.text();
  if (Buffer.byteLength(body) > 100_000) return error('Request too large', 413);

  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return error('Invalid request', 400);
  }
  if (!input || !Array.isArray(input.args)) return error('Invalid request', 400);
  const { entity, action } = input;
  const canRead = publicCollections.has(entity) && publicActions.has(action);
  const canSubmit = guestSubmissions.has(entity) && action === 'create';
  if (!canRead && !canSubmit) return error('Administrator access required', 403);

  try {
    const upstream = await fetch(storeOrigin + '/api/store/records', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: storeOrigin },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.headers.get('content-type')?.includes('application/json')) {
      return error('Store service unavailable', 502);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch {
    return error('Store service unavailable', 502);
  }
}
