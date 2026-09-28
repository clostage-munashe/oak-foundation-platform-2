import { requirePage } from '@/lib/access';
import { redirect } from 'next/navigation';
import { CheckIn } from '@/components/check-in';
import { staffUser } from '@/lib/repository';
import { isConfigured } from '@/lib/supabase/config';
export const metadata = { title: 'Event Check-In' };
export default async function Page() {
  await requirePage(['Coordination Team']);
  return <CheckIn demo={!isConfigured()} />;
}
