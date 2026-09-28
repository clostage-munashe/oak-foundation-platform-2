import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { guard, fail } from '@/lib/api';
export async function POST(request: NextRequest) {
  try {
    guard(request);
    const client = await createClient();
    await client.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
