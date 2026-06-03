import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Challenge, Device } from '../../core/models';
import { FeatureTagBadgeComponent } from '../../shared/components/feature-tag-badge.component';
import { ExpiryCountdownPipe } from '../../shared/pipes/expiry-countdown.pipe';

@Component({
  selector: 'app-challenge-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatPaginatorModule,
    FeatureTagBadgeComponent, ExpiryCountdownPipe
  ],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Challenges</h1>
          <div class="page-subtitle">Pick one that fits your smartwatch and climb the leaderboard.</div>
        </div>
        <a *ngIf="auth.isAdmin" mat-flat-button color="primary" routerLink="/admin/challenges/new" data-testid="challenge-create">
          <mat-icon>add</mat-icon> New challenge
        </a>
      </div>

      <div class="surface">
        <div class="toolbar">
          <mat-form-field appearance="outline" class="grow">
            <mat-label>Search</mat-label>
            <input matInput [formControl]="search" data-testid="challenge-search" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select [formControl]="status" data-testid="challenge-status">
              <mat-option [value]="''">All</mat-option>
              <mat-option value="ACTIVE">Active</mat-option>
              <mat-option value="CLOSED">Closed</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Sort</mat-label>
            <mat-select [formControl]="sort" data-testid="challenge-sort">
              <mat-option value="id,asc">Newest first</mat-option>
              <mat-option value="endAt,asc">Ending soon</mat-option>
              <mat-option value="name,asc">Name A→Z</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <ng-container *ngIf="page$ | async as page; else loading">
          <ng-container *ngIf="page.content.length; else empty">
            <div class="grid grid-cols-2" data-testid="challenge-grid">
              <article class="challenge-card surface" *ngFor="let c of page.content" data-testid="challenge-card">
                <div class="head">
                  <span class="badge" [class.success]="c.status === 'ACTIVE'" [class.muted]="c.status !== 'ACTIVE'">{{ c.status }}</span>
                  <span class="badge muted">{{ c.region }}</span>
                  <span class="badge" [class.error]="isCompatible(c) === false" [class.success]="isCompatible(c) === true">
                    <mat-icon class="small-icon">{{ isCompatible(c) ? 'verified' : 'warning' }}</mat-icon>
                    {{ isCompatible(c) ? 'Compatible' : 'Tag mismatch' }}
                  </span>
                </div>
                <h3 class="c-title">{{ c.name }}</h3>
                <p class="muted small">{{ c.description }}</p>
                <div class="chip-set mt-1">
                  <app-feature-tag-badge *ngFor="let t of c.requiredTags" [label]="t"></app-feature-tag-badge>
                </div>
                <div class="footer flex items-center justify-between mt-2">
                  <span class="muted small">{{ c.endAt | expiryCountdown }}</span>
                  <a mat-button color="primary" [routerLink]="['/challenges', c.id]" data-testid="challenge-view">View ›</a>
                </div>
              </article>
            </div>

            <mat-paginator class="mt-3"
              [length]="page.totalElements"
              [pageSize]="size$.value"
              [pageIndex]="pageIdx$.value"
              [pageSizeOptions]="[5,10,20]"
              (page)="onPage($event)"
              data-testid="challenge-paginator">
            </mat-paginator>
          </ng-container>
          <ng-template #empty><div class="empty" data-testid="challenge-empty">No challenges yet.</div></ng-template>
        </ng-container>
        <ng-template #loading><div class="spinner-wrap"><mat-spinner diameter="32"></mat-spinner></div></ng-template>
      </div>
    </section>
  `,
  styles: [`
    .grow { flex: 1; min-width: 240px; }
    .challenge-card {
      display: flex; flex-direction: column; gap: 8px;
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .challenge-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
    .head { display: flex; gap: 6px; flex-wrap: wrap; }
    .c-title { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    .small-icon { font-size: 14px; height: 14px; width: 14px; vertical-align: middle; }
    .mt-1 { margin-top: 4px; } .mt-2 { margin-top: 8px; } .mt-3 { margin-top: 12px; }
  `]
})
export class ChallengeListComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  search = new FormControl('', { nonNullable: true });
  status = new FormControl('', { nonNullable: true });
  sort = new FormControl('id,asc', { nonNullable: true });
  pageIdx$ = new BehaviorSubject<number>(0);
  size$ = new BehaviorSubject<number>(10);

  userDevice: Device | null = null;
  page$!: ReturnType<typeof this.build>;

  ngOnInit(): void {
    const deviceId = this.auth.currentUser?.deviceId;
    if (deviceId) {
      this.api.listDevices({ size: 100 }).subscribe((p) => {
        this.userDevice = p.content.find((d) => d.id === deviceId) || null;
      });
    }
    this.page$ = this.build();
  }

  build() {
    return combineLatest([
      this.search.valueChanges.pipe(startWith(this.search.value), debounceTime(300), distinctUntilChanged()),
      this.status.valueChanges.pipe(startWith(this.status.value)),
      this.sort.valueChanges.pipe(startWith(this.sort.value)),
      this.pageIdx$, this.size$
    ]).pipe(
      switchMap(([search, status, sort, page, size]) =>
        this.api.listChallenges({ search: search || undefined, status: status || undefined, sort, page, size })
      )
    );
  }

  isCompatible(c: Challenge): boolean {
    if (!this.userDevice) return true; // unknown -> don't flag
    if (!c.requiredTags?.length) return true;
    return c.requiredTags.every((t) => this.userDevice!.featureTags.includes(t));
  }

  onPage(e: PageEvent): void {
    this.pageIdx$.next(e.pageIndex);
    this.size$.next(e.pageSize);
  }
}
