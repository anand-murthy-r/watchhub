import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="page">
      <div class="surface center" data-testid="unauthorized-page">
        <mat-icon class="big">block</mat-icon>
        <h1 class="title">403 — Access denied</h1>
        <p class="muted">You don't have permission to view this page.<br/>If you believe this is a mistake, ask your admin to update your role.</p>
        <a mat-flat-button color="primary" routerLink="/dashboard" data-testid="unauth-home-btn">Back to dashboard</a>
      </div>
    </section>
  `,
  styles: [`
    .center { text-align: center; padding: 64px 24px; }
    .big { font-size: 64px; height: 64px; width: 64px; color: var(--bad); }
    .title { font-size: 32px; font-weight: 700; margin: 12px 0 4px; }
  `]
})
export class UnauthorizedComponent {}
