import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { formatDateShort, formatDayShort } from '../../core/dates';
import { formatXof, formatXofCompact } from '../../core/money';
import type { SeriesPoint } from '../../core/metrics';
import { Icon } from './icon';

const WIDTH = 760;
const HEIGHT = 280;
const MARGIN = { top: 18, right: 14, bottom: 30, left: 58 };

@Component({
  selector: 'app-sales-chart',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="chart">
      <figcaption class="chart__header">
        <div>
          <h3>{{ title() }}</h3>
          <p>{{ summary() }}</p>
        </div>
        <div class="chart__legend">
          <span><i class="legend-line legend-line--revenue"></i> Ventes</span>
          <span><i class="legend-line legend-line--cash"></i> Encaissements</span>
        </div>
      </figcaption>

      <div class="chart__plot" (mouseleave)="hoverIndex.set(null)">
        <svg
          [attr.viewBox]="'0 0 ' + width + ' ' + height"
          preserveAspectRatio="none"
          role="img"
          [attr.aria-label]="summary()"
        >
          <defs>
            <linearGradient id="kora-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#16794b" stop-opacity="0.18" />
              <stop offset="100%" stop-color="#16794b" stop-opacity="0" />
            </linearGradient>
          </defs>

          @for (tick of yTicks(); track tick.value) {
            <line
              [attr.x1]="margins.left"
              [attr.x2]="width - margins.right"
              [attr.y1]="tick.y"
              [attr.y2]="tick.y"
              stroke="#eef0ea"
              stroke-width="1"
            />
            <text
              [attr.x]="margins.left - 10"
              [attr.y]="tick.y + 3.5"
              text-anchor="end"
              fill="#9aa39d"
              font-size="10.5"
              font-family="Instrument Sans, sans-serif"
            >
              {{ tick.label }}
            </text>
          }

          @if (hasData()) {
            <path [attr.d]="areaPath()" fill="url(#kora-area)" />
            <path
              [attr.d]="revenuePath()"
              fill="none"
              stroke="#133d32"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              [attr.d]="cashPath()"
              fill="none"
              stroke="#e9b96e"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-dasharray="5 5"
            />
          }

          @if (hoverPoint(); as point) {
            <line
              [attr.x1]="point.x"
              [attr.x2]="point.x"
              [attr.y1]="margins.top"
              [attr.y2]="height - margins.bottom"
              stroke="#cbd2cc"
              stroke-width="1"
              stroke-dasharray="3 3"
            />
            <circle [attr.cx]="point.x" [attr.cy]="point.revenueY" r="4" fill="#133d32" stroke="#fff" stroke-width="2" />
            <circle [attr.cx]="point.x" [attr.cy]="point.cashY" r="3.5" fill="#e9b96e" stroke="#fff" stroke-width="2" />
          }

          @for (point of points(); track point.date; let index = $index) {
            <rect
              [attr.x]="point.x - bandWidth() / 2"
              [attr.y]="margins.top"
              [attr.width]="bandWidth()"
              [attr.height]="height - margins.top - margins.bottom"
              fill="transparent"
              (mouseenter)="hoverIndex.set(index)"
            />
          }

          @for (label of xLabels(); track label.index) {
            <text
              [attr.x]="label.x"
              [attr.y]="height - 8"
              [attr.text-anchor]="label.anchor"
              fill="#9aa39d"
              font-size="10.5"
              font-family="Instrument Sans, sans-serif"
            >
              {{ label.label }}
            </text>
          }
        </svg>

        @if (hoverPoint(); as point) {
          <div
            class="chart__tooltip"
            [style.left.%]="point.leftPercent"
            [style.transform]="point.leftPercent > 62 ? 'translateX(-100%)' : 'translateX(-6px)'"
          >
            <strong>{{ formatDateShort(point.date) }}</strong>
            <span><i class="dot dot--revenue"></i> Ventes <b>{{ formatXof(point.revenue) }}</b></span>
            <span><i class="dot dot--cash"></i> Encaissé <b>{{ formatXof(point.cashIn) }}</b></span>
          </div>
        }

        @if (!hasData()) {
          <div class="chart__empty">
            <app-icon name="calendar" [size]="22" />
            <p>Aucune vente sur cette période.</p>
          </div>
        }
      </div>

      <details class="chart__details">
        <summary>Voir les données du graphique</summary>
        <div class="chart__table-wrap">
          <table>
            <caption class="sr-only">Ventes et encaissements par jour</caption>
            <thead>
              <tr>
                <th scope="col">Jour</th>
                <th scope="col">Ventes</th>
                <th scope="col">Encaissements</th>
              </tr>
            </thead>
            <tbody>
              @for (point of series(); track point.date) {
                <tr>
                  <td>{{ formatDateShort(point.date) }}</td>
                  <td>{{ formatXof(point.revenue) }}</td>
                  <td>{{ formatXof(point.cashIn) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .chart {
        margin: 0;
      }

      .chart__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
      }

      .chart__header h3 {
        font-size: 1rem;
        font-weight: 700;
        color: #202724;
      }

      .chart__header p {
        margin-top: 0.2rem;
        font-size: 0.75rem;
        color: #68716c;
        max-width: 34rem;
        line-height: 1.5;
      }

      .chart__legend {
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 0.72rem;
        color: #68716c;
        padding-top: 0.15rem;
      }

      .chart__legend span {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }

      .legend-line {
        display: inline-block;
        width: 18px;
        height: 0;
        border-top: 2.4px solid #133d32;
        border-radius: 2px;
      }

      .legend-line--cash {
        border-top: 2px dashed #e9b96e;
      }

      .chart__plot {
        position: relative;
        width: 100%;
        height: clamp(190px, 26vw, 280px);
      }

      svg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }

      .chart__tooltip {
        position: absolute;
        top: 0;
        z-index: 4;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 10.5rem;
        padding: 0.55rem 0.7rem;
        background: #ffffff;
        border: 1px solid #e3e7e2;
        border-radius: 10px;
        box-shadow: 0 12px 28px -18px rgba(19, 61, 50, 0.4);
        font-size: 0.7rem;
        color: #68716c;
        pointer-events: none;
      }

      .chart__tooltip strong {
        color: #202724;
        font-size: 0.75rem;
        margin-bottom: 0.15rem;
      }

      .chart__tooltip span {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .chart__tooltip b {
        margin-left: auto;
        color: #202724;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
      }

      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        display: inline-block;
      }

      .dot--revenue {
        background: #133d32;
      }

      .dot--cash {
        background: #e9b96e;
      }

      .chart__empty {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        color: #68716c;
        background: rgba(255, 255, 255, 0.55);
        font-size: 0.8rem;
      }

      .chart__details {
        margin-top: 0.5rem;
        border-top: 1px solid #eef0ea;
        padding-top: 0.5rem;
      }

      .chart__details summary {
        font-size: 0.75rem;
        font-weight: 600;
        color: #16794b;
        cursor: pointer;
        width: fit-content;
      }

      .chart__table-wrap {
        max-height: 240px;
        overflow: auto;
        margin-top: 0.5rem;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.75rem;
      }

      th,
      td {
        text-align: left;
        padding: 0.35rem 0.5rem;
        border-bottom: 1px solid #eef0ea;
        font-variant-numeric: tabular-nums;
      }

      th {
        position: sticky;
        top: 0;
        background: #fff;
        color: #68716c;
        font-weight: 600;
        font-size: 0.68rem;
      }

      @media (max-width: 640px) {
        .chart__plot {
          height: 190px;
        }

        .chart__legend {
          gap: 0.75rem;
        }
      }
    `,
  ],
})
export class SalesChart {
  readonly series = input.required<SeriesPoint[]>();
  readonly title = input('Ventes et encaissements');

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly margins = MARGIN;
  protected readonly hoverIndex = signal<number | null>(null);

  constructor() {
    effect(() => {
      this.series();
      this.hoverIndex.set(null);
    });
  }
  protected readonly formatDateShort = formatDateShort;
  protected readonly formatXof = formatXof;

  protected readonly totalRevenue = computed(() =>
    this.series().reduce((total, point) => total + point.revenue, 0),
  );
  protected readonly totalCash = computed(() =>
    this.series().reduce((total, point) => total + point.cashIn, 0),
  );
  protected readonly hasData = computed(() =>
    this.series().some((point) => point.revenue > 0 || point.cashIn > 0),
  );

  protected readonly maxValue = computed(() => {
    const max = Math.max(0, ...this.series().flatMap((point) => [point.revenue, point.cashIn]));
    return niceMax(max);
  });

  protected readonly yTicks = computed(() => {
    const max = this.maxValue();
    return [0, 1, 2, 3, 4].map((index) => {
      const value = (max / 4) * index;
      return {
        value,
        y: MARGIN.top + (1 - value / max) * (HEIGHT - MARGIN.top - MARGIN.bottom),
        label: formatXofCompact(value),
      };
    });
  });

  protected readonly points = computed(() => {
    const series = this.series();
    const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const max = this.maxValue();
    const count = series.length;
    return series.map((point, index) => {
      const x = count <= 1 ? MARGIN.left + plotWidth / 2 : MARGIN.left + (index / (count - 1)) * plotWidth;
      return {
        ...point,
        x,
        revenueY: MARGIN.top + (1 - point.revenue / max) * plotHeight,
        cashY: MARGIN.top + (1 - point.cashIn / max) * plotHeight,
        leftPercent: (x / WIDTH) * 100,
      };
    });
  });

  protected readonly bandWidth = computed(() => {
    const count = this.series().length;
    if (count <= 1) return WIDTH - MARGIN.left - MARGIN.right;
    return (WIDTH - MARGIN.left - MARGIN.right) / (count - 1);
  });

  protected readonly revenuePath = computed(() => pathFor(this.points().map((point) => [point.x, point.revenueY])));
  protected readonly cashPath = computed(() => pathFor(this.points().map((point) => [point.x, point.cashY])));

  protected readonly areaPath = computed(() => {
    const points = this.points();
    if (!points.length) return '';
    const line = pathFor(points.map((point) => [point.x, point.revenueY]));
    const bottom = HEIGHT - MARGIN.bottom;
    return `${line} L${points.at(-1)!.x.toFixed(1)},${bottom} L${points[0].x.toFixed(1)},${bottom} Z`;
  });

  protected readonly xLabels = computed(() => {
    const points = this.points();
    if (!points.length) return [];
    const indices = new Set<number>([0, points.length - 1]);
    if (points.length > 4) {
      indices.add(Math.round((points.length - 1) * 0.33));
      indices.add(Math.round((points.length - 1) * 0.66));
    }
    return Array.from(indices)
      .sort((a, b) => a - b)
      .map((index) => ({
        index,
        x: points[index].x,
        label: formatDayShort(points[index].date),
        anchor: index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle',
      }));
  });

  protected readonly hoverPoint = computed(() => {
    const index = this.hoverIndex();
    if (index === null) return null;
    return this.points()[index] ?? null;
  });

  protected readonly summary = computed(() => {
    const days = this.series().length;
    return `Sur ${days} jour${days > 1 ? 's' : ''}, ${formatXof(this.totalRevenue())} de ventes et ${formatXof(
      this.totalCash(),
    )} encaissés. Graphique détaillé disponible dans le tableau ci-dessous.`;
  });
}

function pathFor(points: [number, number][]): string {
  if (!points.length) return '';
  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
}

function niceMax(value: number): number {
  if (value <= 0) return 10_000;
  const rough = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude;
  return Math.ceil(value / step) * step;
}
