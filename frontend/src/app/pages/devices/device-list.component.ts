import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Device } from '../../core/models';
import { FeatureTagBadgeComponent } from '../../shared/components/feature-tag-badge.component';

@Component({
  selector: 'app-device-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    FeatureTagBadgeComponent
  ],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Devices</h1>
          <div class="page-subtitle">Smartwatch device catalogue managed by admins.</div>
        </div>
        <a mat-flat-button color="primary" routerLink="/admin/devices/new" data-testid="device-create">
          <mat-icon>add</mat-icon> Add device
        </a>
      </div>

      <div class="surface">
        <ng-container *ngIf="loading; else loaded">
          <div class="spinner-wrap"><mat-spinner diameter="32"></mat-spinner></div>
        </ng-container>
        <ng-template #loaded>
          <ng-container *ngIf="devices.length; else empty">
            <table class="simple" data-testid="device-table">
              <thead><tr><th>Name</th><th>Manufacturer</th><th>Capabilities</th><th></th></tr></thead>
              <tbody>
                <tr *ngFor="let d of devices" data-testid="device-row">
                  <td><strong>{{ d.name }}</strong></td>
                  <td>{{ d.manufacturer }}</td>
                  <td>
                    <app-feature-tag-badge *ngFor="let t of d.featureTags" [label]="t"></app-feature-tag-badge>
                  </td>
                  <td class="r">
                    <a mat-button color="primary" [routerLink]="['/admin/devices', d.id, 'edit']" data-testid="device-edit">Edit</a>
                    <button mat-button color="warn" (click)="remove(d)" data-testid="device-delete">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </ng-container>
          <ng-template #empty><div class="empty" data-testid="device-empty">No devices registered yet.</div></ng-template>
        </ng-template>
      </div>
    </section>
  `,
  styles: [`.r { text-align: right; }`]
})
export class DeviceListComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  loading = true;
  devices: Device[] = [];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.api.listDevices({ size: 100 }).subscribe({
      next: (p) => { this.devices = p.content; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  remove(d: Device): void {
    if (!confirm(`Delete device "${d.name}"?`)) return;
    this.api.deleteDevice(d.id).subscribe(() => {
      this.toast.success('Device deleted');
      this.load();
    });
  }
}
