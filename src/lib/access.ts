import 'server-only';
import { redirect } from 'next/navigation';
import { myRegistration, staffUser } from './repository';
export async function currentRole() {
  if (await staffUser()) return 'Coordination Team';
  return (await myRegistration())?.role ?? null;
}
export async function requirePage(roles: string[]) {
  const role = await currentRole();
  if (!role) redirect('/');
  // Coordination Team pages require an authenticated, explicitly provisioned staff account.
  if (
    roles.length === 1 &&
    roles[0] === 'Coordination Team' &&
    (await staffUser()) === null &&
    // The mock coordinator is accepted only by the localhost demo backend.
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )
    redirect('/programme');
  if (!roles.includes(role)) redirect(role === 'Partner' ? '/qr-code' : '/programme');
}
export const programmeRoles = ['OAK Staff', 'Coordination Team', 'Presenter', 'Observer'];
