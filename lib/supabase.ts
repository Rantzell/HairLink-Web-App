import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase project credentials!
const supabaseUrl = 'https://hbnofwekvtofejiwwfye.supabase.co';
const supabaseAnonKey = 'sb_publishable_QhHk0ry9_yLI2WLZOkxlpQ_pDKKuSkP';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
