'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Globe,
  UserPlus,
  ScanLine,
  LayoutGrid,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import type { ReactNode } from 'react';
export function Shell({
  children,
  demo,
  role,
  staffAccess,
}: {
  children: ReactNode;
  demo: boolean;
  role: string | null;
  staffAccess: boolean;
}) {
  const path = usePathname();
  const staff = staffAccess;
  const internal = staff;
  const nav = [
    { href: '/', label: 'Register', icon: UserPlus },
    ...(internal ? [{ href: '/check-in', label: 'Check In', icon: ScanLine }] : []),
    ...(role === 'Partner' ? [{ href: '/qr-code', label: 'My QR Code', icon: ScanLine }] : []),
    ...(role && role !== 'Partner'
      ? [
          { href: '/programme', label: 'Programme', icon: CalendarDays },
          { href: '/partners', label: 'Partners', icon: Globe },
        ]
      : []),
    ...(internal ? [{ href: '/attendance', label: 'Attendance', icon: LayoutGrid }] : []),
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="mobile-header mobile-image-header">
        <Link href="/" aria-label="OAK Foundation home"><img className="oak-brand-image" src="/oak-brand.png" width={255} height={130} alt="OAK Foundation — Partner Convening 2026" /></Link>
      </header>
      <aside className="sidebar">
        <Link href="/" className="desktop-brand desktop-image-brand" aria-label="OAK Foundation home">
          <img className="oak-brand-image" src="/oak-brand.png" width={255} height={130} alt="OAK Foundation — Partner Convening 2026" />
        </Link>
        <nav aria-label="Main navigation">
          <p className="eyebrow" style={{ padding: '8px 12px' }}>
            {role ?? 'Register to access the event'}
          </p>
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined
              }
              className={(href === '/' ? path === '/' : path.startsWith(href)) ? 'active' : ''}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Globe size={19} />
          <div>
            <strong>Harare, Zimbabwe</strong>
            <small>9–11 November 2026</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <main id="main">
          {children}
          <footer className="utility-footer">
            {demo && <span className="demo-label">Local demo · sample event content</span>}
            <Link href={staff ? '/attendance' : '/staff'}>
              <ShieldCheck size={13} />
              {staff ? 'Staff area' : 'Staff sign-in'}
            </Link>
            {staff && !demo && (
              <button
                onClick={async () => {
                  await fetch('/api/auth/sign-out', { method: 'POST' });
                  window.location.href = '/';
                }}
              >
                <LogOut size={13} />
                Sign out
              </button>
            )}
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={
              (href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined
            }
            className={(href === '/' ? path === '/' : path.startsWith(href)) ? 'active' : ''}
          >
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

