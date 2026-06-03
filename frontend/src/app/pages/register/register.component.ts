import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Device } from '../../core/models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatRadioModule
  ],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Create your account</h1>
          <p class="page-subtitle">Already have one? <a routerLink="/login" data-testid="register-go-login">Sign in</a></p>
        </div>
      </div>

      <div class="surface">
        <form [formGroup]="form" (ngSubmit)="submit()" class="grid grid-cols-2 gap-4" data-testid="register-form">
          <mat-form-field appearance="outline">
            <mat-label>Full name</mat-label>
            <input matInput formControlName="fullName" data-testid="register-fullName" />
            <mat-error *ngIf="form.controls.fullName.invalid">Required, min 2 chars</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" data-testid="register-email" />
            <mat-error *ngIf="form.controls.email.hasError('required')">Email is required</mat-error>
            <mat-error *ngIf="form.controls.email.hasError('email')">Enter a valid email</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" type="password" data-testid="register-password" />
            <mat-error *ngIf="form.controls.password.hasError('required')">Password is required</mat-error>
            <mat-error *ngIf="form.controls.password.hasError('minlength')">At least 6 characters</mat-error>
            <mat-error *ngIf="form.controls.password.hasError('pattern')">Include a letter, number &amp; symbol</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Phone</mat-label>
            <input matInput formControlName="phone" data-testid="register-phone" placeholder="+1-555-123-9988" />
            <mat-error *ngIf="form.controls.phone.invalid">Phone is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>City</mat-label>
            <input matInput formControlName="city" data-testid="register-city" />
            <mat-error *ngIf="form.controls.city.invalid">City is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Region</mat-label>
            <mat-select formControlName="region" data-testid="register-region">
              <mat-option value="APAC">APAC</mat-option>
              <mat-option value="NA">North America</mat-option>
              <mat-option value="EU">Europe</mat-option>
              <mat-option value="LATAM">LATAM</mat-option>
              <mat-option value="GLOBAL">Global</mat-option>
            </mat-select>
            <mat-error *ngIf="form.controls.region.invalid">Choose a region</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Smartwatch device</mat-label>
            <mat-select formControlName="deviceId" data-testid="register-device">
              <mat-option [value]="null">— no device —</mat-option>
              <mat-option *ngFor="let d of devices" [value]="d.id">{{ d.name }} · {{ d.manufacturer }}</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="role-block">
            <label class="muted small">Role</label>
            <mat-radio-group formControlName="role" data-testid="register-role" class="role-group">
              <mat-radio-button value="ROLE_USER">User</mat-radio-button>
              <mat-radio-button value="ROLE_ADMIN">Admin</mat-radio-button>
            </mat-radio-group>
          </div>

          <div class="full-row btn-row justify-end">
            <a mat-stroked-button routerLink="/login" data-testid="register-cancel">Cancel</a>
            <button mat-flat-button color="primary" type="submit" [disabled]="loading" data-testid="register-submit">
              <mat-spinner *ngIf="loading" diameter="18"></mat-spinner>
              <span *ngIf="!loading">Create account</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  `,
  styles: [`
    .role-block { display: flex; flex-direction: column; gap: 8px; padding: 4px; }
    .role-group { display: flex; gap: 16px; }
    .full-row { grid-column: 1 / -1; }
    .small { font-size: 12px; }
    @media (max-width: 768px) {
      .grid-cols-2 { grid-template-columns: 1fr !important; }
    }
  `]
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);

  loading = false;
  devices: Device[] = [];

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    phone: ['', [Validators.required]],
    city: ['', [Validators.required]],
    region: ['APAC', [Validators.required]],
    role: ['ROLE_USER' as 'ROLE_USER' | 'ROLE_ADMIN', [Validators.required]],
    deviceId: [null as number | null]
  });

  ngOnInit(): void {
    this.api.listDevices({ size: 50 }).subscribe({
      next: (page) => (this.devices = page.content)
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const raw = this.form.getRawValue();
    this.auth.register({
      ...raw,
      deviceId: raw.deviceId ?? undefined
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.toast.success(`Welcome, ${res.user.fullName.split(' ')[0]}! Your account is ready.`);
        this.router.navigate(['/dashboard']);
      },
      error: () => { this.loading = false; }
    });
  }
}
