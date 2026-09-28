export const isConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (Boolean(url) !== Boolean(key)) {
    throw new Error(
      'Set both public Supabase environment variables, or leave both blank for local demo mode.',
    );
  }
  return Boolean(url && key);
};
