import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { switchMap, startWith, of, BehaviorSubject } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Challenge, LeaderboardRow, PagedResponse } from '../../core/models';
import { RankBadgeComponent } from '../../shared/components/rank-badge.component';
import { MaskPipe } from '../../shared/pipes/mask.pipe';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    RankBadgeComponent, MaskPipe
  ],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Leaderboard</h1>
          <div class="page-subtitle">Live standings across challenges. Top three earn medal badges.</div>
        </div>
        <button *ngIf="auth.isAdmin" mat-stroked-button color="primary" (click)="trigger()" data-testid="leaderboard-rank">
          <mat-icon>refresh</mat-icon> Trigger ranking
        </button>
      </div>

      <div class="surface">
        <div class="toolbar">
          <mat-form-field appearance="outline" class="grow">
            <mat-label>Challenge</mat-label>
            <mat-select [formControl]="challengeId" data-testid="leaderboard-challenge">
              <mat-option *ngFor="let c of challenges" [value]="c.id">
                {{ c.name }} <span class="muted">· {{ c.region }}</span>
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <ng-container *ngIf="rows$ | async as page; else loading">
          <ng-container *ngIf="page.content.length; else empty">
            <div class="podium" *ngIf="topThree(page.content).length">
              <div class="pod-slot" *ngFor="let r of topThree(page.content)" [class.first]="r.rank === 1" data-testid="podium-card">
                <div class="medal medal-{{ r.rank }}">
                  <mat-icon>emoji_events</mat-icon>
                </div>
                <div class="p-name">{{ r.fullName }}</div>
                <div class="muted small">{{ r.email | mask:'email' }}</div>
                <div class="p-points mono">{{ r.totalPoints | number }} pts</div>
              </div>
            </div>

            <table class="simple mt-3" data-testid="leaderboard-table">
              <thead><tr><th>Rank</th><th>Name</th><th>Region</th><th>Points</th><th>Rewards</th></tr></thead>
              <tbody>
                <tr *ngFor="let r of page.content" data-testid="leaderboard-row">
                  <td><app-rank-badge [rank]="r.rank"></app-rank-badge></td>
                  <td>
                    <div class="t">{{ r.fullName }}</div>
                    <div class="muted small">{{ r.phone | mask:'phone' }}</div>
                  </td>
                  <td><span class="badge muted">{{ r.region }}</span></td>
                  <td class="mono"><strong>{{ r.totalPoints | number }}</strong></td>
                  <td>
                    <span class="badge success" *ngFor="let rw of r.rewards" style="margin-right:4px">{{ rw }}</span>
                    <span class="muted small" *ngIf="!r.rewards?.length">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </ng-container>
          <ng-template #empty><div class="empty">Select a challenge with participants.</div></ng-template>
        </ng-container>
        <ng-template #loading><div class="spinner-wrap"><mat-spinner diameter="32"></mat-spinner></div></ng-template>
      </div>
    </section>
  `,
  styles: [`
    .grow { flex: 1; min-width: 240px; }
    .podium {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px;
    }
    .pod-slot {
      background: linear-gradient(180deg, #fff, #f6f7ff);
      border: 1px solid var(--line); border-radius: 18px;
      padding: 20px; text-align: center;
    }
    .pod-slot.first { border-color: var(--gold); box-shadow: 0 8px 24px rgba(246,201,69,0.25); transform: translateY(-6px); }
    .medal mat-icon { font-size: 40px; height: 40px; width: 40px; }
    .medal.medal-1 mat-icon { color: var(--gold); }
    .medal.medal-2 mat-icon { color: var(--silver); }
    .medal.medal-3 mat-icon { color: var(--bronze); }
    .p-name { font-weight: 700; font-size: 18px; margin-top: 6px; }
    .p-points { font-size: 22px; margin-top: 6px; font-weight: 700; }
    .mt-3 { margin-top: 16px; }
    .t { font-weight: 600; }
    .small { font-size: 12px; }
    @media (max-width: 720px) { .podium { grid-template-columns: 1fr; } }
  `]
})
export class LeaderboardComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  challengeId = new FormControl<number | null>(null);
  challenges: Challenge[] = [];
  refresh$ = new BehaviorSubject<void>(undefined);

  rows$ = this.challengeId.valueChanges.pipe(
    startWith(null as number | null),
    switchMap((id) => id ? this.api.listChallengeParticipants(id, { size: 100 }) : of({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 0 } as PagedResponse<LeaderboardRow>))
  );

  ngOnInit(): void {
    this.api.listChallenges({ size: 100 }).subscribe((p) => {
      this.challenges = p.content;
      if (this.challenges.length && !this.challengeId.value) {
        this.challengeId.setValue(this.challenges[0].id);
      }
    });
  }

  topThree(rows: LeaderboardRow[]): LeaderboardRow[] {
    return rows.filter((r) => r.rank <= 3).sort((a, b) => a.rank - b.rank);
  }

  trigger(): void {
    this.api.triggerRanking().subscribe(() => {
      this.toast.success('Ranking job executed');
      // Force re-fetch
      const cur = this.challengeId.value;
      this.challengeId.setValue(null);
      setTimeout(() => this.challengeId.setValue(cur), 0);
    });
  }
}
