import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { switchMap, of, catchError, combineLatest } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TaskItem, User, PagedResponse } from '../../core/models';
import { FeatureTagBadgeComponent } from '../../shared/components/feature-tag-badge.component';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    FeatureTagBadgeComponent
  ],
  template: `
    <section class="page">
      <a mat-button routerLink="/tasks" data-testid="task-back"><mat-icon>chevron_left</mat-icon> Back to tasks</a>

      <ng-container *ngIf="task; else loading">
        <div class="page-header">
          <div>
            <h1 class="page-title">{{ task.name }}</h1>
            <div class="page-subtitle">{{ task.description }}</div>
          </div>
          <div class="btn-row" *ngIf="auth.isAdmin">
            <a mat-stroked-button color="primary" [routerLink]="['/admin/tasks', task.id, 'edit']" data-testid="task-edit">
              <mat-icon>edit</mat-icon> Edit
            </a>
            <button mat-stroked-button color="warn" (click)="remove()" data-testid="task-delete">
              <mat-icon>delete</mat-icon> Delete
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3">
          <div class="surface meta">
            <div class="m-row"><span class="muted">Region</span><span class="badge muted">{{ task.region }}</span></div>
            <div class="m-row"><span class="muted">Duration</span><span class="mono">{{ task.duration }}d</span></div>
            <div class="m-row"><span class="muted">Step goal</span><span class="mono">{{ task.targetSteps | number }}</span></div>
            <div class="m-row"><span class="muted">Status</span>
              <span class="badge" [class.success]="task.active" [class.muted]="!task.active">{{ task.active ? 'Active' : 'Paused' }}</span>
            </div>
            <div class="m-row"><span class="muted">Reward</span><span class="badge success">{{ task.outcome?.reward }}</span></div>
          </div>
          <div class="surface span-2">
            <h3>Required device capabilities</h3>
            <div class="chip-set mt-2">
              <app-feature-tag-badge *ngFor="let tag of task.requiredTags" [label]="tag"></app-feature-tag-badge>
              <span class="muted small" *ngIf="!task.requiredTags?.length">No specific capability required.</span>
            </div>

            <h3 class="mt-4">Participants</h3>
            <ng-container *ngIf="participants?.content?.length; else noPart">
              <table class="simple" data-testid="task-participants">
                <thead><tr><th>Name</th><th>Email</th><th>Region</th></tr></thead>
                <tbody>
                  <tr *ngFor="let u of participants?.content">
                    <td>{{ u.fullName }}</td>
                    <td>{{ u.email }}</td>
                    <td><span class="badge muted">{{ u.region }}</span></td>
                  </tr>
                </tbody>
              </table>
            </ng-container>
            <ng-template #noPart><div class="empty">No participants enrolled yet.</div></ng-template>
          </div>
        </div>
      </ng-container>

      <ng-template #loading>
        <div class="spinner-wrap"><mat-spinner diameter="32"></mat-spinner></div>
      </ng-template>
    </section>
  `,
  styles: [`
    .meta .m-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed var(--line); }
    .meta .m-row:last-child { border-bottom: 0; }
    .span-2 { grid-column: span 2; }
    .mt-2 { margin-top: 8px; } .mt-4 { margin-top: 16px; }
    @media (max-width: 1024px) { .span-2 { grid-column: span 1; } }
  `]
})
export class TaskDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  task: TaskItem | null = null;
  participants: PagedResponse<User> | null = null;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((p) => {
          const id = Number(p.get('id'));
          return combineLatest([
            this.api.getTask(id),
            this.api.listTaskParticipants(id, { size: 20 }).pipe(catchError(() => of(null)))
          ]);
        })
      )
      .subscribe(([t, parts]) => {
        this.task = t;
        this.participants = parts as PagedResponse<User> | null;
      });
  }

  remove(): void {
    if (!this.task) return;
    if (!confirm(`Delete task "${this.task.name}"?`)) return;
    this.api.deleteTask(this.task.id).subscribe(() => {
      this.toast.success('Task deleted');
      this.router.navigate(['/tasks']);
    });
  }
}
