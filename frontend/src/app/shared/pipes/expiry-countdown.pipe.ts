import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'expiryCountdown', standalone: true, pure: false })
export class ExpiryCountdownPipe implements PipeTransform {
  transform(endAt: string | Date | null | undefined): string {
    if (!endAt) return '—';
    const end = new Date(endAt).getTime();
    const now = Date.now();
    if (Number.isNaN(end)) return '—';
    if (end <= now) return 'Closed';
    const ms = end - now;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    if (days > 0) return `Expires in ${days}d ${hours}h`;
    if (hours > 0) return `Expires in ${hours}h`;
    const mins = Math.floor((ms / (1000 * 60)) % 60);
    return `Expires in ${mins}m`;
  }
}
