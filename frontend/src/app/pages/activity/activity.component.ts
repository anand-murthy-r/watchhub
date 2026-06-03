import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Activity, UserProgress } from '../../core/models';

const stepCountValidator: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const n = Number(c.value);
  if (Number.isNaN(n) || n <= 0) return { stepCount: 'Steps must be greater than 0' };
  return null;
};

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Log activity</h1>
          <div class="page-subtitle">Submit telemetry from your smartwatch — feeds the leaderboard ranking engine.</div>
        </div>
      </div>

      <div class="grid grid-cols-2">
        <div class="surface">
          <h3>New telemetry entry</h3>
          <form [formGroup]="form" (ngSubmit)="submit()" class="form" data-testid="telemetry-form">
            <mat-form-field appearance="outline">
              <mat-label>Activity date</mat-label>
              <input matInput [matDatepicker]="dp" formControlName="activityDate" data-testid="telemetry-date" />
              <mat-datepicker-toggle matIconSuffix [for]="dp"></mat-datepicker-toggle>
              <mat-datepicker #dp></mat-datepicker>
              <mat-error *ngIf="form.controls.activityDate.invalid">Activity date is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Step count</mat-label>
              <input matInput type="number" formControlName="stepCountValue" data-testid="telemetry-steps" />
              <mat-icon matSuffix>directions_walk</mat-icon>
              <mat-error *ngIf="form.controls.stepCountValue.hasError('required')">Step count is required</mat-error>
              <mat-error *ngIf="form.controls.stepCountValue.hasError('stepCount')">{{ form.controls.stepCountValue.errors?.['stepCount'] }}</mat-error>
            </mat-form-field>

            <div class="grid grid-cols-2 gap-3">
              <mat-form-field appearance="outline">
                <mat-label>Heart rate (bpm)</mat-label>
                <input matInput type="number" formControlName="heartRate" data-testid="telemetry-hr" />
                <mat-icon matSuffix>favorite</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Calories</mat-label>
                <input matInput type="number" formControlName="calories" data-testid="telemetry-cal" />
                <mat-icon matSuffix>local_fire_department</mat-icon>
              </mat-form-field>
            </div>

            <div class="btn-row justify-end">
              <button mat-stroked-button type="button" (click)="reset()" data-testid="telemetry-reset">Reset</button>
              <button mat-flat-button color="primary" type="submit" [disabled]="loading" data-testid="telemetry-submit">
                <mat-spinner *ngIf="loading" diameter="18"></mat-spinner>
                <span *ngIf="!loading">Submit</span>
              </button>
            </div>
          </form>
        </div>

        <div class="surface">
          <h3>History</h3>
          <ng-container *ngIf="progress?.activities?.length; else empty">
            <table class="simple" data-testid="telemetry-history">
              <thead><tr><th>Date</th><th>Steps</th><th>HR</th><th>Cal</th></tr></thead>
              <tbody>
                <tr *ngFor="let a of sortedActivities">
                  <td>{{ a.activityDate }}</td>
                  <td class="mono">{{ a.stepCountValue | number }}</td>
                  <td>{{ a.heartRate || '—' }}</td>
                  <td>{{ a.calories || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </ng-container>
          <ng-template #empty><div class="empty">No telemetry submitted yet.</div></ng-template>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 4px; }
    @media (max-width: 768px) { .grid-cols-2 { grid-template-columns: 1fr !important; } }
  `]
})
export class ActivityComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  loading = false;
  progress: UserProgress | null = null;

  form = this.fb.group({
    activityDate: [new Date() as Date | null, [Validators.required]],
    stepCountValue: [null as number | null, [Validators.required, stepCountValidator]],
    heartRate: [null as number | null],
    calories: [null as number | null]
  });

  get sortedActivities(): Activity[] {
    return [...(this.progress?.activities || [])].sort((a, b) => (b.activityDate || '').localeCompare(a.activityDate || ''));
  }

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    const uid = this.auth.currentUser?.id;
    if (!uid) return;
    this.api.getUser(uid).subscribe((u) => (this.progress = u.progress));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const uid = this.auth.currentUser?.id;
    if (!uid) return;
    const v = this.form.getRawValue();
    const date = v.activityDate as Date;
    const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    this.loading = true;
    this.api.submitActivity(uid, {
      activityDate: isoDate,
      stepCountValue: Number(v.stepCountValue),
      heartRate: v.heartRate ?? undefined,
      calories: v.calories ?? undefined
    }).subscribe({
      next: () => {
        this.loading = false;
        this.toast.success(`Logged ${v.stepCountValue} steps for ${isoDate}!`);
        this.form.reset({ activityDate: new Date(), stepCountValue: null, heartRate: null, calories: null });
        this.loadHistory();
      },
      error: (err) => {
        this.loading = false;
        // map field-level errors if backend returns them
        if (err?.errors) {
          for (const [field, msg] of Object.entries(err.errors)) {
            const ctrl = this.form.get(field);
            ctrl?.setErrors({ server: msg });
          }
        }
      }
    });
  }

  reset(): void {
    this.form.reset({ activityDate: new Date(), stepCountValue: null, heartRate: null, calories: null });
  }
}
