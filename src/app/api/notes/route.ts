import { NextRequest, NextResponse } from 'next/server';
import { addNote, updateNote, myRegistration, staffUser, content } from '@/lib/repository';
import { currentRole, programmeRoles } from '@/lib/access';
import { noteSchema } from '@/lib/validation';
import { guard, fail, rateLimit, readJson, httpError } from '@/lib/api';
export async function POST(request: NextRequest) {
  try {
    guard(request);
    await rateLimit(request, 'notes', 30, 60);
    if (!programmeRoles.includes((await currentRole()) ?? ''))
      return fail(new Error('Register with an eligible role to use personal notes.'), 403);
    const attendee = await myRegistration();
    const staff = await staffUser();
    const ownerId = attendee?.id ?? staff!.id;
    const body = await readJson(request);
    body.name = attendee ? `${attendee.firstName} ${attendee.lastName}` : 'Coordination Team';
    body.organisation = attendee?.organisation ?? 'OAK Foundation';
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) return fail(new Error(parsed.error.issues[0].message), 400);
    const session = (await content()).sessions.find((s) => s.id === parsed.data.sessionId);
    if (!session) return fail(new Error('Select a valid session.'), 400);
    const input = { ...parsed.data, day: session.day, ownerId };
    if (body.id !== undefined && (typeof body.id !== 'string' || body.id.length > 160))
      throw httpError('Invalid note identifier.', 400);
    const note = body.id ? await updateNote(body.id, ownerId, input) : await addNote(input);
    return NextResponse.json({ note });
  } catch (e) {
    if (e instanceof Error && 'status' in e && typeof e.status === 'number') return fail(e, e.status);
    if (e instanceof Error && e.message === 'Note not found.') return fail(e, 404);
    return fail(e);
  }
}
