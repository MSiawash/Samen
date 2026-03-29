import { createClient } from '@supabase/supabase-js';

// Werkt met zowel Vite (import.meta.env) als Expo (process.env)
const env =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof process !== 'undefined' && process.env
      ? process.env
      : {};

const supabaseUrl =
  env.VITE_SUPABASE_URL ||
  env.EXPO_PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase configuratie ontbreekt. Maak een .env bestand aan met:\n' +
    'VITE_SUPABASE_URL=https://jouw-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=jouw-anon-key\n' +
    '(of EXPO_PUBLIC_ prefix voor Expo)'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
