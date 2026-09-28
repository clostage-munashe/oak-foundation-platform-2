import type { Metadata } from 'next';
import '@fontsource/quicksand/400.css';
import '@fontsource/quicksand/500.css';
import '@fontsource/quicksand/600.css';
import '@fontsource/quicksand/700.css';
import '@fontsource/baloo-2/700.css';
import '@fontsource/baloo-2/800.css';
import './globals.css';
import { Shell } from '@/components/shell';
import { isConfigured } from '@/lib/supabase/config';
import { staffUser } from '@/lib/repository';
import { currentRole } from '@/lib/access';
export const metadata: Metadata = {
  title: { default: 'OAK Foundation | Partner Convening 2026', template: '%s | OAK Foundation' },
  description:
    'Register, explore the programme and connect with partners at the OAK Foundation Partner Convening, 9–11 November 2026.',
  icons: { icon: '/favicon.svg' },
};
export const dynamic = 'force-dynamic';
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role = await currentRole();
  const staffAccess = Boolean(await staffUser()) || !isConfigured() && role === 'Coordination Team';
  return (
    <html lang="en">
      <body>
        <Shell demo={!isConfigured()} role={role} staffAccess={staffAccess}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
