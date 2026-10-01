import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';

import { SupabaseService } from 'src/app/services/supabase.service';
import { AuthService } from 'src/app/services/auth.service';
import { CLAVE_STOCK_MINIMO, umbralStock } from 'src/app/services/stock';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ...IONIC_IMPORTS],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss']
})
export class SettingsPage implements OnInit {

  loading = false;
  subiendo = false;
  guardado = false;

  profile: any = {
    username: '',
    nombre_negocio: '',
    avatar_url: ''
  };

  settings = {
    // Antes siempre mostraba "activado"; ahora lee lo que se guardó
    ticket_auto: localStorage.getItem('ticket_auto') !== 'false',
    stock_minimo: umbralStock()
  };

  cambiarStockMinimo(delta: number) {
    this.settings.stock_minimo = Math.max(0, Math.min(50, this.settings.stock_minimo + delta));
    this.guardado = false;
  }

  userId = '';

  constructor(
    public supabaseService: SupabaseService,
    public auth: AuthService
  ) {}

  async ngOnInit() {
    await this.cargarPerfil();
  }

  async cargarPerfil() {
    const { data: { user } } = await this.supabaseService.supabase.auth.getUser();
    if (!user) return;

    this.userId = user.id;

    const { data, error } = await this.supabaseService.supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    this.profile = { ...data };
  }

  async onAvatarSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.subiendo = true;
    const fileName = `avatar-${this.userId}-${Date.now()}`;

    const { error } = await this.supabaseService.supabase
      .storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    this.subiendo = false;

    if (error) {
      console.error(error);
      alert('Error subiendo la foto');
      return;
    }

    const { data } = this.supabaseService.supabase.storage.from('avatars').getPublicUrl(fileName);
    this.profile.avatar_url = data.publicUrl;
    this.guardado = false;
  }

  async guardar() {
    this.loading = true;
    this.guardado = false;

    const { error } = await this.supabaseService.supabase
      .from('profiles')
      .update({
        username: this.profile.username,
        nombre_negocio: this.profile.nombre_negocio,
        avatar_url: this.profile.avatar_url
      })
      .eq('id', this.userId);

    this.loading = false;

    if (error) {
      console.error(error);
      alert(error.code === '23505' ? 'Ese nombre de usuario ya está en uso' : 'Error guardando');
      return;
    }

    localStorage.setItem('ticket_auto', this.settings.ticket_auto ? 'true' : 'false');
    localStorage.setItem(CLAVE_STOCK_MINIMO, String(this.settings.stock_minimo));

    // Refresca nombre y foto en el resto de la app
    await this.auth.loadUser();
    this.guardado = true;
  }
}
