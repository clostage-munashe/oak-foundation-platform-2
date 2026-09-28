'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Status, requestJson } from './ui';
import { Dropdown } from './dropdown';
import { registrationRoles } from '@/lib/roles';
type Person = {
  id: string;
  firstName: string;
  lastName: string;
  organisation: string;
  role: string;
  createdAt: string;
  checkedInAt: string | null;
};
export function Attendance({ initial }: { initial: Person[] }) {
  const [people, setPeople] = useState(initial),
    [query, setQuery] = useState(''),
    [role, setRole] = useState(''),
    [status, setStatus] = useState(''),
    [error, setError] = useState('');
  async function refresh() {
    try {
      setPeople((await requestJson('/api/attendance')).registrations);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, []);
  const checked = people.filter((p) => p.checkedInAt).length;
  const filtered = people.filter(
    (p) =>
      `${p.firstName} ${p.lastName} ${p.organisation}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!role || p.role === role) &&
      (!status || (status === 'attended' ? !!p.checkedInAt : !p.checkedInAt)),
  );
  const format = (value: string) =>
    new Date(value).toLocaleString('en-GB', {
      timeZone: 'Africa/Harare',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  return (
    <>
      <div className="page-heading">
        <h1>Attendance</h1>
        <p>Registration and check-in tracking · 9–11 November 2026</p>
      </div>
      <div className="stack">
        <div className="stats-grid">
          {[
            [people.length, 'Registered'],
            [checked, 'Attendees'],
            [
              `${people.length ? Math.round((checked / people.length) * 100) : 0}%`,
              'Attendance rate',
            ],
          ].map(([value, label]) => (
            <Card className="stat" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </Card>
          ))}
        </div>
        <Card>
          <h2>Role breakdown</h2>
          <dl className="details">
            {registrationRoles.map((r) => (
              <div key={r}>
                <dt>{r}</dt>
                <dd>{people.filter((p) => p.role === r).length}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <div className="row between">
            <h2>Participants</h2>
            <button className="text-button" onClick={refresh}>
              Refresh
            </button>
          </div>
          <div className="form-stack mt-4">
            <input
              aria-label="Search participants"
              placeholder="Search name or organisation…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div>
              <div className="field">
                <span>Role</span>
                <Dropdown
                  name="role"
                  label="Filter by role"
                  onValueChange={setRole}
                  options={[
                    { value: '', label: 'All roles' },
                    ...registrationRoles.map((r) => ({ value: r, label: r })),
                  ]}
                />
              </div>
              <div className="field mt-4">
                <span>Attendance status</span>
                <Dropdown
                  name="status"
                  label="Attendance status"
                  onValueChange={setStatus}
                  options={[
                    { value: '', label: 'All participants' },
                    { value: 'attended', label: 'Attended' },
                    { value: 'pending', label: 'Not checked in' },
                  ]}
                />
              </div>
            </div>
          </div>
          <div className="attendance-list">
            {filtered.map((p) => (
              <div key={p.id} style={{ padding: '18px 0', borderBottom: '1px solid var(--line)' }}>
                <div className="row between">
                  <strong>
                    {p.firstName} {p.lastName}
                  </strong>
                  <span className="pill">{p.checkedInAt ? 'Attended' : 'Registered'}</span>
                </div>
                <p>
                  {p.organisation} · {p.role}
                </p>
                <small className="muted">
                  Registered: {format(p.createdAt)}
                  <br />
                  Check-in: {p.checkedInAt ? format(p.checkedInAt) : 'Not checked in'}
                </small>
              </div>
            ))}
            {!filtered.length && <p className="muted py-5">No participants match these filters.</p>}
          </div>
          <Link className="button full mt-4" href="/check-in">
            Open Check-in Scanner
          </Link>
        </Card>
        <Status error>{error}</Status>
      </div>
    </>
  );
}
