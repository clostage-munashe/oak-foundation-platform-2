'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ShieldCheck, ScanLine } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card, Status } from './ui';
export function StaffLogin({ demo }: { demo: boolean }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const client = createClient();
      const { error } = await client.auth.signInWithPassword({
        email: String(form.get('email')),
        password: String(form.get('password')),
      });
      if (error) throw error;
      const {
        data: { user },
      } = await client.auth.getUser();
      const { data } = await client
        .from('staff')
        .select('user_id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (!data) {
        await client.auth.signOut();
        throw new Error(
          'This account is not assigned to event staff. Contact the project administrator.',
        );
      }
      window.location.href = '/attendance';
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <h1>Coordination Team sign-in</h1>
        <p>Event check-in and attendance</p>
      </div>
      <Card>
        {demo ? (
          <div className="empty-state">
            <ShieldCheck size={36} />
            <h2>Coordination Team access</h2>
            <p>
              Register as Coordination Team to open Check-in, Programme, Partners, and Attendance.
            </p>
            <Link className="button" href="/">
              Register for the event
            </Link>
          </div>
        ) : (
          <form className="form-stack" onSubmit={login}>
            <label className="field">
              <span>Staff email</span>
              <input type="email" name="email" autoComplete="username" required />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" name="password" autoComplete="current-password" required />
            </label>
            <Status error>{error}</Status>
            <button className="button full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="muted">
              Use the staff account provided by your event administrator. Contact them if you need
              to reset your password.
            </p>
          </form>
        )}
      </Card>
    </>
  );
}
