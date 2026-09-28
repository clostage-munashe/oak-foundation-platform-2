'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Star,
  MapPin,
  ChevronDown,
  NotebookPen,
  ImageIcon,
  Lightbulb,
  Download,
  FileText,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Session, Note } from '@/lib/types';
import { initials, takeaways, resources } from '@/lib/data';
import { Card, Modal, Status, requestJson } from './ui';
import { Dropdown } from './dropdown';
export function Programme({
  sessions,
  initialNotes,
}: {
  sessions: Session[];
  initialNotes: Note[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const docs = params.get('tab') === 'docs';
  const day = Math.max(1, Math.min(3, Number(params.get('day')) || 1));
  const [notes, setNotes] = useState(initialNotes);
  const [editing, setEditing] = useState<Note | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<number | null>(null);
  const [resourceError, setResourceError] = useState('');
  const featured = sessions.find((s) => s.day === day && s.featured);
  const photoLabels = [
    'Convening audience',
    'Microphone and event gathering',
    'Participants sharing ideas',
    'Conference room',
    'Partner presentation',
    'Arrival at the convening',
  ];
  function navigate(tab: string, d = day) {
    router.replace(`/programme?tab=${tab}&day=${d}`, { scroll: false });
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const result = await requestJson('/api/notes', {
        ...Object.fromEntries(form),
        day: Number(form.get('day')),
        id: editing?.id,
      });
      setNotes(
        editing
          ? notes.map((n) => (n.id === editing.id ? result.note : n))
          : [...notes, result.note],
      );
      setAdding(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function download(id: string) {
    setResourceError('');
    try {
      const result = await requestJson(`/api/resources/${id}`);
      window.location.assign(result.url);
    } catch (e) {
      setResourceError((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-heading">
        <h1>Programme</h1>
        <p>OAK Partner Convening 2026</p>
      </div>
      <div className="segmented" aria-label="Programme view">
        <button
          aria-pressed={!docs}
          className={!docs ? 'selected' : ''}
          onClick={() => navigate('schedule')}
        >
          Schedule
        </button>
        <button
          aria-pressed={docs}
          className={docs ? 'selected' : ''}
          onClick={() => navigate('docs')}
        >
          Docs
        </button>
      </div>
      {!docs ? (
        <>
          <div className="day-grid">
            {['MON', 'TUE', 'WED'].map((label, i) => (
              <button
                key={label}
                aria-pressed={day === i + 1}
                onClick={() => navigate('schedule', i + 1)}
                className={`card day-card ${day === i + 1 ? 'selected' : ''}`}
              >
                <span className="eyebrow">{label}</span>
                <strong>Day {i + 1}</strong>
                <span>{9 + i} Nov</span>
              </button>
            ))}
          </div>
          {featured && (
            <section className="featured">
              <div className="row eyebrow">
                <Star size={14} fill="currentColor" />
                FEATURED<span>·</span>
                <span>
                  {featured.time} – {featured.end}
                </span>
              </div>
              <h2>{featured.title}</h2>
              <p className="row">
                <span className="mini-avatar">{featured.speaker[0]}</span>
                {featured.speaker}
              </p>
              <p className="row">
                <MapPin size={14} />
                {featured.venue}
              </p>
              <details className="mt-4">
                <summary>View session details</summary>
                <p>{featured.description}</p>
              </details>
            </section>
          )}
          <div className="legend">
            {['Plenary', 'Breakout', 'Workshop', 'Social'].map((type) => (
              <span key={type}>
                <i className={`dot ${type.toLowerCase()}`} />
                {type}
              </span>
            ))}
          </div>
          <div className="schedule-list">
            {sessions
              .filter((s) => s.day === day && !s.featured)
              .map((s) =>
                s.type === 'Break' ? (
                  <div className="break-row" key={s.id}>
                    <time>{s.time}</time>
                    <span />
                    <p>{s.title}</p>
                    <span />
                  </div>
                ) : (
                  <details className="card session" key={s.id}>
                    <summary>
                      <div className="session-time">
                        <strong>{s.time}</strong>
                        <span>–{s.end}</span>
                      </div>
                      <div className="session-body">
                        <div className="session-title">
                          <h3>{s.title}</h3>
                          <span className={`badge ${s.type.toLowerCase()}`}>● {s.type}</span>
                        </div>
                        {s.speaker && <p>{s.speaker}</p>}
                        <p className="row">
                          <MapPin size={13} />
                          {s.venue}
                        </p>
                      </div>
                      <ChevronDown className="disclosure" size={15} />
                    </summary>
                    <p className="session-description">{s.description}</p>
                  </details>
                ),
              )}
          </div>
        </>
      ) : (
        <div className="docs stack">
          <section>
            <div className="section-title row between">
              <h2 className="row">
                <NotebookPen size={19} />
                My Session Notes
              </h2>
              <button
                className="button small"
                onClick={() => {
                  setEditing(null);
                  setAdding(true);
                  setError('');
                }}
              >
                <Plus size={13} />
                Add Note
              </button>
            </div>
            <div className="stack notes-list">
              {notes.map((note) => (
                <Card key={note.id} className="note">
                  <div className="note-header">
                    <span className="avatar small">{initials(note.name)}</span>
                    <div>
                      <strong>{note.name}</strong>
                      <small>{note.organisation}</small>
                    </div>
                    <span className="time-label">
                      Day {note.day} · {note.time}
                    </span>
                  </div>
                  <p className="muted">{sessions.find((s) => s.id === note.sessionId)?.title}</p>
                  <p>{note.text}</p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditing(note);
                      setAdding(true);
                    }}
                  >
                    Edit note
                  </button>
                </Card>
              ))}
            </div>
          </section>
          <section>
            <div className="section-title row between">
              <h2 className="row">
                <ImageIcon size={19} />
                Photo Gallery
              </h2>
              <span className="time-label">6 photos</span>
            </div>
            <div className="gallery">
              {photoLabels.map((label, i) => (
                <button
                  key={label}
                  aria-label={`View photo ${i + 1}: ${label}`}
                  onClick={() => setPhoto(i)}
                >
                  <img
                    src={`/gallery/${i + 1}.jpg`}
                    alt={label}
                    width={260}
                    height={190}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2 className="section-title row">
              <Lightbulb size={20} />
              Key Takeaways
            </h2>
            <Card>
              <ol className="takeaways">
                {takeaways.map((t, i) => (
                  <li key={t}>
                    <span>{i + 1}</span>
                    <p>{t}</p>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
          <section>
            <h2 className="section-title row">
              <Download size={19} />
              Resources
            </h2>
            <div className="stack resource-list">
              {resources.map((r) => (
                <button key={r.id} onClick={() => download(r.id)} className="card resource">
                  <span className="file-icon">
                    <FileText size={18} />
                  </span>
                  <span>
                    <strong>{r.name}</strong>
                    <small>{r.detail}</small>
                  </span>
                  <Download size={17} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {adding && (
        <Modal
          title={editing ? 'Edit session note' : 'Add a session note'}
          onClose={() => setAdding(false)}
        >
          <form className="form-stack" onSubmit={save}>
            <label className="field">
              <span>Your name</span>
              <input
                name="name"
                defaultValue={editing?.name}
                required
                maxLength={160}
                autoComplete="name"
              />
            </label>
            <label className="field">
              <span>Organisation</span>
              <input
                name="organisation"
                defaultValue={editing?.organisation}
                required
                maxLength={160}
              />
            </label>
            <div className="field">
              <span>Day</span>
              <Dropdown
                name="day"
                label="Day"
                defaultValue={String(editing?.day ?? day)}
                options={[1, 2, 3].map((d) => ({
                  value: String(d),
                  label: `Day ${d} · ${8 + d} November`,
                }))}
              />
            </div>
            <div className="field">
              <span>Session</span>
              <Dropdown
                name="sessionId"
                label="Session"
                required
                defaultValue={editing?.sessionId ?? ''}
                options={[
                  { value: '', label: 'Select a session', disabled: true },
                  ...sessions
                    .filter((s) => s.type !== 'Break')
                    .map((s) => ({ value: s.id, label: `Day ${s.day} · ${s.title}` })),
                ]}
              />
            </div>
            <label className="field">
              <span>Session note</span>
              <textarea
                name="text"
                defaultValue={editing?.text}
                required
                minLength={5}
                maxLength={3000}
                placeholder="Share an insight or a follow-up from your session…"
              />
            </label>
            <Status error>{error}</Status>
            <button className="button" disabled={busy}>
              {busy ? 'Saving…' : 'Save note'}
            </button>
          </form>
        </Modal>
      )}
      {photo !== null && (
        <Modal title={`Photo ${photo + 1} of 6`} onClose={() => setPhoto(null)}>
          <img
            className="lightbox-image"
            src={`/gallery/${photo + 1}.jpg`}
            alt={photoLabels[photo]}
          />
          <p className="muted">{photoLabels[photo]}</p>
          <div className="row between photo-controls">
            <button className="button secondary small" onClick={() => setPhoto((photo + 5) % 6)}>
              <ChevronLeft size={15} />
              Previous
            </button>
            <button className="button secondary small" onClick={() => setPhoto((photo + 1) % 6)}>
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {resourceError && (
        <Modal title="Resource unavailable" onClose={() => setResourceError('')}>
          <p>{resourceError}</p>
          <button className="button full mt-5" onClick={() => setResourceError('')}>
            Close
          </button>
        </Modal>
      )}
    </>
  );
}
