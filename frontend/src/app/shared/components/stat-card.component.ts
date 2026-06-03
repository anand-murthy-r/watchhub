import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="stat" data-testid="stat-card">
      <div class="icon" [style.background]="iconBg">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      <div class="meta">
        <div class="label">{{ label }}</div>
        <div class="value">{{ value }}</div>
        <div class="hint" *ngIf="hint">{{ hint }}</div>
      </div>
    </div>
  `,
  styles: [`
    .stat {
      display: flex; gap: 16px; padding: 20px;
      background: var(--paper); border: 1px solid var(--line);
      border-radius: var(--radius-md); box-shadow: var(--shadow-sm);
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: #fff;
    }
    .label { font-size: 12px; color: #5a607f; text-transform: uppercase; letter-spacing: 0.08em; }
    .value { font-size: 28px; font-weight: 700; font-family: 'JetBrains Mono', monospace; margin-top: 2px; }
    .hint { font-size: 12px; color: #5a607f; margin-top: 2px; }
  `]
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() icon = 'insights';
  @Input() iconBg = 'linear-gradient(135deg, #6c5ce7, #00c2ff)';
  @Input() hint?: string;
}
