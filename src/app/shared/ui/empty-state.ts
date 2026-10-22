import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon, type IconName } from './icon';

@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <span class="empty__icon" aria-hidden="true">
        <app-icon [name]="icon()" [size]="26" />
      </span>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      @if (actionLabel()) {
        <button type="button" class="kora-btn kora-btn--outline kora-btn--sm" (click)="action.emit()">
          <app-icon name="plus" [size]="15" />
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.5rem;
        padding: 2.5rem 1.25rem;
      }

      .empty__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 52px;
        height: 52px;
        border-radius: 16px;
        background: #f1f5ef;
        color: #16794b;
        margin-bottom: 0.25rem;
      }

      h3 {
        font-size: 1rem;
        font-weight: 700;
      }

      p {
        max-width: 26rem;
        font-size: 0.875rem;
        line-height: 1.55;
        color: #68716c;
      }

      .kora-btn {
        margin-top: 0.5rem;
      }
    `,
  ],
})
export class EmptyState {
  readonly icon = input<IconName>('box');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly actionLabel = input('');
  readonly action = output<void>();
}
