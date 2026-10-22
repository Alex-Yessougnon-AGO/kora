import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { formatDateTime, formatTime } from '../../core/dates';
import { formatXof, toXof } from '../../core/money';
import { computeMetrics } from '../../core/metrics';
import {
  PAYMENT_METHOD_LABELS,
  SALE_STATUS_LABELS,
  type PaymentMethod,
  type Sale,
} from '../../core/models';
import { getPeriodRange, isInRange, PERIOD_OPTIONS, type PeriodKey } from '../../core/period';
import { StoreService } from '../../core/store';
import { datedFilename, downloadTextFile } from '../../shared/download';
import {
  LuiDataTable,
  type DataTableActionEvent,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableRow,
} from '../../shared/libraryui/data-table';
import { Dialog } from '../../shared/ui/dialog';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { StatusBadge } from '../../shared/ui/status-badge';
import { ToastService } from '../../shared/ui/toast';

@Component({
  selector: 'app-transactions',
  imports: [FormsModule, PageHeader, LuiDataTable, Dialog, Icon, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
})
export class TransactionsPage {
  private readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly period = signal<PeriodKey>('30d');
  protected readonly periodOptions = PERIOD_OPTIONS;
  protected readonly metrics = computed(() => computeMetrics(this.store.data(), this.period()));
  protected readonly selectedId = signal<string | null>(null);
  protected readonly detailOpen = signal(false);
  protected readonly selectedSale = computed(() => {
    const id = this.selectedId();
    return id ? (this.store.sales().find((sale) => sale.id === id) ?? null) : null;
  });

  protected readonly paymentError = signal('');
  protected readonly paying = signal(false);
  protected readonly paymentAmount = signal<number | null>(null);
  protected readonly paymentMethod = signal<PaymentMethod>('cash');
  protected readonly paymentNote = signal('');

  protected readonly formatXof = formatXof;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatTime = formatTime;
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
  protected readonly statusLabels = SALE_STATUS_LABELS;
  protected readonly paymentMethods: { value: PaymentMethod; icon: 'banknote' | 'mobile' | 'card'; label: string }[] = [
    { value: 'cash', icon: 'banknote', label: 'Espèces' },
    { value: 'mobile_money', icon: 'mobile', label: 'Mobile Money' },
    { value: 'other', icon: 'card', label: 'Autre' },
  ];

  protected readonly columns: DataTableColumn[] = [
    { key: 'reference', label: 'Référence', sortable: true, width: '150px' },
    { key: 'dateIso', label: 'Date', type: 'date', sortable: true, width: '120px' },
    { key: 'customer', label: 'Client', sortable: true },
    { key: 'totalAmount', label: 'Total', type: 'currency', align: 'right', sortable: true },
    { key: 'amountPaid', label: 'Encaissé', type: 'currency', align: 'right', sortable: true },
    { key: 'balanceDue', label: 'Solde', type: 'currency', align: 'right', sortable: true },
    {
      key: 'statusLabel',
      label: 'Statut',
      type: 'badge',
      sortable: true,
      sortKey: 'statusOrder',
      badgeColors: {
        Payée: 'success',
        Partielle: 'warning',
        'À crédit': 'danger',
        Annulée: 'secondary',
      },
    },
    { key: 'actions', label: '', type: 'actions', actions: ['view'], width: '64px', align: 'center' },
  ];

  protected readonly filters: DataTableFilter[] = [
    {
      key: 'status',
      label: 'Statut',
      options: [
        { value: '', label: 'Tous les statuts' },
        { value: 'paid', label: 'Payées' },
        { value: 'partial', label: 'Partielles' },
        { value: 'credit', label: 'À crédit' },
        { value: 'cancelled', label: 'Annulées' },
      ],
    },
    {
      key: 'methodBucket',
      label: 'Paiement',
      options: [
        { value: '', label: 'Tous les paiements' },
        { value: 'cash', label: 'Espèces' },
        { value: 'mobile_money', label: 'Mobile Money' },
        { value: 'other', label: 'Autre' },
        { value: 'mixed', label: 'Paiements mixtes' },
        { value: 'none', label: 'Sans paiement' },
      ],
    },
  ];

  protected readonly rows = computed<DataTableRow[]>(() => {
    const range = getPeriodRange(this.period(), this.store.data());
    return this.store
      .sales()
      .filter((sale) => isInRange(sale.createdAt, range))
      .map((sale) => ({
        id: sale.id,
        reference: sale.reference,
        dateIso: sale.createdAt,
        customer: sale.customerName ?? 'Client comptoir',
        products: sale.lines.map((line) => line.productNameSnapshot).join(' '),
        totalAmount: sale.totalAmount,
        amountPaid: sale.amountPaid,
        balanceDue: sale.balanceDue,
        status: sale.status,
        statusLabel: SALE_STATUS_LABELS[sale.status],
        statusOrder: statusOrder(sale.status),
        methodBucket: this.methodBucket(sale),
      }));
  });

  protected readonly averageSale = computed(() => {
    const rows = this.rows();
    return rows.length ? Math.round(this.metrics().revenue / rows.length) : 0;
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('sale');
      if (id) this.openDetailById(id);
    });
  }

  protected changePeriod(key: PeriodKey): void {
    this.period.set(key);
  }

  protected handleAction(event: DataTableActionEvent): void {
    if (event.action === 'view') {
      this.openDetailById(event.row.id);
    }
  }

  protected openDetailById(saleId: string): void {
    const sale = this.store.saleById(saleId);
    if (!sale) {
      this.toast.error('Cette transaction est introuvable.');
      return;
    }
    this.selectedId.set(sale.id);
    this.paymentAmount.set(sale.balanceDue);
    this.paymentMethod.set('cash');
    this.paymentNote.set('');
    this.paymentError.set('');
    this.detailOpen.set(true);
  }

  protected closeDetail(): void {
    this.detailOpen.set(false);
    this.selectedId.set(null);
    if (this.route.snapshot.queryParamMap.has('sale')) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }
  }

  protected setPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod.set(method);
  }

  protected recordPayment(): void {
    const sale = this.selectedSale();
    if (!sale) return;
    const amount = toXof(this.paymentAmount() ?? 0);
    if (!Number.isFinite(this.paymentAmount()) || amount <= 0) {
      this.paymentError.set('Saisissez un montant supérieur à zéro.');
      return;
    }
    if (amount > sale.balanceDue) {
      this.paymentError.set(`Le montant dépasse le solde dû (${formatXof(sale.balanceDue)}).`);
      return;
    }

    this.paying.set(true);
    try {
      this.store.recordPayment(sale.id, amount, this.paymentMethod(), this.paymentNote());
      this.toast.success(`Paiement de ${formatXof(amount)} enregistré sur ${sale.reference}.`);
      const updated = this.store.saleById(sale.id);
      this.paymentAmount.set(updated?.balanceDue ?? 0);
      this.paymentNote.set('');
      this.paymentError.set('');
    } catch (error) {
      this.paymentError.set(
        error instanceof Error ? error.message : 'Le paiement n’a pas pu être enregistré.',
      );
    } finally {
      this.paying.set(false);
    }
  }

  protected setDefaultAmount(): void {
    const sale = this.selectedSale();
    if (sale) {
      this.paymentAmount.set(sale.balanceDue);
      this.paymentError.set('');
    }
  }

  protected methodBucket(sale: Sale): string {
    const methods = new Set(sale.payments.map((payment) => payment.method));
    if (methods.size === 0) return 'none';
    if (methods.size > 1) return 'mixed';
    return Array.from(methods)[0];
  }

  protected paymentSummary(sale: Sale): string {
    const methods = Array.from(new Set(sale.payments.map((payment) => PAYMENT_METHOD_LABELS[payment.method])));
    return methods.length ? methods.join(' + ') : 'Aucun paiement';
  }

  protected exportCsv(): void {
    downloadTextFile(datedFilename('kora-ventes'), this.store.salesCsv());
    this.toast.info('Export CSV des ventes généré.', 'Export prêt');
  }
}

function statusOrder(status: Sale['status']): number {
  switch (status) {
    case 'paid':
      return 0;
    case 'partial':
      return 1;
    case 'credit':
      return 2;
    case 'cancelled':
      return 3;
  }
}
