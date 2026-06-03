import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-rank-badge',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <span class="rank" [class.medal-1]="rank === 1" [class.medal-2]="rank === 2" [class.medal-3]="rank === 3" data-testid="rank-badge">
      <ng-container *ngIf="rank <= 3; else number">
        <mat-icon>emoji_events</mat-icon>
      </ng-container>
      <ng-template #number><span class="num">#{{ rank }}</span></ng-template>
    </span>
  `,
  styles: [`
    .rank { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
    .num { font-family: 'JetBrains Mono', monospace; }
    .medal-1 mat-icon { color: var(--gold); }
    .medal-2 mat-icon { color: var(--silver); }
    .medal-3 mat-icon { color: var(--bronze); }
  `]
})
export class RankBadgeComponent {
  @Input({ required: true }) rank!: number;
}
