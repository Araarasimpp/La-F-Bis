import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  alertCircleOutline,
  arrowDown,
  arrowUp,
  barcodeOutline,
  bicycleOutline,
  calendarOutline,
  cameraOutline,
  cartOutline,
  cashOutline,
  checkmarkOutline,
  chevronForwardOutline,
  closeOutline,
  cloudUploadOutline,
  constructOutline,
  createOutline,
  cubeOutline,
  eyeOffOutline,
  eyeOutline,
  gridOutline,
  homeOutline,
  imageOutline,
  imagesOutline,
  locationOutline,
  logOutOutline,
  moonOutline,
  peopleOutline,
  personOutline,
  pricetagOutline,
  printOutline,
  receiptOutline,
  removeOutline,
  scanOutline,
  searchOutline,
  settingsOutline,
  swapHorizontalOutline,
  timeOutline,
  trashOutline
} from 'ionicons/icons';

import { SupabaseService } from './services/supabase.service';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme';
import { TabBarComponent } from './components/tab-bar/tab-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, TabBarComponent],
  templateUrl: 'app.component.html',
})
export class AppComponent {

  constructor(
    private router: Router,
    private supabase: SupabaseService,
    private authService: AuthService,
    private themeService: ThemeService
  ) {
    // Todos los íconos de la app se registran una sola vez aquí
    addIcons({
      addOutline, alertCircleOutline, arrowDown, arrowUp, barcodeOutline, bicycleOutline,
      calendarOutline, cameraOutline, cartOutline, cashOutline, checkmarkOutline,
      chevronForwardOutline, closeOutline, cloudUploadOutline, constructOutline, createOutline,
      cubeOutline, eyeOffOutline, eyeOutline, gridOutline, homeOutline, imageOutline,
      imagesOutline, locationOutline, logOutOutline, moonOutline, peopleOutline, personOutline,
      pricetagOutline, printOutline, receiptOutline, removeOutline, scanOutline, searchOutline,
      settingsOutline, swapHorizontalOutline, timeOutline, trashOutline
    });

    this.init();
  }

  async init(): Promise<void> {
    await this.themeService.initTheme();
    await this.authService.loadUser();
    await this.checkSession();
  }

  async checkSession(): Promise<void> {
    const { data } = await this.supabase.getSession();
    const currentUrl = this.router.url;

    if (data.session) {
      if (currentUrl === '/' || currentUrl === '') {
        this.router.navigateByUrl(this.inicioPorRol(), { replaceUrl: true });
      }
    } else if (currentUrl !== '/' && currentUrl !== '/register') {
      this.router.navigateByUrl('/');
    }

    this.supabase.supabase.auth.onAuthStateChange((event, session) => {
      const urlActual = this.router.url;

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session && (urlActual === '/' || urlActual === '')) {
          this.authService.loadUser().then(() =>
            this.router.navigateByUrl(this.inicioPorRol(), { replaceUrl: true })
          );
        }
      }

      // Solo se vuelve al login con un cierre de sesión explícito
      // (se ignoran eventos como TOKEN_REFRESHED, que en el celular causaban saltos)
      if (event === 'SIGNED_OUT' && urlActual !== '/') {
        this.authService.profile = null;
        this.authService.rol = '';
        this.router.navigateByUrl('/', { replaceUrl: true });
      }
    });
  }

  /** Pantalla de entrada según el rol (vendedor → vender, inventario → inventario) */
  private inicioPorRol(): string {
    switch (this.authService.rol) {
      case 'vendedor': return '/ventas';
      case 'inventario': return '/inventory';
      default: return '/home';
    }
  }
}
