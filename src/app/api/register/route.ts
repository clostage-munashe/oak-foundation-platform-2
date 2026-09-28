import { NextRequest, NextResponse } from 'next/server';
import { registrationSchema } from '@/lib/validation';
import { register, recordEmailStatus } from '@/lib/repository';
import { guard, fail, rateLimit, readJson } from '@/lib/api';
import { sendConfirmation } from '@/lib/confirmation-email';
export async function POST(request: NextRequest) {
  try {
    guard(request);
    await rateLimit(request, 'register', 5, 3600);
    const body = await readJson(request);
    if (body.website) return fail(new Error('Unable to submit form.'));
    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) return fail(new Error(parsed.error.issues[0].message), 400);
    const registration = await register(parsed.data);
    const emailStatus = await sendConfirmation(registration);
    try {
      await recordEmailStatus(registration, emailStatus);
    } catch (error) {
      // Mail delivery and status persistence must never turn a saved registration into a failure.
      console.error('registration_email_status_persist_failed', {
        registrationId: registration.id,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
    const response = NextResponse.json(
      { registration: { ...registration, sessionToken: undefined } },
      { status: 201 },
    );
    response.cookies.set('oak-session', registration.sessionToken!, {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (e) {
    if (e instanceof Error && 'status' in e && typeof e.status === 'number')
      return fail(e, e.status);
    if (e instanceof Error && e.message.startsWith('This email is already registered'))
      return fail(e, 409);
    return fail(e);
  }
}
