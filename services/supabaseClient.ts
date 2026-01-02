import { createClient } from '@supabase/supabase-js';

// Access environment variables directly using Vite's import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing. Please check your .env file.');
  alert("Configuration Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in .env");
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');