import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'health',
    loadComponent: () => import('./pages/health/health.component').then((m) => m.HealthComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./pages/unauthorized/unauthorized.component').then((m) => m.UnauthorizedComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'tasks',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tasks/task-list.component').then((m) => m.TaskListComponent)
  },
  {
    path: 'tasks/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/tasks/task-detail.component').then((m) => m.TaskDetailComponent)
  },
  {
    path: 'admin/tasks/new',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ROLE_ADMIN' },
    loadComponent: () => import('./pages/tasks/task-form.component').then((m) => m.TaskFormComponent)
  },
  {
    path: 'admin/tasks/:id/edit',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ROLE_ADMIN' },
    loadComponent: () => import('./pages/tasks/task-form.component').then((m) => m.TaskFormComponent)
  },
  {
    path: 'challenges',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/challenges/challenge-list.component').then((m) => m.ChallengeListComponent)
  },
  {
    path: 'challenges/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/challenges/challenge-detail.component').then((m) => m.ChallengeDetailComponent)
  },
  {
    path: 'admin/challenges/new',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ROLE_ADMIN' },
    loadComponent: () => import('./pages/challenges/challenge-form.component').then((m) => m.ChallengeFormComponent)
  },
  {
    path: 'admin/challenges/:id/edit',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ROLE_ADMIN' },
    loadComponent: () => import('./pages/challenges/challenge-form.component').then((m) => m.ChallengeFormComponent)
  },
  {
    path: 'admin/devices',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ROLE_ADMIN' },
    loadComponent: () => import('./pages/devices/device-list.component').then((m) => m.DeviceListComponent)
  },
  {
    path: 'admin/devices/new',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ROLE_ADMIN' },
    loadComponent: () => import('./pages/devices/device-form.component').then((m) => m.DeviceFormComponent)
  },
  {
    path: 'admin/devices/:id/edit',
    canActivate: [authGuard, roleGuard],
    data: { role: 'ROLE_ADMIN' },
    loadComponent: () => import('./pages/devices/device-form.component').then((m) => m.DeviceFormComponent)
  },
  {
    path: 'activity',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/activity/activity.component').then((m) => m.ActivityComponent)
  },
  {
    path: 'leaderboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/leaderboard/leaderboard.component').then((m) => m.LeaderboardComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];
