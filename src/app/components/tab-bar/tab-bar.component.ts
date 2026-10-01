import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { Subscription, filter } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { CarritoStateService } from '../../services/carrito-state.service';

interface Tab {
  label: string;
  icon: string;
  url: string;
  match: string[];
}

/**
 * Barra inferior en el celular y riel lateral en pantallas grandes.
 * Muestra solo las secciones que el rol del usuario puede abrir.
 */
@Component({
  selector: 'app-tab-bar',
  standalone: true,
  imports: [CommonModule, RouterLink, IonIcon],
  templateUrl: './tab-bar.component.html',
  styleUrls: ['./tab-bar.component.scss']
})
export class TabBarComponent implements OnInit, OnDestroy {

  url = '';
  visible = false;
  count = 0;

  private subs = new Subscription();

  constructor(
    private router: Router,
    public auth: AuthService,
    private carrito: CarritoStateService
  ) {}

  ngOnInit() {
    this.subs.add(
      this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe(e => this.actualizar((e as NavigationEnd).urlAfterRedirects))
    );

    this.subs.add(this.carrito.count$.subscribe(c => (this.count = c)));

    this.actualizar(this.router.url);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    document.body.classList.remove('fb-has-tabbar');
  }

  private actualizar(url: string) {
    this.url = url.split('?')[0];
    this.visible = !!this.auth.rol && !['/', '', '/register'].includes(this.url);
    document.body.classList.toggle('fb-has-tabbar', this.visible);
  }

  private tiene(...roles: string[]) {
    return roles.includes(this.auth.rol);
  }

  get tabs(): Tab[] {
    const t: Tab[] = [];

    if (this.tiene('administrador', 'supervisor')) {
      t.push({ label: 'Inicio', icon: 'home-outline', url: '/home', match: ['/home'] });
    }
    if (this.tiene('administrador', 'inventario')) {
      t.push({ label: 'Inventario', icon: 'cube-outline', url: '/inventory', match: ['/inventory'] });
    }
    if (this.tiene('administrador', 'supervisor')) {
      t.push({ label: 'Ventas', icon: 'receipt-outline', url: '/historial-ventas', match: ['/historial-ventas'] });
    }

    t.push({
      label: 'Más',
      icon: 'grid-outline',
      url: '/mas',
      match: ['/mas', '/usuarios', '/categorias', '/settings', '/historial-moto']
    });

    return t;
  }

  get izquierda() {
    const t = this.tabs;
    return t.slice(0, Math.ceil(t.length / 2));
  }

  get derecha() {
    const t = this.tabs;
    return t.slice(Math.ceil(t.length / 2));
  }

  get puedeVender() {
    return this.tiene('administrador', 'supervisor', 'vendedor');
  }

  get enVenta() {
    return this.url.startsWith('/ventas');
  }

  activo(tab: Tab) {
    return tab.match.some(m => this.url.startsWith(m));
  }

  vender() {
    if (this.enVenta) {
      this.carrito.pedirAbrir();
    } else {
      this.router.navigateByUrl('/ventas');
    }
  }
}
