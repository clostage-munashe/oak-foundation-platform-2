import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { cookies } from 'next/headers';
import { adminClient } from './supabase/admin';
import { createClient } from './supabase/server';
import { isConfigured } from './supabase/config';
import { initialNotes, partners, sessions } from './data';
import type { Registration, Note, Partner, Session } from './types';
type LocalData = { registrations: Registration[]; notes: Note[] };
const localFile = path.join(process.cwd(), '.data', 'demo.json');
const demoRuntime = globalThis as typeof globalThis & { oakDemoQueue?: Promise<unknown> };
async function localRead(): Promise<LocalData> {
  let data: LocalData;
  try {
    data = JSON.parse(await readFile(localFile, 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    data = { registrations: [], notes: [...initialNotes] };
  }
  // These fixed, synthetic passes are available only in the local demo.
  const samples = [
    ['collin', 'Collin', 'Manyande', 'Partner', 'OAK-2026-7842-XKPH'],
    ['james', 'James', 'Odhiambo', 'OAK Staff', 'OAK-2026-1193-JWQA'],
    ['awa', 'Awa', 'Diallo', 'Coordination Team', 'OAK-2026-8832-KLPT'],
    ['kayden', 'Kayden', 'Mamu', 'Partner', 'OAK-2026-5592-FWBN'],
  ];
  for (const [id, firstName, lastName, role, code] of samples) {
    const email = `${id}@example.test`;
    if (data.registrations.some((r) => r.email === email)) continue;
    data.registrations.push({
      id: `demo-${id}`,
      code: role === 'Partner' ? code : '',
      firstName,
      lastName,
      role,
      email,
      organisation: role === 'OAK Staff' ? 'OAK Foundation' : 'Open Society Foundations',
      programmeArea: '',
      phone: '',
      dietary: '',
      accessibility: '',
      travel: '',
      consent: true,
      createdAt: '2026-03-01T09:00:00.000Z',
      checkedInAt: null,
    });
  }
  return data;
}
function mutate<T>(fn: (data: LocalData) => T): Promise<T> {
  const task = (demoRuntime.oakDemoQueue ?? Promise.resolve()).then(async () => {
    const data = await localRead();
    const result = fn(data);
    await mkdir(path.dirname(localFile), { recursive: true });
    const temp = localFile + '.tmp';
    await writeFile(temp, JSON.stringify(data, null, 2));
    await rename(temp, localFile);
    return result;
  });
  demoRuntime.oakDemoQueue = task.catch(() => {});
  return task;
}
export async function staffUser() {
  if (!isConfigured()) return null;
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const { data, error } = await client
    .from('staff')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return user;
}
export async function content() {
  if (!isConfigured()) return { partners, sessions, notes: (await localRead()).notes };
  const client = adminClient();
  const results = await Promise.all([
    client.from('partners').select('data').order('position'),
    client.from('sessions').select('data').order('position'),
    client.from('notes').select('data').order('created_at'),
  ]);
  for (const result of results)
    if (result.error)
      throw new Error('Unable to load event content. Check the database migration.');
  return {
    partners: results[0].data!.map((r) => r.data) as Partner[],
    sessions: results[1].data!.map((r) => r.data) as Session[],
    notes: results[2].data!.map((r) => r.data) as Note[],
  };
}
export async function register(
  input: Omit<Registration, 'id' | 'code' | 'createdAt' | 'checkedInAt'>,
) {
  const entry: Registration = {
    ...input,
    id: randomUUID(),
    code:
      input.role === 'Partner' ? 'OAK-2026-' + randomBytes(16).toString('hex').toUpperCase() : '',
    sessionToken: randomBytes(32).toString('hex'),
    createdAt: new Date().toISOString(),
    checkedInAt: null,
  };
  if (!isConfigured())
    return mutate((data) => {
      if (data.registrations.some((r) => r.email === entry.email))
        throw new Error(
          'This email is already registered. Use your saved pass or contact event staff.',
        );
      data.registrations.push(entry);
      return entry;
    });
  const { sessionToken: _sessionToken, ...storedEntry } = entry;
  const { error } = await adminClient()
    .from('registrations')
    .insert({
      id: entry.id,
      code: entry.code || null,
      email: entry.email,
      data: storedEntry,
      session_token_hash: createHash('sha256').update(entry.sessionToken!).digest('hex'),
      session_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  if (error) {
    if (error.code === '23505')
      throw new Error(
        'This email is already registered. Use your saved pass or contact event staff.',
      );
    throw new Error('Registration could not be saved. Please try again.');
  }
  return entry;
}
export async function findRegistration(code: string) {
  if (!isConfigured())
    return (await localRead()).registrations.find((r) => r.code === code) ?? null;
  const { data, error } = await adminClient()
    .from('registrations')
    .select('data,checked_in_at')
    .eq('code', code)
    .maybeSingle();
  if (error) throw new Error('Unable to retrieve registration.');
  return data ? ({ ...data.data, checkedInAt: data.checked_in_at } as Registration) : null;
}
export async function myRegistration() {
  const token = (await cookies()).get('oak-session')?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  if (!isConfigured())
    return (
      (await localRead()).registrations.find(
        (r) =>
          r.sessionToken === token &&
          new Date(r.createdAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000,
      ) ?? null
    );
  const client = adminClient();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { data: current, error } = await client
    .from('registrations')
    .select('data,checked_in_at')
    .eq('session_token_hash', tokenHash)
    .gt('session_expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error('Unable to retrieve your registration.');
  if (current) return { ...current.data, checkedInAt: current.checked_in_at } as Registration;

  // Migrate a still-valid 001/002-era session on its next use, then remove its raw token.
  const validSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: legacy, error: legacyError } = await client
    .from('registrations')
    .select('id,data,checked_in_at')
    .eq('data->>sessionToken', token)
    .is('session_token_hash', null)
    .gt('created_at', validSince)
    .maybeSingle();
  if (legacyError) throw new Error('Unable to retrieve your registration.');
  if (!legacy) return null;
  const { sessionToken: _legacyToken, ...storedData } = legacy.data;
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error: migrationError } = await client
    .from('registrations')
    .update({
      data: storedData,
      session_token_hash: tokenHash,
      session_expires_at: sessionExpiresAt,
    })
    .eq('id', legacy.id)
    .is('session_token_hash', null);
  if (migrationError) throw new Error('Unable to secure your registration session.');
  return { ...storedData, checkedInAt: legacy.checked_in_at } as Registration;
}
export async function allRegistrations() {
  if (!isConfigured()) return (await localRead()).registrations;
  const { data, error } = await adminClient()
    .from('registrations')
    .select('data,checked_in_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error('Unable to load attendance.');
  return data.map((r) => ({ ...r.data, checkedInAt: r.checked_in_at })) as Registration[];
}
export async function checkIn(code: string) {
  if (!isConfigured())
    return mutate((data) => {
      const r = data.registrations.find((r) => r.code === code);
      if (!r || r.role !== 'Partner') return null;
      const already = !!r.checkedInAt;
      r.checkedInAt ??= new Date().toISOString();
      return { registration: r, already };
    });
  const candidate = await findRegistration(code);
  if (!candidate || candidate.role !== 'Partner') return null;
  const client = adminClient();
  const { data, error } = await client
    .from('registrations')
    .update({ checked_in_at: new Date().toISOString() })
    .eq('code', code)
    .is('checked_in_at', null)
    .select('data,checked_in_at')
    .maybeSingle();
  if (error) throw new Error('Check-in could not be saved.');
  if (data)
    return {
      registration: { ...data.data, checkedInAt: data.checked_in_at } as Registration,
      already: false,
    };
  const registration = await findRegistration(code);
  return registration ? { registration, already: true } : null;
}
export async function addNote(input: Omit<Note, 'id' | 'time'>) {
  const note = {
    ...input,
    id: randomUUID(),
    time: new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Harare',
    }),
  };
  if (!isConfigured())
    return mutate((data) => {
      data.notes.push(note);
      return note;
    });
  const { error } = await adminClient().from('notes').insert({ id: note.id, data: note });
  if (error) throw new Error('Could not save your note.');
  return note;
}

export async function updateNote(id: string, ownerId: string, input: Omit<Note, 'id' | 'time'>) {
  if (!isConfigured())
    return mutate((data) => {
      const note = data.notes.find((n) => n.id === id && n.ownerId === ownerId);
      if (!note) throw new Error('Note not found.');
      Object.assign(note, input);
      return note;
    });
  const client = adminClient();
  const { data } = await client
    .from('notes')
    .select('data')
    .eq('id', id)
    .eq('data->>ownerId', ownerId)
    .maybeSingle();
  if (!data) throw new Error('Note not found.');
  const note = { ...data.data, ...input };
  const { error } = await client
    .from('notes')
    .update({ data: note })
    .eq('id', id)
    .eq('data->>ownerId', ownerId);
  if (error) throw new Error('Could not update note.');
  return note as Note;
}

export async function recordEmailStatus(entry: Registration, emailStatus: string) {
  entry.emailStatus = emailStatus;
  if (!isConfigured())
    return mutate((data) => {
      const row = data.registrations.find((r) => r.id === entry.id);
      if (row) row.emailStatus = emailStatus;
    });
  const { error } = await adminClient()
    .from('registrations')
    .update({ data: Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'sessionToken')) })
    .eq('id', entry.id);
  if (error) throw new Error('Email status could not be saved.');
}
