import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SALE_STATUS_LABELS, type SaleStatus } from '../../core/models';
import { Icon, type IconName } from './icon';

@Component({
  selector: 'app-status-badge',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="'kora-badge kora-badge--' + status()">
      <app-icon [name]="icon()" [size]="12" [strokeWidth]="2.2" />
      {{ label() }}
    </span>
  `,
  styles: [
    `
      .kora-badge {
        text-transform: none;
      }
    `,
  ],
})
export class StatusBadge {
  readonly status = input.required<SaleStatus>();

  protected readonly label = computed(() => SALE_STATUS_LABELS[this.status()]);
  protected readonly icon = computed<IconName>(() => {
    switch (this.status()) {
      case 'paid':
        return 'check';
      case 'partial':
        return 'clock';
      case 'credit':
        return 'alert-circle';
      case 'cancelled':
        return 'x';
    }
  });
}
