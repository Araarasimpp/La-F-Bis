import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';

import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonSpinner],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {

  email = '';
  password = '';
  loading = false;
  verClave = false;
  error = '';

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    public authService: AuthService
  ) {}

  async login() {
    if (this.loading) return;

    this.error = '';

    if (!this.email.trim() || !this.password) {
      this.error = 'Escribe tu correo y tu contraseña.';
      return;
    }

    this.loading = true;

    try {
      const { error } = await this.supabase.login(this.email.trim(), this.password);

      if (error) {
        this.error = error.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos.'
          : error.message;
        return;
      }

      const { data: userData } = await this.supabase.supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        this.error = 'No se pudo obtener el usuario.';
        return;
      }

      const { data: profile, error: profileError } = await this.supabase.supabase
        .from('profiles')
        .select('rol, activo')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        this.error = 'Tu usuario no tiene perfil asignado. Pide acceso a un administrador.';
        return;
      }

      // Usuarios suspendidos desde la pantalla de Usuarios
      if (profile.activo === false) {
        await this.supabase.logout();
        this.error = 'Tu usuario está suspendido. Habla con el administrador.';
        return;
      }

      this.authService.rol = profile.rol;
      await this.authService.loadUser();

      const destino =
        profile.rol === 'vendedor' ? '/ventas' :
        profile.rol === 'inventario' ? '/inventory' :
        '/home';

      this.router.navigate([destino], { replaceUrl: true });

    } catch (e) {
      console.error(e);
      this.error = 'Error iniciando sesión. Revisa tu conexión.';
    } finally {
      this.loading = false;
    }
  }

  goRegister() {
    this.router.navigateByUrl('/register');
  }
}
