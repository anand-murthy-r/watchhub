import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

const ALL_TAGS = ['STEPS', 'HRM', 'CALORIES', 'SLEEP', 'GPS', 'ALTITUDE', 'RESPIRATORY_RATE', 'TEMPERATURE'];

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatCheckboxModule, MatButtonModule, MatIconModule, MatChipsModule
  ],
  template: `
    <section class="page">
      <a mat-button routerLink="/tasks" data-testid="task-form-back"><mat-icon>chevron_left</mat-icon> Cancel</a>
      <div class="page-header">
        <h1 class="page-title">{{ isEdit ? 'Edit task' : 'Create new task' }}</h1>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="surface grid grid-cols-2 gap-4" data-testid="task-form">
        <mat-form-field appearance="outline" class="full-row">
          <mat-label>Task name</mat-label>
          <input matInput formControlName="name" data-testid="task-name" />
          <mat-error *ngIf="form.controls.name.invalid">Name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-row">
          <mat-label>Description</mat-label>
          <textarea matInput rows="3" formControlName="description" data-testid="task-description"></textarea>
          <mat-error *ngIf="form.controls.description.invalid">Description is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Target steps</mat-label>
          <input matInput type="number" formControlName="targetSteps" data-testid="task-target" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Duration (days)</mat-label>
          <input matInput type="number" formControlName="duration" data-testid="task-duration" />
          <mat-error *ngIf="form.controls.duration.invalid">Duration must be ≥ 1</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Region</mat-label>
          <mat-select formControlName="region" data-testid="task-region-select">
            <mat-option value="GLOBAL">Global</mat-option>
            <mat-option value="APAC">APAC</mat-option>
            <mat-option value="NA">NA</mat-option>
            <mat-option value="EU">EU</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Reward</mat-label>
          <input matInput formControlName="reward" data-testid="task-reward" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-row">
          <mat-label>Required device tags</mat-label>
          <mat-select multiple formControlName="requiredTags" data-testid="task-tags">
            <mat-option *ngFor="let t of tags" [value]="t">{{ t }}</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="full-row">
          <mat-checkbox formControlName="active" data-testid="task-active">Task is active</mat-checkbox>
        </div>

        <div class="full-row btn-row justify-end">
          <a mat-stroked-button routerLink="/tasks" data-testid="task-form-cancel">Cancel</a>
          <button mat-flat-button color="primary" type="submit" data-testid="task-form-submit">
            {{ isEdit ? 'Save changes' : 'Create task' }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    .full-row { grid-column: 1 / -1; }
    @media (max-width: 768px) { .grid-cols-2 { grid-template-columns: 1fr !important; } }
  `]
})
export class TaskFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  tags = ALL_TAGS;
  isEdit = false;
  editId: number | null = null;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required]],
    targetSteps: [0, [Validators.min(0)]],
    duration: [1, [Validators.required, Validators.min(1)]],
    region: ['GLOBAL', [Validators.required]],
    reward: ['Level1', [Validators.required]],
    requiredTags: [[] as string[]],
    active: [true]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.editId = Number(idParam);
      this.api.getTask(this.editId).subscribe((t) => {
        this.form.patchValue({
          name: t.name,
          description: t.description,
          targetSteps: t.targetSteps,
          duration: t.duration,
          region: t.region,
          reward: t.outcome?.reward || '',
          requiredTags: t.requiredTags || [],
          active: t.active
        });
      });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const payload = {
      name: v.name,
      description: v.description,
      targetSteps: v.targetSteps,
      duration: v.duration,
      region: v.region,
      requiredTags: v.requiredTags,
      active: v.active,
      outcome: { reward: v.reward }
    };
    const op$ = this.isEdit && this.editId ? this.api.updateTask(this.editId, payload) : this.api.createTask(payload);
    op$.subscribe((t) => {
      this.toast.success(this.isEdit ? 'Task updated' : 'Task created');
      this.router.navigate(['/tasks', t.id]);
    });
  }
}
