import 'server-only';
import { createClient } from '@supabase/supabase-js';
export function adminClient() {
  if (!process.env.SUPABASE_SECRET_KEY)
    throw new Error('Supabase server key is missing. Complete .env.local setup.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
