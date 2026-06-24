import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Mock Supabase client for "off" state or missing keys
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
      return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
    },
    signInWithPassword: async ({ email }: { email: string }) => {
      mockSession = { user: { email, id: 'mock-uuid' }, access_token: 'mock-token' };
      authListeners.forEach(cb => cb('SIGNED_IN', mockSession));
      return { data: { user: mockSession.user, session: mockSession }, error: null };
    },
    signOut: async () => {
      mockSession = null;
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
const isOff = false; 
const hasKeys = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.length > 10);

// Use a singleton for the client-side to avoid multiple instances
let clientInstance: any = null;

const getSupabaseClient = () => {
  if (isOff || isPlaceholder || !hasKeys) return mockSupabase;

  if (!clientInstance) {
    const isBrowser = typeof window !== 'undefined';
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: isBrowser,
      },
    });
  }
  
  return clientInstance;
};

export const supabase = getSupabaseClient();
