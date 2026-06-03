import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Challenge, LeaderboardRow, PagedResponse } from '../../core/models';
import { FeatureTagBadgeComponent } from '../../shared/components/feature-tag-badge.component';
import { ExpiryCountdownPipe } from '../../shared/pipes/expiry-countdown.pipe';
import { RankBadgeComponent } from '../../shared/components/rank-badge.component';
import { MaskPipe } from '../../shared/pipes/mask.pipe';

@Component({
  selector: 'app-challenge-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    FeatureTagBadgeComponent, ExpiryCountdownPipe, RankBadgeComponent, MaskPipe
  ],
  template: `
    <section class="page">
      <a mat-button routerLink="/challenges" data-testid="challenge-back"><mat-icon>chevron_left</mat-icon> Back to challenges</a>

      <ng-container *ngIf="challenge; else loading">
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ challenge.name }}</h1>
            <div class="page-subtitle">{{ challenge.description }}</div>
          </div>
          <div class="btn-row">
            <button *ngIf="canJoin()" mat-flat-button color="primary" (click)="join()" data-testid="challenge-join">
              <mat-icon>flag</mat-icon> Join challenge
            </button>
            <a *ngIf="auth.isAdmin" mat-stroked-button color="primary" [routerLink]="['/admin/challenges', challenge.id, 'edit']" data-testid="challenge-edit">
              <mat-icon>edit</mat-icon> Edit
            </a>
          </div>
        </div>

        <div class="grid grid-cols-3">
          <div class="surface meta">
            <div class="m-row"><span class="muted">Status</span>
              <span class="badge" [class.success]="challenge.status === 'ACTIVE'" [class.muted]="challenge.status !== 'ACTIVE'">{{ challenge.status }}</span>
            </div>
            <div class="m-row"><span class="muted">Region</span><span class="badge muted">{{ challenge.region }}</span></div>
            <div class="m-row"><span class="muted">Scope</span><span class="badge muted">{{ challenge.scope }}</span></div>
            <div class="m-row"><span class="muted">Starts</span><span class="mono">{{ challenge.startAt | date:'medium' }}</span></div>
            <div class="m-row"><span class="muted">Ends</span><span class="mono">{{ challenge.endAt | date:'medium' }}</span></div>
            <div class="m-row"><span class="muted">Time</span><span class="badge" [class.error]="ended" [class.success]="!ended">{{ challenge.endAt | expiryCountdown }}</span></div>
            <div class="m-row"><span class="muted">Tags</span>
              <div class="chip-set">
                <app-feature-tag-badge *ngFor="let t of challenge.requiredTags" [label]="t"></app-feature-tag-badge>
              </div>
            </div>
          </div>

          <div class="surface span-2">
            <h3>Participants &amp; rankings</h3>
            <ng-container *ngIf="participants?.content?.length; else empty">
              <table class="simple" data-testid="challenge-participants">
                <thead><tr><th>Rank</th><th>Name</th><th>Contact</th><th>Region</th><th>Points</th></tr></thead>
                <tbody>
                  <tr *ngFor="let p of participants?.content">
                    <td><app-rank-badge [rank]="p.rank"></app-rank-badge></td>
                    <td>{{ p.fullName }}</td>
                    <td class="mono small">{{ p.email | mask:'email' }} · {{ p.phone | mask:'phone' }}</td>
                    <td><span class="badge muted">{{ p.region }}</span></td>
                    <td class="mono"><strong>{{ p.totalPoints | number }}</strong></td>
                  </tr>
                </tbody>
              </table>
            </ng-container>
            <ng-template #empty><div class="empty">No participants yet — be the first to join!</div></ng-template>
          </div>
        </div>
      </ng-container>

      <ng-template #loading><div class="spinner-wrap"><mat-spinner diameter="32"></mat-spinner></div></ng-template>
    </section>
  `,
  styles: [`
    .meta .m-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px dashed var(--line); align-items: center; }
    .meta .m-row:last-child { border-bottom: 0; }
    .span-2 { grid-column: span 2; }
    .small { font-size: 12px; }
    @media (max-width: 1024px) { .span-2 { grid-column: span 1; } }
  `]
})
export class ChallengeDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  challenge: Challenge | null = null;
  participants: PagedResponse<LeaderboardRow> | null = null;

  get ended(): boolean {
    if (!this.challenge) return false;
    return new Date(this.challenge.endAt).getTime() <= Date.now();
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(switchMap((p) => this.api.getChallenge(Number(p.get('id')))))
      .subscribe((c) => {
        this.challenge = c;
        this.loadParticipants();
      });
  }

  loadParticipants(): void {
    if (!this.challenge) return;
    this.api.listChallengeParticipants(this.challenge.id, { size: 50 }).subscribe((p) => (this.participants = p));
  }

  canJoin(): boolean {
    const uid = this.auth.currentUser?.id;
    if (!uid || !this.challenge) return false;
    if (this.challenge.status !== 'ACTIVE') return false;
    return !this.challenge.participants?.includes(uid);
  }

  join(): void {
    const uid = this.auth.currentUser?.id;
    if (!uid || !this.challenge) return;
    this.api.joinChallenge(this.challenge.id, uid).subscribe(() => {
      this.toast.success(`Joined ${this.challenge!.name}`);
      this.api.getChallenge(this.challenge!.id).subscribe((c) => { this.challenge = c; this.loadParticipants(); });
    });
  }
}
