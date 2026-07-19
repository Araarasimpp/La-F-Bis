import { Routes } from '@angular/router';

import { roleGuard } from './guards/role.guard';

export const routes: Routes = [

  // LOGIN
  {
    path: '',

    loadComponent: () =>
      import('./pages/login/login.page')
        .then(m => m.LoginPage),
  },

  // REGISTER
  {
    path: 'register',

    loadComponent: () =>
      import('./pages/register/register.page')
        .then(m => m.RegisterPage),
  },

  // HOME → ADMIN + SUPERVISOR
  {
    path: 'home',

    loadComponent: () =>
      import('./pages/home/home.page')
        .then(m => m.HomePage),

    canActivate: [roleGuard],

    data: {
      roles: [
        'administrador',
        'supervisor'
      ]
    }
  },

  // INVENTARIO → ADMIN + INVENTARIO
  {
    path: 'inventory',

    loadComponent: () =>
      import('./pages/inventory/inventory.page')
        .then(m => m.InventoryPage),

    canActivate: [roleGuard],

    data: {
      roles: [
        'administrador',
        'inventario'
      ]
    }
  },

  // VENTAS → ADMIN + SUPERVISOR + VENDEDOR
  {
    path: 'ventas',

    loadComponent: () =>
      import('./pages/ventas/ventas.page')
        .then(m => m.VentasPage),

    canActivate: [roleGuard],

    data: {
      roles: [
        'administrador',
        'supervisor',
        'vendedor'
      ]
    }
  },

  // USUARIOS → SOLO ADMIN
  {
    path: 'usuarios',

    loadComponent: () =>
      import('./pages/usuarios/usuarios.page')
        .then(m => m.UsuariosPage),

    canActivate: [roleGuard],

    data: {
      roles: [
        'administrador'
      ]
    }
  },

  // CATEGORÍAS → ADMIN + INVENTARIO
  {
    path: 'categorias',

    loadComponent: () =>
      import('./pages/categorias/categorias.page')
        .then(m => m.CategoriasPage),

    canActivate: [roleGuard],

    data: {
      roles: [
        'administrador',
        'inventario'
      ]
    }
  },

  // SETTINGS → TODOS LOS ROLES
  {
    path: 'settings',

    loadComponent: () =>
      import('./pages/settings/settings.page')
        .then(m => m.SettingsPage),

    canActivate: [roleGuard],

    data: {
      roles: [
        'administrador',
        'supervisor',
        'vendedor',
        'inventario'
      ]
    }
  },

  // HISTORIAL → ADMIN + SUPERVISOR
  {
    path: 'historial-ventas',

    loadComponent: () =>
      import('./pages/historial-ventas/historial-ventas.page')
        .then(m => m.HistorialVentasPage),

    canActivate: [roleGuard],

    data: {
      roles: [
        'administrador',
        'supervisor'
      ]
    }
  },

  // HISTORIAL MOTO → ADMIN + SUPERVISOR
  {
    path: 'historial-moto',

    loadComponent: () =>
      import('./pages/historial-moto/historial-moto.page')
        .then(m => m.HistorialMotoPage),

    canActivate: [roleGuard],

    data: {
      roles: [
        'administrador',
        'supervisor'
      ]
    }
  },

  // 404
  {
    path: '**',
    redirectTo: ''
  }

];