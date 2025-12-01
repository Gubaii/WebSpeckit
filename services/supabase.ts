
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { AppSettings, FileNode, ChatSession } from '../types';

let supabase: SupabaseClient | null = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;

export const initSupabase = (url: string, key: string) => {
  if (!url || !key) {
    supabase = null;
    currentUrl = null;
    currentKey = null;
    return;
  }

  // Prevent re-initialization if credentials match
  if (supabase && url === currentUrl && key === currentKey) {
    return;
  }

  try {
    supabase = createClient(url, key);
    currentUrl = url;
    currentKey = key;
  } catch (e) {
    console.error("Failed to init supabase", e);
    supabase = null;
    currentUrl = null;
    currentKey = null;
  }
};

export const getSupabaseClient = () => supabase;

export const isConnected = () => !!supabase;

// --- Auth Functions ---
export const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) return { data: { user: null, session: null }, error: { message: 'Supabase not initialized' } };
    return await supabase.auth.signInWithPassword({ email, password });
};

export const signUpWithEmail = async (email: string, password: string) => {
    if (!supabase) return { data: { user: null, session: null }, error: { message: 'Supabase not initialized' } };
    return await supabase.auth.signUp({ email, password });
};

export const signOut = async () => {
    if (!supabase) return { error: { message: 'Supabase not initialized' } };
    return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

export const updateUserPassword = async (newPassword: string) => {
    if (!supabase) return { data: { user: null }, error: { message: 'Supabase not initialized' } };
    return await supabase.auth.updateUser({ password: newPassword });
};


// Generic helper to save a JSON object by ID
export const saveToCloud = async (id: string, data: any) => {
  if (!supabase) return { error: 'Not connected' };
  
  try {
    const { data: result, error } = await supabase
        .from('app_data')
        .upsert({ id, data, updated_at: new Date().toISOString() }, { onConflict: 'id' })
        .select('updated_at')
        .single();
        
    return { error, updatedAt: result?.updated_at };
  } catch (e: any) {
    return { error: e.message || 'Unknown error' };
  }
};

// Generic helper to load a JSON object by ID
export const loadFromCloud = async (id: string) => {
  if (!supabase) return { data: null, error: 'Not connected', updatedAt: null };

  const { data, error } = await supabase
    .from('app_data')
    .select('data, updated_at')
    .eq('id', id)
    .single();

  if (error) return { data: null, error, updatedAt: null };
  return { data: data?.data, error: null, updatedAt: data?.updated_at };
};

// --- Specific Sync Functions (Generic) ---

export const syncSettingsFromCloud = async (): Promise<Partial<AppSettings> | null> => {
    // Note: ID will be managed dynamically in App.tsx now
    return null; 
};

export const syncSystemFilesFromCloud = async (): Promise<FileNode[] | null> => {
    const { data } = await loadFromCloud('specKit_systemFiles');
    return data as FileNode[];
};

export const syncSessionsFromCloud = async (): Promise<ChatSession[] | null> => {
    // Note: ID will be managed dynamically in App.tsx now
    return null;
};

export const syncLibraryFromCloud = async (): Promise<FileNode[] | null> => {
    // Note: ID will be managed dynamically in App.tsx now
    return null;
};
