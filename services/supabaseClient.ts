import { createClient } from '@supabase/supabase-js';

// Fallbacks provided to ensure app works even if environment variables aren't loaded immediately
const FALLBACK_URL = "https://fajxfdxgsyhfertanffo.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhanhmZHhnc3loZmVydGFuZmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MjE3MDAsImV4cCI6MjA4MTE5NzcwMH0.0kO5FA9AjLcpNBMuP0zNUmlLt-ZuoCFaQV4EBwEwIl8";

const getEnv = (key: string) => {
  // Check process.env (injected by Vite define)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    // @ts-ignore
    return process.env[key];
  }
  return null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || FALLBACK_URL;
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || FALLBACK_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);