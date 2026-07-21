// HAUSS MUSIC's data layer. `base44` exposes the same shape (auth / entities /
// functions / integrations) either way:
//  - VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set -> real Postgres backend
//    on Supabase (see supabase/schema.sql and .env.example).
//  - otherwise -> a localStorage-only stand-in, so the app still works with
//    zero setup (data stays in this browser only).
import { localBackend, seedDemoData } from './localBackend';
import { supabaseBackend, isSupabaseConfigured } from './supabaseBackend';

export const usingSupabase = isSupabaseConfigured;

if (!usingSupabase) {
  seedDemoData();
}

export const base44 = usingSupabase ? supabaseBackend : localBackend;
