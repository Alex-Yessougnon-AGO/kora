import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon, type IconName } from './icon';

@Component({
  selector: 'app-stat-card',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="stat" [class.stat--tinted]="tone() === 'mint'" [class.stat--amber]="tone() === 'amber'">
      <div class="stat__top">
        <p class="stat__label">{{ label() }}</p>
        <span class="stat__icon" aria-hidden="true">
          <app-icon [name]="icon()" [size]="17" />
        </span>
      </div>
      <p class="stat__value kora-num">{{ value() }}</p>
      <div class="stat__bottom">
        @switch (deltaKind()) {
          @case ('up') {
            <span class="stat__delta" [class.stat__delta--invert]="invertDelta()">
              <app-icon name="arrow-up" [size]="12" />
              {{ deltaText() }}
            </span>
          }
          @case ('down') {
            <span class="stat__delta stat__delta--down" [class.stat__delta--invert]="invertDelta()">
              <app-icon name="arrow-down" [size]="12" />
              {{ deltaText() }}
            </span>
          }
          @case ('new') {
            <span class="stat__delta stat__delta--new">Nouveau</span>
          }
        }
        <span class="stat__hint">{{ hint() }}</span>
      </div>
      @if (spark().length > 1) {
        <svg class="stat__spark" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true">
          <path [attr.d]="areaPath()" fill="rgba(22, 121, 75, 0.08)" />
          <path
            [attr.d]="linePath()"
            fill="none"
            stroke="#16794b"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      }
    </article>
  `,
  styles: [
    `
      .stat {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
        padding: 1.1rem 1.15rem 1rem;
        background: #ffffff;
        border: 1px solid #e3e7e2;
        border-radius: 18px;
        box-shadow: 0 1px 2px rgba(19, 61, 50, 0.04);
        overflow: hidden;
        min-height: 132px;
      }

      .stat--tinted {
        background: linear-gradient(160deg, #eef7f0 0%, #ffffff 62%);
      }

      .stat--amber {
        background: linear-gradient(160deg, #fdf6e8 0%, #ffffff 62%);
      }

      .stat__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
      }

      .stat__label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #68716c;
        letter-spacing: 0.01em;
      }

      .stat__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 9px;
        background: #f1f5ef;
        color: #16794b;
      }

      .stat--amber .stat__icon {
        background: #fbf1df;
        color: #8c601f;
      }

      .stat__value {
        font-size: clamp(1.35rem, 2.4vw, 1.65rem);
        font-weight: 700;
        line-height: 1.1;
        color: #133d32;
        white-space: nowrap;
      }

      .stat__bottom {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        flex-wrap: wrap;
        margin-top: auto;
      }

      .stat__delta {
        display: inline-flex;
        align-items: center;
        gap: 0.15rem;
        padding: 0.15rem 0.4rem;
        border-radius: 6px;
        background: #e5f3e8;
        color: #12603c;
        font-size: 0.6875rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .stat__delta--down {
        background: #fbedE9;
        color: #9c3a25;
      }

      .stat__delta--invert.stat__delta--up {
        background: #fbedE9;
        color: #9c3a25;
      }

      .stat__delta--invert.stat__delta--down {
        background: #e5f3e8;
        color: #12603c;
      }

      .stat__delta--new {
        background: #f0f1eb;
        color: #68716c;
      }

      .stat__hint {
        font-size: 0.6875rem;
        color: #68716c;
        line-height: 1.35;
      }

      .stat__spark {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 46%;
        height: 34px;
        opacity: 0.9;
        pointer-events: none;
      }

      @media (max-width: 640px) {
        .stat {
          min-height: 118px;
          padding: 0.9rem 0.95rem;
        }

        .stat__value {
          font-size: 1.3rem;
        }
      }
    `,
  ],
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input('');
  readonly delta = input<number | null | undefined>(undefined);
  readonly invertDelta = input(false);
  readonly tone = input<'default' | 'mint' | 'amber'>('default');
  readonly icon = input<IconName>('sparkle');
  readonly spark = input<number[]>([]);

  protected readonly deltaKind = computed<'hidden' | 'new' | 'up' | 'down'>(() => {
    const delta = this.delta();
    if (delta === undefined) return 'hidden';
    if (delta === null) return 'new';
    return delta >= 0 ? 'up' : 'down';
  });

  protected readonly deltaText = computed(() => {
    const delta = this.delta();
    if (delta === null || delta === undefined) return '';
    if (delta === 0) return 'stable';
    return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} %`;
  });

  private readonly points = computed(() => {
    const values = this.spark();
    if (values.length < 2) return [];
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    const step = 120 / (values.length - 1);
    return values.map((value, index) => ({
      x: index * step,
      y: 32 - ((value - min) / span) * 28,
    }));
  });

  protected readonly linePath = computed(() => {
    const points = this.points();
    if (!points.length) return '';
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  });

  protected readonly areaPath = computed(() => {
    const points = this.points();
    if (!points.length) return '';
    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
    return `${line} L120,34 L0,34 Z`;
  });
}
