import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationSchema, codeSchema, noteSchema } from '../src/lib/validation';
const valid = {
  firstName: ' Maria ',
  lastName: 'Schmidt',
  organisation: 'Example Foundation',
  role: 'Partner',
  phone: '+263000000000',
  email: 'MARIA@EXAMPLE.ORG',
  consent: true,
};
test('registration normalizes contact details', () => {
  const result = registrationSchema.parse(valid);
  assert.equal(result.firstName, 'Maria');
  assert.equal(result.email, 'maria@example.org');
});
test('registration accepts exactly the reference roles', () => {
  for (const role of ['Partner', 'OAK Staff', 'Coordination Team', 'Presenter', 'Observer'])
    assert.equal(registrationSchema.safeParse({ ...valid, role }).success, true);
  for (const role of ['', 'Speaker', 'Facilitator', 'Guest'])
    assert.equal(registrationSchema.safeParse({ ...valid, role }).success, false);
});
test('registration rejects missing consent, invalid email, and unrecognised role', () => {
  for (const patch of [
    { consent: false },
    { email: 'not-an-email' },
    { role: 'admin' },
    { firstName: '' },
  ])
    assert.equal(registrationSchema.safeParse({ ...valid, ...patch }).success, false);
});
test('registration caps sensitive free-text fields', () => {
  assert.equal(registrationSchema.safeParse({ ...valid, dietary: 'a'.repeat(501) }).success, false);
});
test('pass codes normalize and reject unrelated codes', () => {
  assert.equal(codeSchema.parse(' oak-2026-7842-xkph '), 'OAK-2026-7842-XKPH');
  assert.equal(codeSchema.safeParse('https://malicious.example').success, false);
});
test('notes require meaningful text and a valid event day', () => {
  assert.equal(
    noteSchema.safeParse({
      name: 'Maria',
      organisation: 'Example',
      text: 'A useful session insight.',
      day: 4,
    }).success,
    false,
  );
  assert.equal(
    noteSchema.safeParse({ name: 'Maria', organisation: 'Example', text: '', day: 1 }).success,
    false,
  );
});
