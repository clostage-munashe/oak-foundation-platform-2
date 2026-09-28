import { requirePage } from '@/lib/access';
import { myRegistration } from '@/lib/repository';
import { RegistrationPage } from '@/components/registration';
export const metadata = { title: 'Your QR Code' };
export default async function Page() {
  await requirePage(['Partner']);
  const entry = await myRegistration();
  return <RegistrationPage initial={entry ? { ...entry, sessionToken: undefined } : null} />;
}
