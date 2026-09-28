import { NextRequest, NextResponse } from 'next/server';
import { isConfigured } from './supabase/config';
import { staffUser } from './repository';
import { currentRole } from './access';
import { createHmac } from 'node:crypto';
import { adminClient } from './supabase/admin';
export function fail(error: unknown, requestedStatus?: number) {
  const attachedStatus =
    error instanceof Error && 'status' in error && typeof error.status === 'number'
      ? error.status
      : undefined;
  const status = requestedStatus ?? attachedStatus ?? 500;
  return NextResponse.json(
    {
      error:
        status < 500 && error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
    },
    { status },
  );
}
export function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}
export async function readJson(request: Request, maxBytes = 16_000): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw httpError('Request body is too large.', 413);
  if (!request.body) throw httpError('Request body must be valid JSON.', 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw httpError('Request body is too large.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw httpError('Request body must be valid UTF-8 JSON.', 400);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw httpError('Request body must be valid JSON.', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw httpError('Request body must be a JSON object.', 400);
  return body as Record<string, unknown>;
}
export function guard(request: NextRequest) {
  if (!isConfigured() && !['localhost', '127.0.0.1', '[::1]'].includes(request.nextUrl.hostname))
    throw httpError('Connect Supabase before using this app on a public host.', 503);
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get('host'))
        throw httpError('Request origin is not allowed.', 403);
    } catch (error) {
      if (error instanceof Error && 'status' in error) throw error;
      throw httpError('Request origin is not allowed.', 403);
    }
  }
}
export async function requireStaff() {
  if (!isConfigured() && (await currentRole()) === 'Coordination Team') return;
  if (!(await staffUser()))
    throw httpError('Coordination Team access is required.', 403);
}

/** Distributed fixed-window throttling; rate-limit keys contain no raw IP addresses. */
export async function rateLimit(request: NextRequest, scope: string, limit: number, seconds: number) {
  const forwarded = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for');
  const address = (forwarded?.split(',')[0]?.trim() || 'unknown').slice(0, 128);
  const secret = process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (isConfigured()) {
    if (!secret) throw new Error('Rate limiting is not configured.');
    const key = createHmac('sha256', secret).update(`${scope}:${address}`).digest('hex');
    const { data, error } = await adminClient().rpc('consume_api_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: seconds,
    });
    if (error) throw new Error('Request protection is temporarily unavailable.');
    if (!data) throw httpError('Too many requests. Please try again later.', 429);
    return;
  }

  // Local-only fallback for the localhost demo; production always uses the atomic SQL function.
  const memory = globalThis as typeof globalThis & { oakRateLimits?: Map<string, { start: number; count: number }> };
  const buckets = (memory.oakRateLimits ??= new Map());
  const now = Date.now();
  const id = `${scope}:${address}`;
  let bucket = buckets.get(id);
  if (!bucket || now - bucket.start >= seconds * 1000) {
    bucket = { start: now, count: 0 };
    buckets.set(id, bucket);
  }
  bucket.count++;
  if (bucket.count > limit * 20)
    throw httpError('Too many requests. Please try again later.', 429);
  if (buckets.size > 10_000)
    for (const [key, value] of buckets) if (now - value.start >= 3_600_000) buckets.delete(key);
}
