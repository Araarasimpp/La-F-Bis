import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  // El rediseño está pensado primero para modo oscuro
  private darkMode = new BehaviorSubject<boolean>(true);
  isDark$ = this.darkMode.asObservable();

  constructor() {
    this.initTheme();
  }

  async initTheme() {
    const { value } = await Preferences.get({ key: 'darkMode' });

    // Sin preferencia guardada → oscuro
    const isDark = value === null ? true : value === 'true';

    this.darkMode.next(isDark);
    this.applyTheme(isDark);
  }

  async toggleDark() {
    await this.setDark(!this.darkMode.value);
  }

  async setDark(value: boolean) {
    this.darkMode.next(value);
    this.applyTheme(value);

    await Preferences.set({ key: 'darkMode', value: value ? 'true' : 'false' });
  }

  private applyTheme(isDark: boolean) {
    document.body.classList.toggle('dark', isDark);
    // Paleta oscura de los componentes de Ionic (alertas, modales, spinners)
    document.documentElement.classList.toggle('ion-palette-dark', isDark);

    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', isDark ? '#111214' : '#F3F1EB');
  }
}
