import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { environment } from '../../../environments/environment';
import { TokenResponse, User } from '../models';
import { AuthActions } from '../../store/auth.actions';

const TOKEN_KEY = 'wh.session.token';
const USER_KEY = 'wh.session.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private store = inject(Store);
  private base = environment.apiBaseUrl;

  private _user$ = new BehaviorSubject<User | null>(null);
  user$ = this._user$.asObservable();

  get sessionId(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }
  get currentUser(): User | null {
    return this._user$.value;
  }
  get isAuthenticated(): boolean {
    return !!this.sessionId && !!this.currentUser;
  }
  get isAdmin(): boolean {
    return this.currentUser?.role === 'ROLE_ADMIN';
  }

  bootstrap(): void {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const userJson = sessionStorage.getItem(USER_KEY);
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        this._user$.next(user);
        this.store.dispatch(AuthActions.hydrate({ user, token }));
      } catch {
        this.clear();
      }
    }
  }

  register(body: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    city: string;
    region: string;
    role: 'ROLE_ADMIN' | 'ROLE_USER';
    deviceId?: number;
  }): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.base}/auth/register`, body).pipe(
      tap((res) => this.persist(res))
    );
  }

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.base}/auth/login`, { email, password }).pipe(
      tap((res) => this.persist(res))
    );
  }

  logout(): void {
    const token = this.sessionId;
    if (token) {
      this.http.post(`${this.base}/auth/logout`, {}).subscribe({
        next: () => undefined,
        error: () => undefined
      });
    }
    this.clear();
    this.router.navigate(['/login']);
  }

  private persist(res: TokenResponse): void {
    sessionStorage.setItem(TOKEN_KEY, res.accessToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._user$.next(res.user);
    this.store.dispatch(AuthActions.loginSuccess({ user: res.user, token: res.accessToken }));
  }

  private clear(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this._user$.next(null);
    this.store.dispatch(AuthActions.logout());
  }
}
