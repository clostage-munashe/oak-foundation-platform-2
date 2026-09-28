import { requirePage, programmeRoles } from '@/lib/access';
import { PartnerDirectory } from '@/components/partners';
import { content } from '@/lib/repository';
export const metadata = { title: 'Partner Directory' };
export default async function Page() {
  await requirePage(programmeRoles);
  return <PartnerDirectory partners={(await content()).partners} />;
}
