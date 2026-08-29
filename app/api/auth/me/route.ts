import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 });
  return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
}
