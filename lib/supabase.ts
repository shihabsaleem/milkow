import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Mock Supabase client for "off" state
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

let mockSession: any = null;
const authListeners: Set<(event: string, session: any) => void> = new Set();

const mockSupabase: any = {
  auth: {
    getSession: async () => ({ data: { session: mockSession }, error: null }),
    onAuthStateChange: (callback: any) => {
      authListeners.add(callback);
      // Return subscription object
      return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
    },
    signInWithPassword: async ({ email }: { email: string }) => {
      mockSession = { user: { email, id: 'mock-uuid' }, access_token: 'mock-token' };
      // Notify listeners
      authListeners.forEach(cb => cb('SIGNED_IN', mockSession));
      return { data: { user: mockSession.user, session: mockSession }, error: null };
    },
    signOut: async () => {
      mockSession = null;
      // Notify listeners
      authListeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },
  },
  from: () => chain(),
  channel: () => ({
    on: () => ({
      subscribe: () => ({ unsubscribe: () => { } }),
    }),
    subscribe: () => ({ unsubscribe: () => { } }),
  }),
};

const isPlaceholder = !supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE_PROJECT_URL') || !supabaseUrl.startsWith('http');
const isOff = false; // Set to true to force mock mode
const hasKeys = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.length > 10);

// DEFENSIVE INITIALIZATION: Only call createClient if we have valid-looking keys.
// This prevents crashes during Vercel builds or pre-rendering.
export const supabase = (isOff || isPlaceholder || !hasKeys)
  ? mockSupabase
  : createClient(supabaseUrl, supabaseAnonKey);
