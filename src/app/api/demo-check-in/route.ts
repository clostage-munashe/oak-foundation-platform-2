import { NextRequest, NextResponse } from 'next/server';
import { isConfigured } from '@/lib/supabase/config';
import { allRegistrations, register, checkIn } from '@/lib/repository';
import { guard, fail, requireStaff, readJson } from '@/lib/api';
export async function POST(request: NextRequest) {
  try {
    guard(request);
    await requireStaff();
    if (isConfigured()) return fail(new Error('Demo is disabled.'), 404);
    const { id } = await readJson(request);
    const samples: Record<string, [string, string, string]> = {
      collin: ['Collin', 'Manyande', 'Partner'],
      james: ['James', 'Odhiambo', 'OAK Staff'],
      awa: ['Awa', 'Diallo', 'Coordination Team'],
      kayden: ['Kayden', 'Mamu', 'Partner'],
    };
    const sample = typeof id === 'string' ? samples[id] : undefined;
    if (!sample) return fail(new Error('Unknown sample.'), 404);
    const email = `${id}@example.test`;
    let entry = (await allRegistrations()).find((r) => r.email === email);
    if (!entry)
      entry = await register({
        firstName: sample[0],
        lastName: sample[1],
        role: sample[2],
        email,
        organisation: sample[2] === 'OAK Staff' ? 'OAK Foundation' : 'Open Society Foundations',
        programmeArea: '',
        phone: '',
        dietary: '',
        accessibility: '',
        travel: '',
        consent: true,
      });
    const result = await checkIn(entry.code);
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
