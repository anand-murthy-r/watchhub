import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { BehaviorSubject, Subject, combineLatest, debounceTime, distinctUntilChanged, startWith, switchMap, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PagedResponse, TaskItem } from '../../core/models';
import { FeatureTagBadgeComponent } from '../../shared/components/feature-tag-badge.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatTableModule, MatPaginatorModule,
    MatProgressSpinnerModule, MatChipsModule, FeatureTagBadgeComponent
  ],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Tasks</h1>
          <div class="page-subtitle">Active routines you can complete to earn rewards.</div>
        </div>
        <a *ngIf="auth.isAdmin" mat-flat-button color="primary" routerLink="/admin/tasks/new" data-testid="task-list-create">
          <mat-icon>add</mat-icon> New task
        </a>
      </div>

      <div class="surface">
        <div class="toolbar">
          <mat-form-field appearance="outline" class="grow">
            <mat-label>Search tasks</mat-label>
            <input matInput [formControl]="search" data-testid="task-search" placeholder="Try 'morning' or 'cardio'" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Region</mat-label>
            <mat-select [formControl]="region" data-testid="task-region">
              <mat-option [value]="''">All</mat-option>
              <mat-option value="GLOBAL">Global</mat-option>
              <mat-option value="APAC">APAC</mat-option>
              <mat-option value="NA">NA</mat-option>
              <mat-option value="EU">EU</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Sort</mat-label>
            <mat-select [formControl]="sort" data-testid="task-sort">
              <mat-option value="id,asc">Newest first</mat-option>
              <mat-option value="name,asc">Name A→Z</mat-option>
              <mat-option value="duration,desc">Duration (longest)</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <ng-container *ngIf="page$ | async as page; else loading">
          <ng-container *ngIf="page.content.length; else empty">
            <table class="simple" data-testid="task-table">
              <thead>
                <tr><th>Task</th><th>Region</th><th>Duration</th><th>Required tags</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of page.content" data-testid="task-row">
                  <td>
                    <div class="title-cell">
                      <a [routerLink]="['/tasks', t.id]" class="task-name" data-testid="task-link">{{ t.name }}</a>
                      <div class="muted small">{{ t.description }}</div>
                    </div>
                  </td>
                  <td><span class="badge muted">{{ t.region }}</span></td>
                  <td class="mono">{{ t.duration }}d</td>
                  <td>
                    <app-feature-tag-badge *ngFor="let tag of t.requiredTags" [label]="tag"></app-feature-tag-badge>
                  </td>
                  <td>
                    <span class="badge" [class.success]="t.active" [class.muted]="!t.active">{{ t.active ? 'Active' : 'Paused' }}</span>
                  </td>
                  <td class="r">
                    <a mat-button color="primary" [routerLink]="['/tasks', t.id]" data-testid="task-view">View</a>
                  </td>
                </tr>
              </tbody>
            </table>

            <mat-paginator
              [length]="page.totalElements"
              [pageSize]="size$.value"
              [pageIndex]="pageIdx$.value"
              [pageSizeOptions]="[5,10,20,50]"
              (page)="onPage($event)"
              data-testid="task-paginator">
            </mat-paginator>
          </ng-container>
          <ng-template #empty>
            <div class="empty" data-testid="task-empty">No tasks match the current filters.</div>
          </ng-template>
        </ng-container>

        <ng-template #loading>
          <div class="spinner-wrap"><mat-spinner diameter="32"></mat-spinner></div>
        </ng-template>
      </div>
    </section>
  `,
  styles: [`
    .grow { flex: 1; min-width: 240px; }
    .title-cell .task-name { font-weight: 600; color: var(--ink-900); }
    .title-cell .small { font-size: 12px; max-width: 480px; }
    .r { text-align: right; }
  `]
})
export class TaskListComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  auth = inject(AuthService);

  search = new FormControl('', { nonNullable: true });
  region = new FormControl('', { nonNullable: true });
  sort = new FormControl('id,asc', { nonNullable: true });
  pageIdx$ = new BehaviorSubject<number>(0);
  size$ = new BehaviorSubject<number>(10);
  page$!: ReturnType<typeof this.buildStream>;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.page$ = this.buildStream();
  }

  buildStream() {
    return combineLatest([
      this.search.valueChanges.pipe(startWith(this.search.value), debounceTime(300), distinctUntilChanged()),
      this.region.valueChanges.pipe(startWith(this.region.value)),
      this.sort.valueChanges.pipe(startWith(this.sort.value)),
      this.pageIdx$, this.size$
    ]).pipe(
      switchMap(([search, region, sort, page, size]) =>
        this.api.listTasks({ search: search || undefined, region: region || undefined, sort, page, size })
      ),
      takeUntil(this.destroy$)
    );
  }

  onPage(e: PageEvent): void {
    this.pageIdx$.next(e.pageIndex);
    this.size$.next(e.pageSize);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
