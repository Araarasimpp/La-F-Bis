import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [IonicModule, FormsModule, ...IONIC_IMPORTS],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss']
})
export class RegisterPage {

  email = '';
  password = '';
  loading = false;

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {}

  async register() {
    this.loading = true;

    const { error } = await this.supabase.register(this.email, this.password);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Usuario creado correctamente 🎉');
      this.router.navigateByUrl('/');
    }

    this.loading = false;
  }
  goLogin() {
    this.router.navigateByUrl('/');
  }
}