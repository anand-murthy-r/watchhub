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

      if (err.status === 401) {
        toast.error('Session expired - please log in again');
        sessionStorage.removeItem('wh.session.token');
        sessionStorage.removeItem('wh.session.user');
        if (!req.url.endsWith('/auth/login') && !req.url.endsWith('/auth/register')) {
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
