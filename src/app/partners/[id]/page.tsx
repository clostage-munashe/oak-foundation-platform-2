import { requirePage, programmeRoles } from '@/lib/access';
import { notFound } from 'next/navigation';
import { PartnerDetail } from '@/components/partners';
import { content } from '@/lib/repository';
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  await requirePage(programmeRoles);
  const { id } = await params;
  const partner = (await content()).partners.find((p) => p.id === id);
  return { title: partner?.name ?? 'Partner not found' };
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requirePage(programmeRoles);
  const { id } = await params;
  const partner = (await content()).partners.find((p) => p.id === id);
  if (!partner) notFound();
  return <PartnerDetail partner={partner} />;
}
