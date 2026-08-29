import { NextResponse } from 'next/server';
import { clearSessionCookie, deleteCurrentSession } from '@/lib/auth';

export async function POST(request: Request) {
  await deleteCurrentSession(request);
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
