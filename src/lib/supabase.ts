import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qtulldwcmblyfiyfqmuw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Ej1mRFc52xPkkkt7ONnf6A_HCRgzUqw';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment configuration.');
}

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
