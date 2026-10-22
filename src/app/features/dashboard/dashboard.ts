import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatDateShort, formatTime, greeting } from '../../core/dates';
import { formatXof, percent } from '../../core/money';
import { computeMetrics } from '../../core/metrics';
import { StoreService } from '../../core/store';
import { PERIOD_OPTIONS, type PeriodKey } from '../../core/period';
import type { PaymentMethod, Product, Sale } from '../../core/models';
import { Icon, type IconName } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { SalesChart } from '../../shared/ui/sales-chart';
import { StatCard } from '../../shared/ui/stat-card';
import { StatusBadge } from '../../shared/ui/status-badge';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Icon, PageHeader, SalesChart, StatCard, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private readonly store = inject(StoreService);

  protected readonly shop = this.store.shop;
  protected readonly period = signal<PeriodKey>('30d');
  protected readonly periodOptions = PERIOD_OPTIONS;
  protected readonly metrics = computed(() => computeMetrics(this.store.data(), this.period()));
  protected readonly recentSales = computed(() => this.store.sales().slice(0, 5));
  protected readonly lowStockPreview = computed(() => this.metrics().lowStock.slice(0, 4));
  protected readonly ownerFirstName = computed(() => this.shop().owner.split(' ')[0] ?? 'Awa');
  protected readonly dayGreeting = greeting();
  protected readonly formatXof = formatXof;
  protected readonly formatDateShort = formatDateShort;
  protected readonly formatTime = formatTime;
  protected readonly percent = percent;

  protected readonly revenueSpark = computed(() => this.metrics().series.map((point) => point.revenue));
  protected readonly cashSpark = computed(() => this.metrics().series.map((point) => point.cashIn));

  protected readonly periodSubtitle = computed(() => {
    const metrics = this.metrics();
    return `Du ${formatDateShort(metrics.range.start)} au ${formatDateShort(metrics.range.end)} · ${this.shop().name}`;
  });

  protected readonly showDelta = computed(() => this.period() !== 'all');

  protected readonly paymentIcon = (method: PaymentMethod): IconName => {
    switch (method) {
      case 'cash':
        return 'banknote';
      case 'mobile_money':
        return 'mobile';
      default:
        return 'card';
    }
  };

  protected readonly paymentTone = (method: PaymentMethod): string => {
    switch (method) {
      case 'cash':
        return 'bar--forest';
      case 'mobile_money':
        return 'bar--amber';
      default:
        return 'bar--mint';
    }
  };

  protected readonly today = computed(() => this.metrics().today);
  protected readonly todayLabel = formatDateShort(new Date());

  protected changePeriod(key: PeriodKey): void {
    this.period.set(key);
  }

  protected stockPercent(product: Product): number {
    const max = Math.max(1, product.lowStockThreshold * 2);
    return Math.min(100, Math.round((product.stockQuantity / max) * 100));
  }

  protected saleCustomer(sale: Sale): string {
    return sale.customerName ?? 'Client comptoir';
  }

  protected printReport(): void {
    window.print();
  }
}
