import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const payload = err.error?.detail || err.error || {};
      const message = payload.message || err.message || 'Unexpected error';
      const isAuthRoute = req.url.includes('/auth/login') || req.url.includes('/auth/register');

      if (err.status === 401) {
        if (isAuthRoute) {
          toast.error(message || 'Invalid email or password');
        } else {
          toast.error('Session expired - please log in again');
          sessionStorage.removeItem('wh.session.token');
          sessionStorage.removeItem('wh.session.user');
          router.navigate(['/login']);
        }
      } else if (err.status === 403) {
        toast.error('You do not have permission to perform this action');
        router.navigate(['/unauthorized']);
      } else if (err.status >= 500) {
        toast.error('Server error - please try again later');
      } else if (err.status === 0) {
        toast.error('Network unreachable');
      } else {
        toast.error(message);
      }

      return throwError(() => ({ status: err.status, ...payload }));
    })
  );
};
