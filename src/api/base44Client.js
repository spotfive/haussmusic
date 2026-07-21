// HAUSS MUSIC's data layer. `base44` exposes the same shape (auth / entities /
// functions / integrations) no matter which backend is active:
//  - VITE_API_URL set -> your own self-hosted server (see /server), a plain
//    Express + SQLite API you run yourself — no third-party database vendor.
//  - otherwise, VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set -> Supabase.
//  - otherwise -> a localStorage-only stand-in, so the app still works with
//    zero setup (data stays in this browser only).
import { localBackend, seedDemoData } from './localBackend';
import { supabaseBackend, isSupabaseConfigured } from './supabaseBackend';
import { apiBackend, isApiConfigured } from './apiBackend';

export const activeBackend = isApiConfigured ? 'api' : isSupabaseConfigured ? 'supabase' : 'local';

if (activeBackend === 'local') {
  seedDemoData();
}

export const base44 = activeBackend === 'api' ? apiBackend : activeBackend === 'supabase' ? supabaseBackend : localBackend;
