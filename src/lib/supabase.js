import { createClient } from '@supabase/supabase-js'

// Public client settings for the BRTA_Extended project (the anon key is meant to be public;
// security comes from Row Level Security). Override with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env,
// or set VITE_DEMO=true to use the built-in sample data instead.
const DEFAULT_URL = 'https://tcqatmkqmvaseakicqkr.supabase.co'
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjcWF0bWtxbXZhc2Vha2ljcWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzYyNTgsImV4cCI6MjA3OTY1MjI1OH0.I0ja_FAds6VBLu5OxZvyMR1LhQf-EPp77goGaYvrTgY'

const demoForced = import.meta.env.VITE_DEMO === 'true'
const url = demoForced ? '' : import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
const key = demoForced ? '' : import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY

/** True when Supabase keys are missing: the app then runs on local sample data. */
export const DEMO_MODE = !url || !key

export const supabase = DEMO_MODE
  ? null
  : createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'smartmamla-auth' },
    })

// Payment API. In development it is served by Vite itself at /api (same address as the site).
export const API_URL = import.meta.env.VITE_API_URL || ''
