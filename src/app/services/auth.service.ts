import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  profile: any = null;

  rol = '';

  constructor(
    private supabaseService: SupabaseService
  ) {}

  async loadUser() {

    const { data: userData } =
      await this.supabaseService.supabase.auth.getUser();

    const user = userData?.user;

    if (!user) {
      this.profile = null;
      this.rol = '';
      return;
    }

    const { data } = await this.supabaseService.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    this.profile = data;

    this.rol = data?.rol ?? '';
  }

  get username(): string {
    return this.profile?.username || '';
  }

  get nombre(): string {
    return this.profile?.nombre || this.profile?.username || '';
  }

  get email(): string {
    return this.profile?.email || '';
  }

  get avatarUrl(): string {
    return this.profile?.avatar_url || '';
  }

  get inicial(): string {
    return this.nombre
      ? this.nombre.charAt(0).toUpperCase()
      : '?';
  }

  isAdmin() {
    return this.rol === 'administrador';
  }

  isSupervisor() {
    return this.rol === 'supervisor';
  }

  isInventario() {
    return this.rol === 'inventario';
  }

  isVendedor() {
    return this.rol === 'vendedor';
  }

  canManageUsers() {
    return this.isAdmin();
  }

  canManageInventory() {
    return this.isAdmin() || this.isInventario();
  }

  canSell() {
    return this.isAdmin() || this.isVendedor();
  }

  canViewHistory() {
    return this.isAdmin() || this.isSupervisor();
  }

  async logout() {
    await this.supabaseService.logout();

    this.profile = null;
    this.rol = '';
  }

}