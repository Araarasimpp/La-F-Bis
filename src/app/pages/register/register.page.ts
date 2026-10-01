import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';

import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonSpinner],
  templateUrl: './register.page.html',
  styleUrls: ['../login/login.page.scss']
})
export class RegisterPage {

  email = '';
  password = '';
  loading = false;
  verClave = false;
  error = '';
  listo = false;

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {}

  async register() {
    if (this.loading) return;

    this.error = '';

    if (!this.email.trim() || this.password.length < 6) {
      this.error = 'Escribe un correo válido y una contraseña de al menos 6 caracteres.';
      return;
    }

    this.loading = true;

    const { error } = await this.supabase.register(this.email.trim(), this.password);

    this.loading = false;

    if (error) {
      this.error = error.message;
      return;
    }

    this.listo = true;
  }

  goLogin() {
    this.router.navigateByUrl('/');
  }
}
