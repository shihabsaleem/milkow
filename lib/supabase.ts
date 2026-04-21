import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Mock Supabase client for "off" state
// Enhanced Mock Supabase client that supports chaining
const chain = () => ({
  select: chain,
  eq: chain,
  neq: chain,
  order: chain,
  limit: chain,
  single: async () => ({ data: null, error: null }),
  maybeSingle: async () => ({ data: null, error: null }),
  insert: async () => ({ data: null, error: null }),
  update: chain,
  upsert: async () => ({ data: null, error: null }),
  delete: async () => ({ data: null, error: null }),
  then: (resolve: any) => resolve({ data: null, error: null }),
});

const mockSupabase: any = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => {},
  },
  from: () => chain(),
  channel: () => ({
    on: () => ({
      subscribe: () => ({ unsubscribe: () => {} }),
    }),
    subscribe: () => ({ unsubscribe: () => {} }),
  }),
};

const isPlaceholder = supabaseUrl.includes('YOUR_SUPABASE_PROJECT_URL') || !supabaseUrl.startsWith('http');
const isOff = false; // Primary flag

export const supabase = (isOff || isPlaceholder) ? mockSupabase : createClient(supabaseUrl, supabaseAnonKey);
