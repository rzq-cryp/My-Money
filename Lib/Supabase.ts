import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Pastikan URL valid dan bertipe HTTP/HTTPS
const validUrl = supabaseUrl && supabaseUrl.startsWith('http') 
  ? supabaseUrl 
  : 'https://xrfbmkaizayfeiqyeiwj.supabase.co/rest/v1/';

const validKey = supabaseAnonKey || 'placeholder';

export const supabase = createClient(validUrl, validKey);