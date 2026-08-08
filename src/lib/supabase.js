import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

const supabaseUrl = Config.SUPABASE_URL || 'https://bluqahzgizrschligjri.supabase.co';
const supabaseAnonKey = Config.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsdXFhaHpnaXpyc2NobGlnanJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NjczOTUsImV4cCI6MjEwMTI0MzM5NX0.OCDp21bH7tibcHQOh7xweejqG2wU7Zdxcvt0gBbNDUY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[MedScan] Supabase keys missing in env config');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});