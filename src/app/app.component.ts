import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonMenu, IonRouterOutlet } from '@ionic/angular/standalone';
import { SupabaseService } from './services/supabase.service';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme'; // 🔥 Importamos tu ThemeService

import { AppMenuComponent } from './components/app-menu/app-menu.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    IonApp,
    IonMenu,
    IonRouterOutlet,
    AppMenuComponent
  ],
  templateUrl: 'app.component.html',
})
export class AppComponent implements OnInit {

  constructor(
    private router: Router,
    private supabase: SupabaseService,
    private authService: AuthService,
    private themeService: ThemeService // 🔥 Inyectamos el servicio de tema
  ) {
    this.init();
  }

  ngOnInit(): void {
    // 🧹 Limpiamos el viejo código síncrono de localStorage que había aquí
  }

  async init(): Promise<void> {
    // 1. 🔥 Inicializar el tema de forma nativa/asíncrona en el móvil
    await this.themeService.initTheme();

    // 2. 🔥 Cargar los datos del perfil del usuario (desde Supabase con Capacitor Preferences)
    await this.authService.loadUser();

    // 3. 🔄 Ejecutar el validador de rutas y sesión activa
    await this.checkSession();
  }

  async checkSession(): Promise<void> {
    const { data } = await this.supabase.getSession();
    const currentUrl = this.router.url;

    // 1. Enrutamiento inicial limpio
    if (data.session) {
      if (currentUrl === '/' || currentUrl === '') {
        this.router.navigateByUrl('/home');
      }
    } else {
      if (currentUrl !== '/') {
        this.router.navigateByUrl('/');
      }
    }

    // 2. 🛡️ Listener optimizado para evitar duplicación de pantallas en móviles
    this.supabase.supabase.auth.onAuthStateChange((event, session) => {
      const urlActual = this.router.url;

      // Si el usuario explícitamente inicia sesión y está atrapado en el login, va a home
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session && (urlActual === '/' || urlActual === '')) {
          this.router.navigateByUrl('/home');
        }
      }

      // 🔥 EL ESCUDO: Solo mandamos al login si el evento es explícitamente un cierre de sesión
      // Ignoramos eventos temporales como 'TOKEN_REFRESHED' que bugean la UI del celular
      if (event === 'SIGNED_OUT') {
        if (urlActual !== '/') {
          // Limpiamos estados de la app para evitar fugas de memoria
          this.authService.profile = null;
          this.authService.rol = '';
          
          // Redirección limpia
          this.router.navigateByUrl('/');
        }
      }
    });
  }
}