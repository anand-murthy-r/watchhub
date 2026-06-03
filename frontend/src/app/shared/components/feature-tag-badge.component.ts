import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-feature-tag-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge tag" [class.muted]="muted" data-testid="feature-tag-badge">{{ label }}</span>
  `,
  styles: [`
    :host { display: inline-block; margin: 2px 4px 2px 0; }
  `]
})
export class FeatureTagBadgeComponent {
  @Input({ required: true }) label!: string;
  @Input() muted = false;
}
