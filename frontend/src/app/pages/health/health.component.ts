import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">System health</h1>
          <div class="page-subtitle">Live status of the Smartwatch Leaderboard backend</div>
        </div>
      </div>
      <div class="surface" data-testid="health-surface">
        <ng-container *ngIf="loading; else loaded">
          <div class="spinner-wrap"><mat-spinner diameter="32"></mat-spinner></div>
        </ng-container>
        <ng-template #loaded>
          <div class="flex items-center gap-4" *ngIf="health; else err">
            <div class="dot" [class.up]="health.status === 'UP'"></div>
            <div>
              <div class="status-line" data-testid="health-status">{{ health.status }}</div>
              <div class="muted">Service: {{ health.service }}</div>
              <div class="muted">Last checked: {{ health.timestamp }}</div>
            </div>
          </div>
          <ng-template #err>
            <div class="empty" data-testid="health-error">Could not reach backend.</div>
          </ng-template>
        </ng-template>
      </div>
    </section>
  `,
  styles: [`
    .dot {
      width: 16px; height: 16px; border-radius: 50%;
      background: var(--bad);
      box-shadow: 0 0 0 6px rgba(255,71,111,0.18);
    }
    .dot.up { background: var(--good); box-shadow: 0 0 0 6px rgba(0,184,132,0.18); }
    .status-line { font-size: 24px; font-weight: 700; letter-spacing: -0.01em; }
  `]
})
export class HealthComponent implements OnInit {
  private api = inject(ApiService);
  loading = true;
  health: { status: string; service: string; timestamp: string } | null = null;

  ngOnInit(): void {
    this.api.health().subscribe({
      next: (res) => { this.health = res; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
}
