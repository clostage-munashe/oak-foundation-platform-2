'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { CalendarDays, Layers, Users, CheckCircle2, Download, RotateCcw } from 'lucide-react';
import { Card, Status, requestJson } from './ui';
import type { Registration } from '@/lib/types';
import { event } from '@/lib/data';
import { registrationRoles } from '@/lib/roles';
import { Dropdown } from './dropdown';
export function RegistrationPage({ initial }: { initial: Registration | null }) {
  const [entry, setEntry] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState('');
  useEffect(() => {
    let active = true;
    if (entry?.role === 'Partner')
      QRCode.toDataURL(entry.code, {
        width: 420,
        margin: 4,
        color: { dark: '#20345f', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
        .then((url) => {
          if (active) setQr(url);
        })
        .catch(() =>
          setError('Unable to create the QR image. Your entry code below remains valid.'),
        );
    return () => {
      active = false;
    };
  }, [entry]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      const data = await requestJson('/api/register', {
        ...Object.fromEntries(form),
        consent: form.get('consent') === 'on',
      });
      window.location.assign(
        data.registration.role === 'Partner'
          ? '/qr-code'
          : data.registration.role === 'Coordination Team'
            ? '/check-in'
            : '/programme',
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return entry ? (
    <div className="stack registration-page">
      <section className="hero pass-hero">
        <CheckCircle2 className="hero-icon" size={52} />
        <div>
          <p className="eyebrow">REGISTRATION COMPLETE</p>
          <h1>
            You’re Registered,
            <br />
            {entry.firstName}!
          </h1>
          <p>{entry.organisation}</p>
        </div>
      </section>
      <p className="muted">
        {entry.emailStatus === 'sent'
          ? 'A confirmation email with your QR code has been sent.'
          : 'Your registration is saved. Download your QR code below; confirmation email is currently unavailable.'}
      </p>
      <Card className="entry-pass">
        <p className="eyebrow">YOUR ENTRY PASS</p>
        <div className="qr-frame">
          {qr ? (
            <img src={qr} width={230} height={230} alt="Your event entry QR code" />
          ) : (
            <p>Preparing QR code…</p>
          )}
        </div>
        <p className="entry-code">{entry.code}</p>
        <p>Present at event entrance for check-in</p>
      </Card>
      <Card>
        <h2 className="eyebrow">REGISTRATION DETAILS</h2>
        <dl className="details">
          {[
            ['Registration ID', entry.id],
            ['Status', 'Registered'],
            ['Name', `${entry.firstName} ${entry.lastName}`],
            ['Organisation', entry.organisation],
            ['Role', entry.role],
            ['Email', entry.email],
            ['Phone', entry.phone || '—'],
            ['Event', event.dates],
            ['Location', 'Harare, Zimbabwe'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Status error>{error}</Status>
      <a
        className="button full"
        download={`OAK-entry-pass-${entry.firstName}.png`}
        href={qr || undefined}
        aria-disabled={!qr}
      >
        <Download size={18} />
        Download QR Code
      </a>
      <button
        className="text-button"
        onClick={() => {
          setEntry(null);
          setQr('');
        }}
      >
        <RotateCcw size={16} />
        Register another attendee
      </button>
    </div>
  ) : (
    <div className="stack registration-page">
      <section className="hero registration-hero">
        <h1>
          Partner
          <br />
          Convening 2026
        </h1>
        <p>
          {event.location} · {event.dates}
        </p>
      </section>
      <div className="stats-grid">
        {[
          [Users, '110+', 'Attendees'],
          [CalendarDays, '24', 'Sessions'],
          [Layers, '38', 'Partners'],
        ].map(([Icon, value, label]) => {
          const Component = Icon as typeof Users;
          return (
            <Card key={String(label)} className="stat">
              <Component size={18} />
              <strong>{String(value)}</strong>
              <span>{String(label)}</span>
            </Card>
          );
        })}
      </div>
      <Card className="registration-card">
        <h2>Registration Form</h2>
        <form onSubmit={submit} className="form-stack">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="First name"
              name="firstName"
              placeholder="Maria"
              required
              autoComplete="given-name"
            />
            <Field
              label="Last name"
              name="lastName"
              placeholder="Schmidt"
              required
              autoComplete="family-name"
            />
          </div>
          <Field
            label="Organisation"
            name="organisation"
            placeholder="Your organisation name"
            required
            autoComplete="organization"
          />
          <Field label="Sub-partner / Programme area" name="programmeArea" placeholder="Optional" />
          <div className="field">
            <span>
              Role / Capacity <em>*</em>
            </span>
            <Dropdown
              name="role"
              label="Role / Capacity"
              required
              options={[
                { value: '', label: 'Select your role', disabled: true },
                ...registrationRoles.map((role) => ({ value: role, label: role })),
              ]}
            />
          </div>
          <Field
            label="Email address"
            name="email"
            placeholder="you@organisation.org"
            type="email"
            required
            autoComplete="email"
          />
          <Field
            label="Phone number"
            name="phone"
            placeholder="+41 xx xxx xx xx"
            type="tel"
            autoComplete="tel"
            required
          />
          <fieldset className="requirements">
            <legend className="sr-only">Requirements</legend>
            <p className="eyebrow">REQUIREMENTS</p>
            <Field
              label="Dietary requirements"
              name="dietary"
              placeholder="e.g. Vegetarian, Halal, Gluten-free"
              maxLength={500}
            />
            <Field
              label="Accessibility requirements"
              name="accessibility"
              placeholder="e.g. Wheelchair access, hearing loop"
              maxLength={500}
            />
            <Field
              label="Travel requirements"
              name="travel"
              placeholder="e.g. Flight from London"
              maxLength={500}
            />
            <Field
              label="Accommodation requirements"
              name="accommodation"
              placeholder="e.g. Hotel accommodation needed"
              maxLength={500}
            />
          </fieldset>
          <label className="consent">
            <input name="consent" type="checkbox" required />
            <span>
              I agree to OAK Foundation’s{' '}
              <Link href="/privacy" target="_blank">
                privacy policy
              </Link>{' '}
              and consent to my registration data being used for event coordination.
            </span>
          </label>
          <div className="honeypot" aria-hidden="true">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <Status error>{error}</Status>
          <button className="button full" disabled={busy}>
            {busy ? 'Registering…' : 'Register'}
          </button>
        </form>
      </Card>
      <p className="privacy-footer">
        Your data is secured and handled by OAK Foundation in accordance with GDPR.
      </p>
    </div>
  );
}
function Field({
  label,
  name,
  required = false,
  ...props
}: {
  label: string;
  name: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>
        {label} {required && <em>*</em>}
      </span>
      <input name={name} required={required} maxLength={160} {...props} />
    </label>
  );
}
