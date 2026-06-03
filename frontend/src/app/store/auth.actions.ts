import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { User } from '../core/models';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    'Hydrate': props<{ user: User; token: string }>(),
    'Login Success': props<{ user: User; token: string }>(),
    'Logout': emptyProps()
  }
});
