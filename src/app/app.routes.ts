import { Routes } from '@angular/router';

import { roleGuard } from './guards/role.guard';

const TODOS = ['administrador', 'supervisor', 'vendedor', 'inventario'];

export const routes: Routes = [

  // LOGIN
  {
    path: '',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
  },

  // REGISTRO
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage),
  },

  // INICIO → ADMIN + SUPERVISOR
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage),
    canActivate: [roleGuard],
    data: { roles: ['administrador', 'supervisor'] }
  },

  // INVENTARIO → ADMIN + INVENTARIO
  {
    path: 'inventory',
    loadComponent: () => import('./pages/inventory/inventory.page').then(m => m.InventoryPage),
    canActivate: [roleGuard],
    data: { roles: ['administrador', 'inventario'] }
  },

  // VENDER → ADMIN + SUPERVISOR + VENDEDOR
  {
    path: 'ventas',
    loadComponent: () => import('./pages/ventas/ventas.page').then(m => m.VentasPage),
    canActivate: [roleGuard],
    data: { roles: ['administrador', 'supervisor', 'vendedor'] }
  },

  // MÁS (perfil, accesos y cierre de sesión) → TODOS
  {
    path: 'mas',
    loadComponent: () => import('./pages/mas/mas.page').then(m => m.MasPage),
    canActivate: [roleGuard],
    data: { roles: TODOS }
  },

  // USUARIOS → SOLO ADMIN
  {
    path: 'usuarios',
    loadComponent: () => import('./pages/usuarios/usuarios.page').then(m => m.UsuariosPage),
    canActivate: [roleGuard],
    data: { roles: ['administrador'] }
  },

  // CATEGORÍAS → ADMIN + INVENTARIO
  {
    path: 'categorias',
    loadComponent: () => import('./pages/categorias/categorias.page').then(m => m.CategoriasPage),
    canActivate: [roleGuard],
    data: { roles: ['administrador', 'inventario'] }
  },

  // CONFIGURACIÓN → TODOS
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
    canActivate: [roleGuard],
    data: { roles: TODOS }
  },

  // HISTORIAL DE VENTAS → ADMIN + SUPERVISOR
  {
    path: 'historial-ventas',
    loadComponent: () => import('./pages/historial-ventas/historial-ventas.page').then(m => m.HistorialVentasPage),
    canActivate: [roleGuard],
    data: { roles: ['administrador', 'supervisor'] }
  },

  // HISTORIAL DE MOTOS → ADMIN + SUPERVISOR
  {
    path: 'historial-moto',
    loadComponent: () => import('./pages/historial-moto/historial-moto.page').then(m => m.HistorialMotoPage),
    canActivate: [roleGuard],
    data: { roles: ['administrador', 'supervisor'] }
  },

  // 404
  {
    path: '**',
    redirectTo: ''
  }

];
