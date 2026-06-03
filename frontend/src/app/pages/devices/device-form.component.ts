import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

const ALL_TAGS = ['STEPS', 'HRM', 'CALORIES', 'SLEEP', 'GPS', 'ALTITUDE', 'RESPIRATORY_RATE', 'TEMPERATURE'];

@Component({
  selector: 'app-device-form',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule
  ],
  template: `
    <section class="page">
      <a mat-button routerLink="/admin/devices" data-testid="device-form-back"><mat-icon>chevron_left</mat-icon> Back</a>
      <div class="page-header">
        <h1 class="page-title">{{ isEdit ? 'Edit device' : 'Add new device' }}</h1>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="surface grid grid-cols-2 gap-4" data-testid="device-form">
        <mat-form-field appearance="outline">
          <mat-label>Device name</mat-label>
          <input matInput formControlName="name" data-testid="device-name" />
          <mat-error *ngIf="form.controls.name.invalid">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Manufacturer</mat-label>
          <input matInput formControlName="manufacturer" data-testid="device-manufacturer" />
          <mat-error *ngIf="form.controls.manufacturer.invalid">Required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-row">
          <mat-label>Capability tags</mat-label>
          <mat-select multiple formControlName="featureTags" data-testid="device-tags">
            <mat-option *ngFor="let t of tags" [value]="t">{{ t }}</mat-option>
          </mat-select>
          <mat-error *ngIf="form.controls.featureTags.invalid">Pick at least one capability</mat-error>
        </mat-form-field>

        <div class="full-row btn-row justify-end">
          <a mat-stroked-button routerLink="/admin/devices" data-testid="device-cancel">Cancel</a>
          <button mat-flat-button color="primary" type="submit" data-testid="device-submit">{{ isEdit ? 'Save' : 'Create' }}</button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    .full-row { grid-column: 1 / -1; }
    @media (max-width: 768px) { .grid-cols-2 { grid-template-columns: 1fr !important; } }
  `]
})
export class DeviceFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  tags = ALL_TAGS;
  isEdit = false;
  editId: number | null = null;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    manufacturer: ['', [Validators.required]],
    featureTags: [[] as string[], [Validators.required, Validators.minLength(1)]]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.editId = Number(idParam);
      this.api.listDevices({ size: 100 }).subscribe((page) => {
        const d = page.content.find((x) => x.id === this.editId);
        if (d) this.form.patchValue(d);
      });
    }
  }

  submit(): void {
    if (this.form.invalid || (this.form.value.featureTags?.length || 0) === 0) {
      this.form.markAllAsTouched();
      return;
    }
    const op$ = this.isEdit && this.editId
      ? this.api.updateDevice(this.editId, this.form.getRawValue())
      : this.api.createDevice(this.form.getRawValue());
    op$.subscribe(() => {
      this.toast.success(this.isEdit ? 'Device updated' : 'Device added');
      this.router.navigate(['/admin/devices']);
    });
  }
}
