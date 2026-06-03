import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'wh.session.token';

/**
 * Attaches the unique session ID generated at login (stored in sessionStorage)
 * to every outgoing request as both X-Session-Id and Authorization Bearer.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
  if (!token) return next(req);

  const authed = req.clone({
    setHeaders: {
      'X-Session-Id': token,
      Authorization: `Bearer ${token}`
    }
  });
  return next(authed);
};
