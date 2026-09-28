import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3000';
const home = await fetch(base).then((r) => r.text());
assert(home.includes('Local demo'), 'Run only against local demo');
const run = Date.now();
const roles = ['Partner', 'OAK Staff', 'Coordination Team', 'Presenter', 'Observer'];
const users = [];
async function call(path, cookie, body) {
  const r = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return r;
}
for (const [i, role] of roles.entries()) {
  const r = await call('/api/register', '', {
    firstName: 'Requirements QA',
    lastName: String(i),
    organisation: 'Synthetic Test',
    email: `requirements-${run}-${i}@example.test`,
    phone: '+263000000000',
    role,
    consent: true,
    accommodation: 'Test room',
    travel: 'Test travel',
  });
  assert.equal(r.status, 201, await r.clone().text());
  const { registration } = await r.json();
  const cookie = r.headers.get('set-cookie').split(';')[0];
  assert.equal(registration.sessionToken, undefined);
  assert.equal(Boolean(registration.code), role === 'Partner');
  users.push({ cookie, registration });
  for (const page of ['/check-in', '/attendance', '/programme', '/partners', '/qr-code']) {
    const allowed =
      page === '/qr-code'
        ? role === 'Partner'
        : ['/check-in', '/attendance'].includes(page)
          ? role === 'Coordination Team'
          : role !== 'Partner';
    const response = await call(page, cookie);
    const html = await response.text();
    const redirected = response.status === 307 || html.includes('NEXT_REDIRECT');
    assert.equal(redirected, !allowed, `${role} ${page}`);
  }
  assert.equal(
    (await call('/api/attendance', cookie)).status,
    role === 'Coordination Team' ? 200 : 403,
  );
}
assert.equal((await call('/api/attendance', '')).status, 403);
const partner = users[0],
  coordinator = users[2],
  presenter = users[3];
const first = await call('/api/check-in', coordinator.cookie, {
  code: partner.registration.code,
}).then((r) => r.json());
assert.equal(first.already, false);
assert.equal(first.registration.sessionToken, undefined);
const again = await call('/api/check-in', coordinator.cookie, {
  code: partner.registration.code,
}).then((r) => r.json());
assert.equal(again.already, true);
assert.equal(first.registration.checkedInAt, again.registration.checkedInAt);
assert.equal(
  (await call('/api/check-in', presenter.cookie, { code: partner.registration.code })).status,
  403,
);
assert.equal((await call('/api/check-in', coordinator.cookie, { code: 'invalid' })).status, 404);
const note = await call('/api/notes', presenter.cookie, {
  text: 'Private requirements test note',
  day: 1,
  sessionId: 'opening',
}).then((r) => r.json());
assert(note.note?.id, JSON.stringify(note));
const edit = await call('/api/notes', presenter.cookie, {
  id: note.note.id,
  text: 'Edited private requirements note',
  day: 1,
  sessionId: 'opening',
}).then((r) => r.json());
assert.equal(edit.note.text, 'Edited private requirements note');
assert.equal(
  (
    await call('/api/notes', coordinator.cookie, {
      id: note.note.id,
      text: 'Cross-user edit blocked',
      day: 1,
      sessionId: 'opening',
    })
  ).status,
  404,
);
const other = await call('/programme?tab=docs', users[4].cookie).then((r) => r.text());
assert(!other.includes('Edited private requirements note'));
console.log(
  'PASS: all five role journeys, 25 page access checks, API access, Partner-only QR, duplicate check-in, note editing and privacy',
);
