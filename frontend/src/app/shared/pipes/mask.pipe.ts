import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'mask', standalone: true })
export class MaskPipe implements PipeTransform {
  transform(value: string | null | undefined, kind: 'phone' | 'email' = 'phone'): string {
    if (!value) return '';
    if (kind === 'email') {
      const [local, domain] = value.split('@');
      if (!domain) return value;
      const masked = local.length <= 2 ? local[0] + '*' : local[0] + '*'.repeat(Math.max(local.length - 2, 1)) + local.slice(-1);
      return `${masked}@${domain}`;
    }
    // phone: keep last 4 digits
    const digits = value.replace(/[^\d]/g, '');
    if (digits.length <= 4) return value;
    const hiddenCount = digits.length - 4;
    return value.slice(0, value.length - digits.length) + '*'.repeat(hiddenCount) + digits.slice(-4);
  }
}
