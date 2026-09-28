import { requirePage } from '@/lib/access';
import { redirect } from 'next/navigation';
import { Attendance } from '@/components/attendance';
import { allRegistrations, staffUser } from '@/lib/repository';
import { isConfigured } from '@/lib/supabase/config';
export const metadata = { title: 'Attendance' };
export default async function Page() {
  await requirePage(['Coordination Team']);
  const people = await allRegistrations();
  return (
    <Attendance
      initial={people.map(
        ({ id, firstName, lastName, organisation, role, createdAt, checkedInAt }) => ({
          id,
          firstName,
          lastName,
          organisation,
          role,
          createdAt,
          checkedInAt,
        }),
      )}
    />
  );
}
