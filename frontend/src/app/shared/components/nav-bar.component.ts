import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <header class="navbar" data-testid="app-navbar">
      <div class="nav-inner">
        <a routerLink="/" class="brand" data-testid="nav-brand">
          <span class="brand-mark">⌚</span>
          <span class="brand-text">Watch<strong>Hub</strong></span>
        </a>

        <nav class="nav-links" *ngIf="auth.isAuthenticated">
          <a routerLink="/dashboard" routerLinkActive="active" data-testid="nav-dashboard">Dashboard</a>
          <a routerLink="/tasks" routerLinkActive="active" data-testid="nav-tasks">Tasks</a>
          <a routerLink="/challenges" routerLinkActive="active" data-testid="nav-challenges">Challenges</a>
          <a routerLink="/activity" routerLinkActive="active" data-testid="nav-activity">Log Activity</a>
          <a routerLink="/leaderboard" routerLinkActive="active" data-testid="nav-leaderboard">Leaderboard</a>
          <ng-container *ngIf="auth.isAdmin">
            <span class="divider"></span>
            <a routerLink="/admin/devices" routerLinkActive="active" data-testid="nav-admin-devices">Devices</a>
          </ng-container>
        </nav>

        <div class="nav-right">
          <a routerLink="/health" class="ghost-link" data-testid="nav-health">
            <mat-icon>monitor_heart</mat-icon>
            <span>Health</span>
          </a>

          <ng-container *ngIf="auth.isAuthenticated; else loggedOut">
            <button mat-button [matMenuTriggerFor]="userMenu" data-testid="nav-user-menu">
              <div class="avatar">{{ initials(auth.currentUser?.fullName) }}</div>
              <span class="user-name">{{ auth.currentUser?.fullName }}</span>
              <mat-icon>expand_more</mat-icon>
            </button>
            <mat-menu #userMenu="matMenu">
              <div class="menu-header">
                <div class="m-name">{{ auth.currentUser?.fullName }}</div>
                <div class="m-email">{{ auth.currentUser?.email }}</div>
                <div class="badge" [class.success]="auth.isAdmin">{{ auth.currentUser?.role }}</div>
              </div>
              <mat-divider></mat-divider>
              <button mat-menu-item routerLink="/dashboard" data-testid="menu-dashboard">
                <mat-icon>dashboard</mat-icon><span>Dashboard</span>
              </button>
              <button mat-menu-item (click)="logout()" data-testid="menu-logout">
                <mat-icon>logout</mat-icon><span>Sign out</span>
              </button>
            </mat-menu>
          </ng-container>
          <ng-template #loggedOut>
            <a mat-stroked-button color="primary" routerLink="/login" data-testid="nav-login">Sign in</a>
            <a mat-flat-button color="primary" routerLink="/register" data-testid="nav-register">Get started</a>
          </ng-template>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      position: sticky; top: 0; z-index: 100;
      backdrop-filter: blur(14px);
      background: rgba(255,255,255,0.88);
      border-bottom: 1px solid var(--line);
    }
    .nav-inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .brand { display: flex; align-items: center; gap: 10px; color: var(--ink-900); font-weight: 600; text-decoration: none; font-size: 18px; }
    .brand-mark { font-size: 22px; }
    .brand-text strong { color: var(--accent); font-weight: 700; }

    .nav-links {
      display: flex; gap: 4px; align-items: center; flex: 1; margin-left: 24px; flex-wrap: wrap;
    }
    .nav-links a {
      color: #4f566b;
      padding: 8px 14px;
      border-radius: 999px;
      font-weight: 500;
      font-size: 14px;
      text-decoration: none;
      transition: background 0.18s, color 0.18s;
    }
    .nav-links a:hover { color: var(--ink-900); background: #eef0ff; }
    .nav-links a.active { background: var(--ink-900); color: #fff; }
    .nav-links .divider { width: 1px; height: 20px; background: var(--line); margin: 0 6px; }

    .nav-right { display: flex; align-items: center; gap: 8px; }
    .ghost-link {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 6px 12px; color: #4f566b; font-size: 13px; border-radius: 999px;
    }
    .ghost-link mat-icon { font-size: 16px; height: 16px; width: 16px; }
    .ghost-link:hover { background: #eef0ff; text-decoration: none; }

    .avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #fff; font-weight: 700; font-size: 12px;
      display: inline-flex; align-items: center; justify-content: center;
      margin-right: 8px;
    }
    .user-name { font-size: 14px; font-weight: 500; }

    .menu-header { padding: 12px 16px; min-width: 220px; }
    .m-name { font-weight: 600; }
    .m-email { color: #5a607f; font-size: 12px; margin-top: 2px; margin-bottom: 8px; }

    @media (max-width: 768px) {
      .nav-links { display: none; }
      .user-name { display: none; }
    }
  `]
})
export class NavBarComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  initials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }
  logout(): void {
    this.auth.logout();
  }
}
