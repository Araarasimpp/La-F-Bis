import { inject } from '@angular/core';

import {
  CanActivateFn,
  ActivatedRouteSnapshot,
  Router
} from '@angular/router';

import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn =
  async (route: ActivatedRouteSnapshot) => {

    const auth = inject(AuthService);

    const router = inject(Router);

    // 🔥 SIEMPRE refrescar rol
    await auth.loadUser();

    const allowedRoles =
      route.data?.['roles'] as string[];

    // 🔥 tiene permiso
    if (allowedRoles.includes(auth.rol)) {
      return true;
    }

    // 🔥 redirección automática
    switch (auth.rol) {

      case 'administrador':
        router.navigate(['/home'], {
          replaceUrl: true
        });
        break;

      case 'supervisor':
        router.navigate(['/home'], {
          replaceUrl: true
        });
        break;

      case 'vendedor':
        router.navigate(['/ventas'], {
          replaceUrl: true
        });
        break;

      case 'inventario':
        router.navigate(['/inventory'], {
          replaceUrl: true
        });
        break;

      default:
        router.navigate(['/'], {
          replaceUrl: true
        });
        break;
    }

    return false;
};