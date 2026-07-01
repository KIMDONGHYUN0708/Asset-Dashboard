import { NextRequest, NextResponse } from 'next/server';

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const TTL_SEC  = 60 * 60 * 24 * 365; // 1년

function kvHeaders() {
  return { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' };
}

/** GET /api/sync?uuid=xxx → 암호화된 페이로드 반환 */
export async function GET(req: NextRequest) {
  const uuid = req.nextUrl.searchParams.get('uuid')?.trim();
  if (!uuid) return NextResponse.json({ error: 'uuid required' }, { status: 400 });
  if (!KV_URL || !KV_TOKEN) return NextResponse.json({ error: 'KV not configured' }, { status: 503 });

  try {
    const res = await fetch(KV_URL, {
      method: 'POST',
      headers: kvHeaders(),
      body: JSON.stringify(['GET', `asd:${uuid}`]),
    });
    const { result } = await res.json();
    if (!result) return NextResponse.json({ payload: null });
    return NextResponse.json({ payload: result });
  } catch {
    return NextResponse.json({ error: 'KV fetch failed' }, { status: 502 });
  }
}

/** POST /api/sync  body: { uuid, payload }  → KV에 저장 */
export async function POST(req: NextRequest) {
  const { uuid, payload } = await req.json();
  if (!uuid || !payload) return NextResponse.json({ error: 'uuid and payload required' }, { status: 400 });
  if (!KV_URL || !KV_TOKEN) return NextResponse.json({ error: 'KV not configured' }, { status: 503 });

  try {
    await fetch(KV_URL, {
      method: 'POST',
      headers: kvHeaders(),
      body: JSON.stringify(['SET', `asd:${uuid}`, payload, 'EX', TTL_SEC]),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'KV write failed' }, { status: 502 });
  }
}
