import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase configuratie ontbreekt. Maak een .env bestand aan met:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key'
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
