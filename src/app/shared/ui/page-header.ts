import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Breadcrumb } from '../libraryui/breadcrumb';
import { Icon, type IconName } from './icon';

@Component({
  selector: 'app-page-header',
  imports: [Breadcrumb, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div class="page-header__crumbs">
        <app-breadcrumb [items]="crumbs()" />
      </div>
      <div class="page-header__row">
        <div class="page-header__copy">
          <p class="kora-eyebrow">{{ eyebrow() }}</p>
          <h1>{{ title() }}</h1>
          @if (subtitle()) {
            <p class="page-header__subtitle">{{ subtitle() }}</p>
          }
        </div>
        <div class="page-header__actions">
          <ng-content select="[page-actions]" />
        </div>
      </div>
      @if (meta()) {
        <p class="page-header__meta">
          <app-icon name="clock" [size]="13" />
          {{ meta() }}
        </p>
      }
    </header>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 1.5rem;
      }

      .page-header__crumbs {
        margin-left: -0.25rem;
        margin-bottom: 0.1rem;
      }

      .page-header__row {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .page-header__copy {
        min-width: 0;
      }

      .page-header h1 {
        font-size: clamp(1.5rem, 3vw, 2rem);
        font-weight: 700;
        color: var(--kora-forest, #133d32);
      }

      .page-header__subtitle {
        margin-top: 0.35rem;
        font-size: 0.9375rem;
        color: #68716c;
        max-width: 46rem;
        line-height: 1.5;
      }

      .page-header__actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .page-header__meta {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: #68716c;
      }

      @media (max-width: 640px) {
        .page-header__row {
          align-items: flex-start;
          flex-direction: column;
        }

        .page-header__actions {
          width: 100%;
        }

        .page-header__actions ::ng-deep .kora-btn {
          flex: 1;
        }
      }
    `,
  ],
})
export class PageHeader {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly meta = input('');
  readonly crumbs = input<{ label: string; path?: string }[]>([]);
}
