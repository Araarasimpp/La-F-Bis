import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';

import { environment } from 'src/environments/environment';

// Guarda la sesión con las preferencias nativas para que no se pierda en Android
const supabaseCapacitorStorage = {
  getItem: async (key: string) => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  }
};

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
    auth: {
      storage: supabaseCapacitorStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  async login(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async register(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  async logout() {
    return await this.supabase.auth.signOut();
  }

  async getSession() {
    return await this.supabase.auth.getSession();
  }

  onAuthChange(callback: any) {
    this.supabase.auth.onAuthStateChange((_event, session) => callback(session));
  }
}
