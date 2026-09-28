import { NextRequest, NextResponse } from 'next/server';
import { allRegistrations } from '@/lib/repository';
import { guard, fail, requireStaff, rateLimit } from '@/lib/api';
export async function GET(request: NextRequest) {
  try {
    guard(request);
    await rateLimit(request, 'attendance', 120, 60);
    await requireStaff();
    const registrations = await allRegistrations();
    return NextResponse.json(
      {
        registrations: registrations.map(
          ({ id, firstName, lastName, organisation, role, createdAt, checkedInAt }) => ({
            id,
            firstName,
            lastName,
            organisation,
            role,
            createdAt,
            checkedInAt,
          }),
        ),
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (e) {
    if (e instanceof Error && 'status' in e && typeof e.status === 'number') return fail(e, e.status);
    return fail(e);
  }
}
