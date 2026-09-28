import { requirePage, programmeRoles } from '@/lib/access';
import { Programme } from '@/components/programme';
import { content, myRegistration, staffUser } from '@/lib/repository';
export const metadata = { title: 'Programme' };
export default async function Page() {
  await requirePage(programmeRoles);
  const data = await content();
  const ownerId = (await myRegistration())?.id ?? (await staffUser())?.id;
  data.notes = data.notes.filter((n) => n.ownerId === ownerId);
  return <Programme sessions={data.sessions} initialNotes={data.notes} />;
}
