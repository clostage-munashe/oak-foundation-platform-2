import { NextRequest, NextResponse } from 'next/server';
import { codeSchema } from '@/lib/validation';
import { checkIn } from '@/lib/repository';
import { guard, fail, requireStaff, rateLimit, readJson } from '@/lib/api';
export async function POST(request: NextRequest) {
  try {
    guard(request);
    await rateLimit(request, 'check-in', 120, 60);
    await requireStaff();
    const { code } = await readJson(request);
    const parsed = codeSchema.safeParse(code);
    if (!parsed.success) return NextResponse.json({ unrecognised: true }, { status: 404 });
    const result = await checkIn(parsed.data);
    if (!result) return NextResponse.json({ unrecognised: true }, { status: 404 });
    const { firstName, lastName, organisation, role, checkedInAt } = result.registration;
    return NextResponse.json({
      already: result.already,
      registration: { firstName, lastName, organisation, role, checkedInAt },
    });
  } catch (e) {
    if (e instanceof Error && 'status' in e && typeof e.status === 'number') return fail(e, e.status);
    return fail(e);
  }
}
