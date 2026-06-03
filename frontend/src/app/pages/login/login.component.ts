import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <section class="auth-shell">
      <div class="auth-hero">
        <div class="hero-mark">⌚</div>
        <h1>Step in. Move up.</h1>
        <p>Track activity from any smartwatch and race the global leaderboard in real time.</p>
        <ul class="bullets">
          <li><mat-icon>bolt</mat-icon> Sub-second activity ingest</li>
          <li><mat-icon>workspace_premium</mat-icon> Reward streaks &amp; badges</li>
          <li><mat-icon>public</mat-icon> Region-aware leaderboards</li>
        </ul>
      </div>

      <div class="auth-card">
        <h2 class="auth-title">Welcome back</h2>
        <p class="muted">Sign in to your WatchHub account</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form" data-testid="login-form">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" data-testid="login-email" placeholder="you@example.com" />
            <mat-error *ngIf="form.controls.email.hasError('required')">Email is required</mat-error>
            <mat-error *ngIf="form.controls.email.hasError('email')">Enter a valid email</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" [type]="show ? 'text' : 'password'" data-testid="login-password" />
            <button mat-icon-button matSuffix type="button" (click)="show = !show" tabindex="-1">
              <mat-icon>{{ show ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="form.controls.password.hasError('required')">Password is required</mat-error>
            <mat-error *ngIf="form.controls.password.hasError('minlength')">At least 6 characters</mat-error>
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" [disabled]="loading" data-testid="login-submit">
            <mat-spinner *ngIf="loading" diameter="18"></mat-spinner>
            <span *ngIf="!loading">Sign in</span>
          </button>
        </form>

        <p class="muted small">Need an account? <a routerLink="/register" data-testid="login-go-register">Create one</a></p>

        <div class="hint">
          <strong>Demo accounts</strong>
          <div>Admin · <span class="mono">admin&#64;watchhub.io</span> / <span class="mono">Admin&#64;123</span></div>
          <div>User · <span class="mono">alex.smith&#64;example.com</span> / <span class="mono">User&#64;123</span></div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .auth-shell {
      max-width: 1080px;
      margin: 32px auto;
      padding: 0 24px;
      display: grid;
      grid-template-columns: 1.05fr 1fr;
      gap: 32px;
      align-items: stretch;
    }
    .auth-hero {
      background: linear-gradient(140deg, #161a35 0%, #0f1024 70%);
      color: #fff;
      border-radius: 24px;
      padding: 40px;
      display: flex; flex-direction: column; justify-content: center; gap: 16px;
      position: relative; overflow: hidden;
    }
    .auth-hero::after {
      content: ''; position: absolute; inset: auto -40px -80px auto;
      width: 360px; height: 360px;
      background: radial-gradient(closest-side, rgba(108,92,231,0.45), transparent 70%);
      pointer-events: none;
    }
    .hero-mark { font-size: 40px; margin-bottom: 8px; }
    .auth-hero h1 { font-size: 36px; letter-spacing: -0.02em; }
    .auth-hero p { color: #b9bee0; max-width: 360px; }
    .bullets { list-style: none; padding: 0; margin: 16px 0 0; display: flex; flex-direction: column; gap: 10px; }
    .bullets li { display: flex; align-items: center; gap: 8px; color: #e2e4f4; font-size: 14px; }
    .bullets mat-icon { color: var(--accent); }

    .auth-card {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 40px;
      box-shadow: var(--shadow-md);
      display: flex; flex-direction: column; gap: 14px;
    }
    .auth-title { font-size: 26px; font-weight: 700; }
    .form { display: flex; flex-direction: column; gap: 8px; }
    .small { font-size: 13px; }

    .hint {
      margin-top: 8px;
      padding: 12px 14px;
      background: #f4f6ff;
      border-radius: 12px;
      font-size: 12px;
      color: #4f566b;
    }
    .hint strong { display: block; color: var(--ink-900); margin-bottom: 6px; }

    @media (max-width: 860px) {
      .auth-shell { grid-template-columns: 1fr; }
      .auth-hero { padding: 28px; }
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  show = false;
  loading = false;
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (res) => {
        this.loading = false;
        this.toast.success(`Welcome back, ${res.user.fullName.split(' ')[0]}!`);
        this.router.navigate(['/dashboard']);
      },
      error: () => { this.loading = false; }
    });
  }
}
