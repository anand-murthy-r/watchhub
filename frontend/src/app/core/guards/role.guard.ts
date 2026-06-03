import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required = route.data?.['role'] as string | undefined;
  const user = auth.currentUser;
  if (user && (!required || user.role === required)) return true;
  router.navigate(['/unauthorized']);
  return false;
};
