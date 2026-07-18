import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';
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
  receiptOutline,
  shieldCheckmarkOutline,
  searchOutline,
  personCircleOutline
} from 'ionicons/icons';

import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ...IONIC_IMPORTS, IonMenuButton],
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss']
})
export class UsuariosPage implements OnInit {

  usuarios: any[] = [];

  cargando = true;

  currentRoute = '';

  busqueda = '';
  usersChannel: any;

  constructor(
    private router: Router,
    public dataService: DataService,
    public supabaseService: SupabaseService,
    public auth: AuthService
  ) {

    addIcons({
      analyticsOutline,
      cubeOutline,
      cashOutline,
      peopleOutline,
      settingsOutline,
      logOutOutline,
      shieldCheckmarkOutline,
      receiptOutline,
      searchOutline,
      personCircleOutline
    });
  }

  async ngOnInit() {

    this.currentRoute = this.router.url;

    // 🔒 SOLO ADMIN
    // 🔥 refrescar rol real
    await this.auth.loadUser();

    // 🔒 SOLO ADMIN
    if (!this.auth.isAdmin()) {

      this.router.navigateByUrl('/home', {
        replaceUrl: true
      });

      return;
    }

    await this.cargarUsuarios();

      // 🔥 realtime
      this.usersChannel = this.supabaseService.supabase

      .channel('profiles-changes')

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {

          console.log(payload);

          this.cargarUsuarios();

        }
      )

      .subscribe();
  }

  ngOnDestroy() {
    if (this.usersChannel) {
      this.supabaseService.supabase
        .removeChannel(this.usersChannel);
    }
  }

  async cargarUsuarios() {

    this.cargando = true;

    const { data, error } =
      await this.dataService.supabaseService.supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      this.cargando = false;
      return;
    }

    this.usuarios = data || [];

    this.cargando = false;
  }

  async cambiarRol(usuario: any) {

    const { error } =
      await this.dataService.supabaseService.supabase
        .from('profiles')
        .update({
          rol: usuario.rol
        })
        .eq('id', usuario.id);

    if (error) {
      console.error(error);
      return;
    }
    // 🔥 refrescar rol actual
    await this.auth.loadUser();

    // 🔥 recargar lista
    await this.cargarUsuarios();
  }

  async toggleActivo(usuario: any) {

    usuario.activo = !usuario.activo;

    const { error } =
      await this.dataService.supabaseService.supabase
        .from('profiles')
        .update({
          activo: usuario.activo
        })
        .eq('id', usuario.id);

    if (error) {
      console.error(error);
    }
  }

  get usuariosFiltrados() {

    return this.usuarios.filter(u =>
      (u.username || '')
        .toLowerCase()
        .includes(this.busqueda.toLowerCase())
    );
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }

  logout() {
    localStorage.clear();
    this.router.navigateByUrl('/');
  }
}