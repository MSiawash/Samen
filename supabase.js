import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Vite gebruikt import.meta.env, Expo gebruikt process.env
const supabaseUrl =
  import.meta.env?.VITE_SUPABASE_URL ||
  import.meta.env?.EXPO_PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  import.meta.env?.VITE_SUPABASE_ANON_KEY ||
  import.meta.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase configuratie ontbreekt. Maak een .env bestand aan met:\n' +
    'VITE_SUPABASE_URL=https://jouw-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=jouw-anon-key'
  );
}

// Gebruik een placeholder URL als fallback zodat de app niet crasht zonder .env
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
