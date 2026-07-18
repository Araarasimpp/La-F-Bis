import { Component, OnInit } from '@angular/core';
import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from 'src/app/services/supabase.service';
import { AuthService } from 'src/app/services/auth.service';
import { IonMenuButton } from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';

import {
  analyticsOutline,
  cubeOutline,
  cashOutline,
  peopleOutline,
  settingsOutline,
  logOutOutline,
  businessOutline,
  receiptOutline,
  personOutline,
  moonOutline,
  printOutline,
  saveOutline,
  cloudUploadOutline
} from 'ionicons/icons';

import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ...IONIC_IMPORTS, IonMenuButton],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss']
})

export class SettingsPage implements OnInit {

  loading = false;

  profile: any = {
    username: '',
    nombre_negocio: '',
    avatar_url: ''
  };

  settings: any = {
    ticket_auto: true
  };

  userId = '';

  constructor(
    private router: Router,
    public supabaseService: SupabaseService,
    public auth: AuthService,
  ) {

    addIcons({
      analyticsOutline,
      cubeOutline,
      cashOutline,
      peopleOutline,
      settingsOutline,
      saveOutline,
      logOutOutline,
      personOutline,
      receiptOutline,
      cloudUploadOutline
    });

  }

  async ngOnInit() {
    await this.cargarPerfil();
  }

  async cargarPerfil() {

    const {
      data: { user }
    } = await this.supabaseService.supabase.auth.getUser();

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

    this.profile = {
      ...data
    };

  }

  async onAvatarSelected(event: any) {

    const file = event.target.files[0];

    if (!file) return;

    const fileName = `avatar-${Date.now()}`;

    const { error } = await this.supabaseService.supabase
      .storage
      .from('avatars')
      .upload(fileName, file, {
        upsert: true
      });

    if (error) {
      console.error(error);
      alert('Error subiendo avatar');
      return;
    }

    const { data } = this.supabaseService.supabase
      .storage
      .from('avatars')
      .getPublicUrl(fileName);

    this.profile.avatar_url = data.publicUrl;
  }

  async guardar() {

    this.loading = true;

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
      alert('Error guardando');
      return;
    }

    localStorage.setItem(
      'ticket_auto',
      this.settings.ticket_auto ? 'true' : 'false'
    );

    alert('Configuración guardada ✅');
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }

  logout() {
    localStorage.clear();
    this.router.navigateByUrl('/');
  }

}
