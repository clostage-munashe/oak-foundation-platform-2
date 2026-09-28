'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Users,
  RefreshCw,
  Phone,
  Camera,
  CameraOff,
  TriangleAlert,
} from 'lucide-react';
import type { Registration } from '@/lib/types';
import { initials } from '@/lib/data';
import { Card, Status, Modal, requestJson } from './ui';
type CheckInAttendee = Pick<Registration, 'firstName' | 'lastName' | 'organisation' | 'role' | 'checkedInAt'>;
export function CheckIn({ demo }: { demo: boolean }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ registration: CheckInAttendee; already: boolean } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const [camera, setCamera] = useState(false);
  const [contact, setContact] = useState(false);
  const [count, setCount] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<{ stop: () => void } | null>(null);
  const scanning = useRef(false);
  const generation = useRef(0);
  const stop = useCallback(() => {
    generation.current++;
    controls.current?.stop();
    controls.current = null;
    const stream = video.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (video.current) video.current.srcObject = null;
    setCamera(false);
  }, []);
  useEffect(
    () => () => {
      generation.current++;
      controls.current?.stop();
    },
    [],
  );
  async function scan(value: string, sample = false) {
    if (scanning.current) return;
    scanning.current = true;
    setBusy(true);
    setError('');
    stop();
    try {
      const response = await fetch(sample ? '/api/demo-check-in' : '/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sample ? { id: value } : { code: value }),
      });
      const data = await response.json();
      if (data.unrecognised) {
        setFailed(true);
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Unable to check in.');
      setResult(data);
      const attendance = await requestJson('/api/attendance');
      setCount(attendance.registrations.filter((r: Registration) => r.checkedInAt).length);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      scanning.current = false;
      setBusy(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  async function startCamera() {
    setError('');
    setCamera(true);
    const current = ++generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          'Camera access needs HTTPS or localhost. You can use manual code entry below.',
        );
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      if (current !== generation.current) return;
      const reader = new BrowserQRCodeReader();
      const c = await reader.decodeFromVideoDevice(undefined, video.current!, (decoded) => {
        if (decoded && !scanning.current) void scan(decoded.getText());
      });
      if (current !== generation.current) c.stop();
      else controls.current = c;
    } catch {
      if (current === generation.current) {
        setCamera(false);
        setError(
          'Camera is unavailable or permission was denied. Check camera permissions, or enter the pass code below.',
        );
      }
    }
  }
  function reset() {
    setResult(null);
    setFailed(false);
    setCode('');
    setError('');
  }
  if (failed)
    return (
      <div className="stack">
        <section className="hero outcome failure">
          <XCircle className="hero-icon" />
          <div>
            <p className="eyebrow">CHECK-IN FAILED</p>
            <h1>QR Code Not Recognized</h1>
            <p>Code is invalid or unregistered</p>
          </div>
        </section>
        <Card>
          <h3 className="row">
            <TriangleAlert size={17} color="#ff353f" />
            Possible reasons
          </h3>
          <ul className="reasons">
            {[
              'QR code belongs to a different event',
              'Registration was not completed',
              'Code has been altered or corrupted',
              'Attendee registered under a different email',
            ].map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
        <button className="button full" onClick={reset}>
          <RefreshCw size={18} />
          Retry Scan
        </button>
        <Link className="button secondary full" href="/attendance">
          Manual Search
        </Link>
        <button className="text-button" onClick={reset}>
          Return to Scanner
        </button>
        <button className="button secondary full" onClick={() => setContact(true)}>
          <Phone size={18} />
          Contact Coordination Team
        </button>
        {contact && (
          <Modal title="Event coordination" onClose={() => setContact(false)}>
            <p>
              Please speak to the coordination team at the event registration desk. They can locate
              the attendee’s registration and confirm their entry pass.
            </p>
          </Modal>
        )}
      </div>
    );
  if (result) {
    const r = result.registration;
    return (
      <div className="stack">
        <section className="hero outcome success">
          <CheckCircle2 className="hero-icon" />
          <div>
            <h1>{result.already ? 'Already Checked In' : 'Participant Successfully Checked In'}</h1>
            <p className="row">
              <Clock size={13} />
              {new Date(r.checkedInAt!).toLocaleString('en-GB', {
                timeZone: 'Africa/Harare',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </section>
        <Card>
          <div className="row">
            <span className="avatar large">{initials(`${r.firstName} ${r.lastName}`)}</span>
            <div>
              <h2>
                {r.firstName} {r.lastName}
              </h2>
              <p className="muted">{r.organisation}</p>
              <span className="badge plenary">● {r.role}</span>
              <p>Registration status: Registered</p>
            </div>
          </div>
          <div className="next-session">
            <div>
              <span className="eyebrow">
                <Users size={12} />
                FIRST SESSION
              </span>
              <strong>Opening Plenary</strong>
            </div>
            <div>
              <span className="eyebrow">
                <MapPin size={12} />
                VENUE
              </span>
              <strong>Main Hall A</strong>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="eyebrow">EVENT ATTENDANCE</h2>
          <h3 className="mt-4">{count} of 110 attendees checked in</h3>
          <p className="muted mt-2">
            {result.already ? 'This attendee was already counted.' : 'Entry pass confirmed.'} · Main
            Hall A
          </p>
          <progress value={count} max={Math.max(110, count)} aria-label="Attendees checked in" />
        </Card>
        <Status error>{error}</Status>
        <button className="button full" onClick={reset}>
          <ScanLine size={20} />
          Scan Next Attendee
        </button>
        <Link className="text-button" href="/attendance">
          View attendance
        </Link>
      </div>
    );
  }
  return (
    <>
      <div className="page-heading">
        <h1>Event Check-In</h1>
        <p>Scan an attendee QR code to check them in</p>
      </div>
      <div className="stack">
        <section className="scanner">
          <div className="camera-view">
            <video
              ref={video}
              autoPlay
              playsInline
              muted
              aria-label="QR scanner camera"
              className={camera ? '' : 'hidden'}
            />
            <div className="scan-frame">
              <i />
              <i />
              <i />
              <i />
            </div>
            <p>Position QR code within the frame</p>
          </div>
          <div className="scanner-footer">
            <ScanLine size={20} />
            <span>
              {camera
                ? 'Hold camera steady · Auto-scans in 1–2 seconds'
                : 'Start the camera to scan an entry pass'}
            </span>
          </div>
        </section>
        <button
          className="button secondary full"
          disabled={busy}
          onClick={camera ? stop : startCamera}
        >
          {camera ? <CameraOff size={18} /> : <Camera size={18} />}{' '}
          {camera ? 'Stop Camera' : 'Start Camera'}
        </button>
        <Status error>{error}</Status>
        {demo && (
          <Card className="simulation">
            <h2 className="eyebrow">SIMULATE QR SCAN</h2>
            <p className="simulation-hint">Local demo attendees</p>
            {[
              {
                id: 'collin',
                name: 'Collin Manyande',
                role: 'Partner',
                code: 'OAK-2026-7842-XKPH',
              },
              { id: 'kayden', name: 'Kayden Mamu', role: 'Partner', code: 'OAK-2026-5592-FWBN' },
            ].map((p) => (
              <button
                disabled={busy}
                className="sample-person"
                key={p.id}
                onClick={() => scan(p.id, true)}
              >
                <span className="avatar small">{initials(p.name)}</span>
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.code}</small>
                </span>
                <span className={`badge ${p.role === 'OAK Staff' ? 'staff' : 'plenary'}`}>
                  ● {p.role}
                </span>
              </button>
            ))}
          </Card>
        )}
        <Card>
          <h2 className="eyebrow">MANUAL CODE ENTRY</h2>
          <form
            className="row manual-entry"
            onSubmit={(e) => {
              e.preventDefault();
              void scan(code);
            }}
          >
            <label className="sr-only" htmlFor="entry-code">
              Entry pass code
            </label>
            <input
              id="entry-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="OAK-2026-XXXX-XXXX"
              required
              maxLength={90}
              autoComplete="off"
            />
            <button className="button" disabled={busy}>
              {busy ? 'Checking…' : 'Check'}
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
