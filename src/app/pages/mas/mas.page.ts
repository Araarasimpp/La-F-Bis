import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme';

interface Acceso {
  label: string;
  detalle: string;
  icon: string;
  url: string;
}

/** Perfil, accesos secundarios según el rol, tema y cierre de sesión */
@Component({
  selector: 'app-mas',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: './mas.page.html',
  styleUrls: ['./mas.page.scss']
})
export class MasPage implements OnInit, OnDestroy {

  isDark = true;
  private sub?: Subscription;

  constructor(
    public auth: AuthService,
    public themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit() {
    this.sub = this.themeService.isDark$.subscribe(v => (this.isDark = v));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  get rolTexto(): string {
    const nombres: Record<string, string> = {
      administrador: 'Administrador',
      supervisor: 'Supervisor',
      vendedor: 'Vendedor',
      inventario: 'Inventario'
    };
    return nombres[this.auth.rol] || 'Sin rol';
  }

  get gestion(): Acceso[] {
    const r = this.auth.rol;
    const lista: Acceso[] = [];

    if (r === 'administrador') {
      lista.push({ label: 'Usuarios', detalle: 'Roles y acceso', icon: 'people-outline', url: '/usuarios' });
    }
    if (r === 'administrador' || r === 'inventario') {
      lista.push({ label: 'Categorías', detalle: 'Agrupar el inventario', icon: 'pricetag-outline', url: '/categorias' });
    }
    if (r === 'administrador' || r === 'supervisor') {
      lista.push({ label: 'Historial de motos', detalle: 'Visitas al taller por placa', icon: 'bicycle-outline', url: '/historial-moto' });
    }

    return lista;
  }

  go(url: string) {
    this.router.navigateByUrl(url);
  }

  async logout() {
    if (!confirm('¿Cerrar sesión?')) return;

    await this.auth.logout();
    this.router.navigateByUrl('/', { replaceUrl: true });
  }
}
