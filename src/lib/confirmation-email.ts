import 'server-only';
import QRCode from 'qrcode';
import type { Registration } from './types';
import { event } from './data';
export async function sendConfirmation(entry: Registration) {
  if (entry.role !== 'Partner') return 'not-applicable';
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return 'not-configured';
  try {
    const png = await QRCode.toBuffer(entry.code, { width: 600, margin: 4 });
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `registration-${entry.id}`,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [entry.email],
        subject: 'Your OAK Foundation event registration',
        text: `You are registered, ${entry.firstName} ${entry.lastName}.\nOrganisation: ${entry.organisation}\nRegistration ID: ${entry.id}\nRole: ${entry.role}\nEvent: ${event.name}\nDates: ${event.dates}\nLocation: ${event.location}\nYour downloadable entry QR code is attached. Present it at event check-in.`,
        attachments: [{ filename: 'OAK-entry-pass.png', content: png.toString('base64') }],
      }),
    });
    return response.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}
