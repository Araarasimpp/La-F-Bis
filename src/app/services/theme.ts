import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences'; // 🔥 Importamos Preferencias Nativas

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private darkMode = new BehaviorSubject<boolean>(false);
  isDark$ = this.darkMode.asObservable();

  constructor() {
    this.initTheme();
  }

  // 🔥 INICIALIZA EL TEMA (Modificado a Asíncrono)
  async initTheme() {
    const { value } = await Preferences.get({ key: 'darkMode' });

    const isDark = value === 'true';

    this.darkMode.next(isDark);
    this.applyTheme(isDark);
  }

  // 🔁 TOGGLE
  async toggleDark() {
    const current = this.darkMode.value;
    const newValue = !current;

    this.darkMode.next(newValue);
    this.applyTheme(newValue);

    await Preferences.set({ key: 'darkMode', value: newValue ? 'true' : 'false' });
  }

  // 🎯 SET DIRECTO
  async setDark(value: boolean) {
    this.darkMode.next(value);
    this.applyTheme(value);

    await Preferences.set({ key: 'darkMode', value: value ? 'true' : 'false' });
  }

  // 🎨 APLICA AL DOM
  private applyTheme(isDark: boolean) {
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }
}