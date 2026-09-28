import { currentRole, programmeRoles } from '@/lib/access';
import { NextRequest, NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { isConfigured } from '@/lib/supabase/config';
import { myRegistration, staffUser } from '@/lib/repository';
import { guard, fail, rateLimit } from '@/lib/api';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    guard(request);
    await rateLimit(request, 'resources', 120, 60);
    if (!programmeRoles.includes((await currentRole()) ?? ''))
      return fail(new Error('Programme access is required.'), 403);
    if (!isConfigured())
      return fail(
        new Error(
          'The original resource file was not included with the reference images. Event staff can add it after connecting Supabase.',
        ),
        404,
      );
    if (!(await myRegistration()) && !(await staffUser()))
      return fail(new Error('Register or sign in to download event resources.'), 401);
    const { id } = await params;
    const client = adminClient();
    const { data, error } = await client
      .from('resources')
      .select('storage_path')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error('Unable to load this resource.');
    if (!data?.storage_path)
      return fail(new Error('This resource has not been uploaded by event staff yet.'), 404);
    const { data: link, error: downloadError } = await client.storage
      .from('event-resources')
      .createSignedUrl(data.storage_path, 60, { download: true });
    if (downloadError) throw new Error('This resource is temporarily unavailable.');
    return NextResponse.json({ url: link.signedUrl });
  } catch (e) {
    if (e instanceof Error && 'status' in e && typeof e.status === 'number')
      return fail(e, e.status);
    return fail(e);
  }
}
