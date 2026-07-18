import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import {
  IonContent,
  IonInput,
  IonButton,
  IonItem,
  IonLabel
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonInput,
    IonButton,
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})

export class LoginPage {

  email = '';
  password = '';
  loading = false;

  constructor(private supabase: SupabaseService,
    private router: Router,
    public authService: AuthService
  ) {}

  async login() {

    if (this.loading) return;

    this.loading = true;

    try {

      const { data, error } =
        await this.supabase.login(
          this.email,
          this.password
        );

      if (error) {
        alert(error.message);
        return;
      }

      // 🔥 obtener usuario logueado
      const { data: userData } =
        await this.supabase.supabase.auth.getUser();

      const user = userData.user;

      if (!user) {
        alert('No se pudo obtener usuario');
        return;
      }

      // 🔥 buscar rol
      const { data: profile, error: profileError } =
        await this.supabase.supabase
          .from('profiles')
          .select('rol')
          .eq('id', user.id)
          .single();

      if (profileError || !profile) {
        alert('No se encontró perfil');
        return;
      }

      // 🔥 guardar rol globalmente
      this.authService.rol = profile.rol;

      // 🔥 REDIRECCIÓN POR ROL
      switch (profile.rol) {

      case 'administrador':
        this.router.navigate(['/home'], {
          replaceUrl: true
        });
        break;

      case 'supervisor':
        this.router.navigate(['/home'], {
          replaceUrl: true
        });
        break;

      case 'vendedor':
        this.router.navigate(['/ventas'], {
          replaceUrl: true
        });
        break;

      case 'inventario':
        this.router.navigate(['/inventory'], {
          replaceUrl: true
        });
        break;

      default:
        this.router.navigate(['/home'], {
          replaceUrl: true
        });
        break;
    }

    } catch (e) {

      console.error(e);

      alert('Error iniciando sesión');

    } finally {

      this.loading = false;
    }
  }

  goRegister() {
  this.router.navigateByUrl('/register');
}
}