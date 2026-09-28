'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, ChevronLeft, ExternalLink, Globe, Mail } from 'lucide-react';
import type { Partner } from '@/lib/types';
import { initials } from '@/lib/data';
import { Card, Modal } from './ui';
export function PartnerDirectory({ partners }: { partners: Partner[] }) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All Regions');
  const regions = ['All Regions', ...Array.from(new Set(partners.map((p) => p.region)))];
  const filtered = partners.filter(
    (p) =>
      (region === 'All Regions' || p.region === region) &&
      `${p.name} ${p.tags.join(' ')} ${p.region}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <h1>Partner Directory</h1>
      </div>
      <Card className="directory-search">
        <label className="sr-only" htmlFor="partner-search">
          Search organisations or focus areas
        </label>
        <input
          id="partner-search"
          placeholder="Search organisations, focus areas…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="region-filters" aria-label="Filter partners by region">
          {regions.map((r) => (
            <button
              className={region === r ? 'selected' : ''}
              key={r}
              aria-pressed={region === r}
              onClick={() => setRegion(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </Card>
      <p className="eyebrow directory-label">SUB-PARTNERS</p>
      <div className="subpartners">
        {partners.slice(0, 3).map((p) => (
          <Link href={`/partners/${p.id}`} className="card" key={p.id}>
            <span className="avatar">{p.initials}</span>
            <strong>{p.initials}</strong>
            <small>{p.region}</small>
          </Link>
        ))}
      </div>
      <p className="eyebrow directory-label">ALL PARTNERS</p>
      <div className="stack partner-list">
        {filtered.map((p) => (
          <article className="card partner-card" key={p.id}>
            <Link className="partner-main" href={`/partners/${p.id}`}>
              <span className="avatar">{p.initials}</span>
              <div>
                <h3>{p.name}</h3>
                <p>{p.region}</p>
                <div className="tags">
                  <span className={`tag category ${p.category.toLowerCase()}`}>{p.category}</span>
                  {p.tags.slice(0, 2).map((t) => (
                    <span className="tag" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight size={16} />
            </Link>
            <div className="partner-footer">
              <span>Partner since {p.since}</span>
              <a href={`https://${p.website}`} target="_blank" rel="noreferrer">
                {p.website}
                <ExternalLink size={12} />
              </a>
            </div>
          </article>
        ))}
        {!filtered.length && (
          <Card className="empty-state">
            <h2>No partners found</h2>
            <p>Try another organisation, focus area or region.</p>
            <button
              className="button small"
              onClick={() => {
                setQuery('');
                setRegion('All Regions');
              }}
            >
              Clear filters
            </button>
          </Card>
        )}
      </div>
    </>
  );
}
export function PartnerDetail({ partner: p }: { partner: Partner }) {
  const [message, setMessage] = useState(false);
  return (
    <>
      <Link href="/partners" className="back-link">
        <ChevronLeft size={16} />
        Partner Directory
      </Link>
      <div className="stack partner-detail">
        <section className="hero">
          <div className="row">
            <span className="avatar large">{p.initials}</span>
            <div>
              <p className="eyebrow">
                {p.category.toUpperCase()} · PARTNER SINCE {p.since}
              </p>
              <h1>{p.name}</h1>
            </div>
          </div>
          <div className="tags">
            {p.tags.map((t) => (
              <span className="tag" key={t}>
                {t}
              </span>
            ))}
          </div>
        </section>
        <Card>
          <h2 className="eyebrow">ABOUT</h2>
          <p className="about-copy">{p.about}</p>
        </Card>
        <Card>
          <h2 className="eyebrow">CONTACT AT CONVENING</h2>
          <div className="row contact">
            <span className="avatar">{initials(p.contact)}</span>
            <div>
              <h3>{p.contact}</h3>
              <p className="muted">{p.email || 'Contact details available from event staff'}</p>
            </div>
          </div>
        </Card>
        <a
          href={`https://${p.website}`}
          target="_blank"
          rel="noreferrer"
          className="button full partner-action"
        >
          <Globe size={18} />
          Visit Website
          <ExternalLink size={16} />
        </a>
        <button className="button secondary full partner-action" onClick={() => setMessage(true)}>
          <Mail size={18} />
          Send Message
          <ChevronRight size={16} />
        </button>
      </div>
      {message && (
        <Modal title={`Message ${p.contact}`} onClose={() => setMessage(false)}>
          {p.email ? (
            <>
              <p>This opens your email app with the partner’s contact address.</p>
              <a
                className="button full mt-5"
                href={`mailto:${p.email}?subject=OAK%20Partner%20Convening%202026`}
                onClick={() => setMessage(false)}
              >
                <Mail size={18} />
                Open email app
              </a>
            </>
          ) : (
            <p>
              A contact email was not supplied for this partner. Please speak to the coordination
              team at the event registration desk.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
