import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NavBarComponent } from './shared/components/nav-bar.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatSnackBarModule, NavBarComponent],
  template: `
    <app-nav-bar></app-nav-bar>
    <main data-testid="app-main">
      <router-outlet></router-outlet>
    </main>
  `
})
export class AppComponent {
  // Make sure auth state hydrates from session storage at boot.
  private auth = inject(AuthService);
  constructor() {
    this.auth.bootstrap();
  }
}
