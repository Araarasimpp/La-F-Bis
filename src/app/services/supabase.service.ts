import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences'; // 🔥 Importamos Preferencias Nativas

// ⚡ Puente para obligar a Supabase a guardar datos de forma persistente en Android
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
  
  supabase = createClient(
    'https://xiviyqdnnemcvpriddir.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpdml5cWRubmVtY3ZwcmlkZGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyMDY3OTYsImV4cCI6MjA2MTc4Mjc5Nn0.tjqgkAReTJs_XlzfjmdS4lw6GGRf_eLod1_s5JIKW50', 
    {
      auth: {
        storage: supabaseCapacitorStorage, // 🔥 Reemplazamos localStorage por el de Capacitor
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    }
  );

  // LOGIN
  async login(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({
      email,
      password
    });
  }

  // REGISTRO
  async register(email: string, password: string) {
    return await this.supabase.auth.signUp({
        email,
        password
    });
  }

  // LOGOUT
  async logout() {
    return await this.supabase.auth.signOut();
  }

  // SESIÓN ACTUAL
  async getSession() {
    return await this.supabase.auth.getSession();
  }

  // ESCUCHAR CAMBIOS
  onAuthChange(callback: any) {
    this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session);
    });
  }
}