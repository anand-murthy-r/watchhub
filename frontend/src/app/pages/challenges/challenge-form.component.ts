import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { TaskItem } from '../../core/models';

const ALL_TAGS = ['STEPS', 'HRM', 'CALORIES', 'SLEEP', 'GPS', 'ALTITUDE', 'RESPIRATORY_RATE', 'TEMPERATURE'];

@Component({
  selector: 'app-challenge-form',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatIconModule
  ],
  template: `
    <section class="page">
      <a mat-button routerLink="/challenges" data-testid="challenge-form-back"><mat-icon>chevron_left</mat-icon> Cancel</a>
      <div class="page-header">
        <h1 class="page-title">{{ isEdit ? 'Edit challenge' : 'New challenge' }}</h1>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="surface grid grid-cols-2 gap-4" data-testid="challenge-form">
        <mat-form-field appearance="outline" class="full-row">
          <mat-label>Challenge name</mat-label>
          <input matInput formControlName="name" data-testid="ch-name" />
          <mat-error *ngIf="form.controls.name.invalid">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-row">
          <mat-label>Description</mat-label>
          <textarea matInput rows="3" formControlName="description" data-testid="ch-desc"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Scope</mat-label>
          <mat-select formControlName="scope" data-testid="ch-scope">
            <mat-option value="PUBLIC">Public</mat-option>
            <mat-option value="FRIENDLY">Friendly</mat-option>
            <mat-option value="PRIVATE">Private</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status" data-testid="ch-status">
            <mat-option value="ACTIVE">Active</mat-option>
            <mat-option value="DRAFT">Draft</mat-option>
            <mat-option value="CLOSED">Closed</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Region</mat-label>
          <mat-select formControlName="region" data-testid="ch-region">
            <mat-option value="GLOBAL">Global</mat-option>
            <mat-option value="APAC">APAC</mat-option>
            <mat-option value="NA">NA</mat-option>
            <mat-option value="EU">EU</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Task</mat-label>
          <mat-select formControlName="taskId" data-testid="ch-task">
            <mat-option *ngFor="let t of tasks" [value]="t.id">{{ t.name }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Starts</mat-label>
          <input matInput [matDatepicker]="sp" formControlName="startAt" data-testid="ch-start" />
          <mat-datepicker-toggle matIconSuffix [for]="sp"></mat-datepicker-toggle>
          <mat-datepicker #sp></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ends</mat-label>
          <input matInput [matDatepicker]="ep" formControlName="endAt" data-testid="ch-end" />
          <mat-datepicker-toggle matIconSuffix [for]="ep"></mat-datepicker-toggle>
          <mat-datepicker #ep></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-row">
          <mat-label>Required tags</mat-label>
          <mat-select multiple formControlName="requiredTags" data-testid="ch-tags">
            <mat-option *ngFor="let t of tags" [value]="t">{{ t }}</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="full-row btn-row justify-end">
          <a mat-stroked-button routerLink="/challenges" data-testid="ch-cancel">Cancel</a>
          <button mat-flat-button color="primary" type="submit" data-testid="ch-submit">{{ isEdit ? 'Save changes' : 'Create challenge' }}</button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    .full-row { grid-column: 1 / -1; }
    @media (max-width: 768px) { .grid-cols-2 { grid-template-columns: 1fr !important; } }
  `]
})
export class ChallengeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  tags = ALL_TAGS;
  tasks: TaskItem[] = [];
  isEdit = false;
  editId: number | null = null;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    description: ['', [Validators.required]],
    scope: ['PUBLIC', [Validators.required]],
    status: ['ACTIVE', [Validators.required]],
    region: ['GLOBAL', [Validators.required]],
    taskId: [null as number | null, [Validators.required]],
    startAt: [new Date(), [Validators.required]],
    endAt: [new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), [Validators.required]],
    requiredTags: [[] as string[]]
  });

  ngOnInit(): void {
    this.api.listTasks({ size: 100 }).subscribe((p) => (this.tasks = p.content));
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.editId = Number(idParam);
      this.api.getChallenge(this.editId).subscribe((c) => {
        this.form.patchValue({
          name: c.name,
          description: c.description,
          scope: c.scope,
          status: c.status,
          region: c.region,
          taskId: c.taskId,
          startAt: new Date(c.startAt),
          endAt: new Date(c.endAt),
          requiredTags: c.requiredTags
        });
      });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const payload: Partial<import('../../core/models').Challenge> = {
      name: v.name,
      description: v.description,
      scope: v.scope,
      status: v.status as 'ACTIVE' | 'CLOSED' | 'DRAFT',
      region: v.region,
      taskId: v.taskId!,
      startAt: v.startAt.toISOString(),
      endAt: v.endAt.toISOString(),
      requiredTags: v.requiredTags
    };
    const op$ = this.isEdit && this.editId ? this.api.updateChallenge(this.editId, payload) : this.api.createChallenge(payload);
    op$.subscribe((c) => {
      this.toast.success(this.isEdit ? 'Challenge updated' : 'Challenge created');
      this.router.navigate(['/challenges', c.id]);
    });
  }
}
