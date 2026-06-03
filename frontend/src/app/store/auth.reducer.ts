import { createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { User } from '../core/models';

export interface AuthState {
  user: User | null;
  token: string | null;
}

const initial: AuthState = { user: null, token: null };

export const authReducer = createReducer(
  initial,
  on(AuthActions.hydrate, (_s, { user, token }) => ({ user, token })),
  on(AuthActions.loginSuccess, (_s, { user, token }) => ({ user, token })),
  on(AuthActions.logout, () => initial)
);
