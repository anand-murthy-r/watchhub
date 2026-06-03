import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { combineLatest, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { Activity, Challenge, UserProgress } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatIconModule, MatButtonModule, MatProgressSpinnerModule,
    StatCardComponent
  ],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Hi, {{ firstName }} 👋</h1>
          <div class="page-subtitle">Here's your activity snapshot and what's running across WatchHub.</div>
        </div>
        <a mat-flat-button color="primary" routerLink="/activity" data-testid="dashboard-log-cta">
          <mat-icon>add</mat-icon> Log activity
        </a>
      </div>

      <ng-container *ngIf="loading; else loaded">
        <div class="spinner-wrap"><mat-spinner diameter="32"></mat-spinner></div>
      </ng-container>

      <ng-template #loaded>
        <div class="grid grid-cols-4" data-testid="dashboard-stats">
          <app-stat-card label="Total points" [value]="progress?.totalPoints ?? 0" icon="stars" iconBg="linear-gradient(135deg,#ff6a3d,#f6c945)" hint="Across all activities"></app-stat-card>
          <app-stat-card label="Recent steps" [value]="totalRecentSteps | number" icon="directions_walk" iconBg="linear-gradient(135deg,#6c5ce7,#00c2ff)" hint="Last 7 entries"></app-stat-card>
          <app-stat-card label="Active challenges" [value]="activeChallenges" icon="emoji_events" iconBg="linear-gradient(135deg,#00b884,#00c2ff)" hint="You're competing in"></app-stat-card>
          <app-stat-card label="Rewards earned" [value]="(progress?.rewards?.length || 0)" icon="workspace_premium" iconBg="linear-gradient(135deg,#cd7f32,#ff6a3d)" hint="Badges &amp; trophies"></app-stat-card>
        </div>

        <div class="grid grid-cols-3 mt-6">
          <div class="surface span-2">
            <div class="flex items-center justify-between">
              <h3>Recent activity</h3>
              <a mat-button color="primary" routerLink="/activity" data-testid="dashboard-recent-more">View all</a>
            </div>
            <ng-container *ngIf="recent.length; else noActivity">
              <table class="simple mt-3" data-testid="dashboard-recent-table">
                <thead><tr><th>Date</th><th>Steps</th><th>Heart rate</th><th>Calories</th></tr></thead>
                <tbody>
                  <tr *ngFor="let a of recent">
                    <td>{{ a.activityDate }}</td>
                    <td class="mono">{{ a.stepCountValue | number }}</td>
                    <td>{{ a.heartRate || '—' }}</td>
                    <td>{{ a.calories || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </ng-container>
            <ng-template #noActivity>
              <div class="empty">No activity yet — log your first telemetry to start earning points.</div>
            </ng-template>
          </div>

          <div class="surface flex-col gap-3">
            <h3>Quick actions</h3>
            <a class="action-card" routerLink="/activity" data-testid="qa-log">
              <mat-icon>fitness_center</mat-icon>
              <div>
                <div class="t">Submit activity</div>
                <div class="muted small">Push step / HRM telemetry</div>
              </div>
              <mat-icon class="chev">chevron_right</mat-icon>
            </a>
            <a class="action-card" routerLink="/leaderboard" data-testid="qa-leaderboard">
              <mat-icon>leaderboard</mat-icon>
              <div>
                <div class="t">View leaderboard</div>
                <div class="muted small">See your rank now</div>
              </div>
              <mat-icon class="chev">chevron_right</mat-icon>
            </a>
            <a class="action-card" routerLink="/challenges" data-testid="qa-challenges">
              <mat-icon>flag</mat-icon>
              <div>
                <div class="t">Browse challenges</div>
                <div class="muted small">Join one that fits your device</div>
              </div>
              <mat-icon class="chev">chevron_right</mat-icon>
            </a>
          </div>
        </div>
      </ng-template>
    </section>
  `,
  styles: [`
    .mt-3 { margin-top: 12px; } .mt-6 { margin-top: 24px; }
    .span-2 { grid-column: span 2; }
    @media (max-width: 1024px) {
      .span-2 { grid-column: span 1; }
    }
    .action-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px; border: 1px solid var(--line);
      border-radius: 14px; color: var(--ink-900); text-decoration: none;
      transition: transform 0.15s, border-color 0.15s, background 0.15s;
    }
    .action-card:hover { transform: translateY(-1px); background: #f8f9ff; border-color: #cfd5f7; text-decoration: none; }
    .action-card .t { font-weight: 600; }
    .action-card .small { font-size: 12px; }
    .action-card .chev { margin-left: auto; color: #5a607f; }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  loading = true;
  progress: UserProgress | null = null;
  recent: Activity[] = [];
  challenges: Challenge[] = [];

  get firstName(): string {
    return this.auth.currentUser?.fullName?.split(' ')[0] || 'there';
  }
  get activeChallenges(): number {
    const uid = this.auth.currentUser?.id;
    return uid ? this.challenges.filter((c) => c.status === 'ACTIVE' && c.participants?.includes(uid)).length : 0;
  }
  get totalRecentSteps(): number {
    return this.recent.reduce((sum, a) => sum + (a.stepCountValue || 0), 0);
  }

  ngOnInit(): void {
    const uid = this.auth.currentUser?.id;
    if (!uid) return;
    combineLatest({
      user: this.api.getUser(uid),
      challenges: this.api.listChallenges({ size: 100 })
    }).subscribe({
      next: ({ user, challenges }) => {
        this.progress = user.progress;
        this.recent = [...(user.progress.activities || [])].sort((a, b) => (b.activityDate || '').localeCompare(a.activityDate || '')).slice(0, 5);
        this.challenges = challenges.content;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }
}
