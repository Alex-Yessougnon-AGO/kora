import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BusinessError, createId } from '../../core/business';
import { formatDateShort, formatTime } from '../../core/dates';
import { formatXof, marginPercent, parseXof } from '../../core/money';
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type Product,
  type Sale,
} from '../../core/models';
import { StoreService } from '../../core/store';
import { Dialog } from '../../shared/ui/dialog';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon, type IconName } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { StatusBadge } from '../../shared/ui/status-badge';
import { ToastService } from '../../shared/ui/toast';

interface CartLine {
  productId: string;
  quantity: number;
}

@Component({
  selector: 'app-sale',
  imports: [PageHeader, Icon, Dialog, EmptyState, StatusBadge, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sale.html',
  styleUrl: './sale.scss',
})
export class SalePage {
  private readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly customerInput = viewChild<ElementRef<HTMLInputElement>>('customerInput');

  protected readonly products = this.store.products;
  protected readonly search = signal('');
  protected readonly category = signal('Toutes');
  protected readonly cart = signal<CartLine[]>([]);
  protected readonly customer = signal('');
  protected readonly method = signal<PaymentMethod>('cash');
  protected readonly paidInput = signal<number | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal('');
  protected readonly customerError = signal('');
  protected readonly liveMessage = signal('');
  protected readonly successOpen = signal(false);
  protected readonly successSale = signal<Sale | null>(null);

  protected readonly formatXof = formatXof;
  protected readonly formatDateShort = formatDateShort;
  protected readonly formatTime = formatTime;
  protected readonly methodLabels = PAYMENT_METHOD_LABELS;
  protected readonly methods: { value: PaymentMethod; icon: IconName; label: string }[] = [
    { value: 'cash', icon: 'banknote', label: 'Espèces' },
    { value: 'mobile_money', icon: 'mobile', label: 'Mobile Money' },
    { value: 'other', icon: 'card', label: 'Autre' },
  ];

  private submissionKey = createId('checkout');
  private liveTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly categoryOptions = computed(() => {
    const categories = Array.from(
      new Set(this.products().map((product) => product.category).filter((value): value is string => !!value)),
    ).sort((a, b) => a.localeCompare(b, 'fr'));
    return ['Toutes', ...categories];
  });

  protected readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLowerCase();
    const category = this.category();
    return this.products().filter((product) => {
      if (category !== 'Toutes' && product.category !== category) return false;
      if (!query) return true;
      return [product.name, product.sku, product.category]
        .filter(Boolean)
        .some((value) => `${value}`.toLowerCase().includes(query));
    });
  });

  protected readonly cartDetails = computed(() =>
    this.cart()
      .map((line) => {
        const product = this.products().find((item) => item.id === line.productId);
        if (!product) return null;
        return {
          ...product,
          quantity: line.quantity,
          lineTotal: product.sellingPrice * line.quantity,
          maxed: line.quantity >= product.stockQuantity,
        };
      })
      .filter((line): line is Product & { quantity: number; lineTotal: number; maxed: boolean } => !!line),
  );

  protected readonly lineCount = computed(() =>
    this.cart().reduce((total, line) => total + line.quantity, 0),
  );

  protected readonly total = computed(() =>
    this.cartDetails().reduce((total, line) => total + line.lineTotal, 0),
  );

  protected readonly estimatedCost = computed(() =>
    this.cartDetails().reduce((total, line) => total + line.purchasePrice * line.quantity, 0),
  );

  protected readonly estimatedMargin = computed(() => this.total() - this.estimatedCost());

  protected readonly paid = computed(() => {
    const value = this.paidInput();
    return value === null ? this.total() : Math.max(0, Math.round(value));
  });

  protected readonly balance = computed(() => Math.max(0, this.total() - this.paid()));
  protected readonly exceedsTotal = computed(() => this.paid() > this.total());
  protected readonly halfAmount = computed(() => Math.max(0, Math.round(this.total() / 1000) * 500));

  protected readonly submitLabel = computed(() => {
    if (!this.cart().length) return 'Encaisser la vente';
    return this.balance() > 0 ? 'Enregistrer la vente' : `Encaisser ${formatXof(this.total())}`;
  });

  protected productQuantity(productId: string): number {
    return this.cart().find((line) => line.productId === productId)?.quantity ?? 0;
  }

  protected paymentSummary(sale: Sale): string {
    if (!sale.payments.length) return 'Aucun paiement immédiat';
    return Array.from(new Set(sale.payments.map((payment) => PAYMENT_METHOD_LABELS[payment.method]))).join(' + ');
  }

  protected stockLabel(product: Product): string {
    if (product.stockQuantity <= 0) return 'Rupture';
    if (product.stockQuantity <= product.lowStockThreshold) return `Plus que ${product.stockQuantity}`;
    return `${product.stockQuantity} en stock`;
  }

  protected stockTone(product: Product): string {
    if (product.stockQuantity <= 0) return 'out';
    if (product.stockQuantity <= product.lowStockThreshold) return 'low';
    return 'ok';
  }

  protected marginOf(product: Product): number {
    return marginPercent(product.sellingPrice, product.purchasePrice);
  }

  protected addProduct(product: Product): void {
    if (product.stockQuantity <= 0) return;
    const existing = this.cart().find((line) => line.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stockQuantity) {
        this.announce(`Stock maximum atteint pour ${product.name}.`);
        return;
      }
      this.cart.update((lines) =>
        lines.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        ),
      );
    } else {
      this.cart.update((lines) => [...lines, { productId: product.id, quantity: 1 }]);
    }
    this.formError.set('');
    this.announce(`${product.name} ajouté au panier.`);
  }

  protected increment(line: { id: string; quantity: number; stockQuantity: number }): void {
    if (line.quantity >= line.stockQuantity) {
      this.announce('Stock maximum atteint pour ce produit.');
      return;
    }
    this.cart.update((lines) =>
      lines.map((item) => (item.productId === line.id ? { ...item, quantity: item.quantity + 1 } : item)),
    );
  }

  protected decrement(productId: string): void {
    this.cart.update((lines) =>
      lines
        .map((line) =>
          line.productId === productId ? { ...line, quantity: line.quantity - 1 } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  protected removeLine(productId: string): void {
    this.cart.update((lines) => lines.filter((line) => line.productId !== productId));
  }

  protected clearCart(): void {
    this.cart.set([]);
    this.paidInput.set(null);
    this.formError.set('');
    this.customerError.set('');
    this.announce('Panier vidé.');
  }

  protected setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.search.set('');
    this.category.set('Toutes');
  }

  protected setMethod(method: PaymentMethod): void {
    this.method.set(method);
  }

  protected setPaid(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    if (raw.trim() === '') {
      this.paidInput.set(0);
      return;
    }
    this.paidInput.set(parseXof(raw));
    this.formError.set('');
  }

  protected setPaidPreset(preset: 'full' | 'half' | 'zero'): void {
    if (preset === 'zero') this.paidInput.set(0);
    else if (preset === 'half') this.paidInput.set(this.halfAmount());
    else this.paidInput.set(this.total());
    this.formError.set('');
  }

  protected setCustomer(event: Event): void {
    this.customer.set((event.target as HTMLInputElement).value);
    if (this.customerError()) this.customerError.set('');
  }

  protected submit(): void {
    if (this.submitting()) return;

    if (!this.cart().length) {
      this.formError.set('Ajoutez au moins un produit avant d’encaisser.');
      return;
    }
    if (this.exceedsTotal()) {
      this.formError.set('Le montant reçu ne peut pas dépasser le total de la vente.');
      return;
    }
    if (this.balance() > 0 && !this.customer().trim()) {
      this.customerError.set('Indiquez le nom du client pour une vente avec solde dû.');
      this.customerInput()?.nativeElement.focus();
      return;
    }

    this.submitting.set(true);
    this.formError.set('');
    try {
      const sale = this.store.recordSale(
        {
          lines: this.cart(),
          amountPaid: this.paid(),
          method: this.method(),
          customerName: this.customer(),
        },
        this.submissionKey,
      );
      this.successSale.set(sale);
      this.successOpen.set(true);
      this.toast.success(
        `Vente ${sale.reference} enregistrée · ${formatXof(sale.totalAmount)}`,
        'Vente enregistrée',
      );
      this.resetAfterSale();
    } catch (error) {
      if (error instanceof BusinessError) {
        this.formError.set(error.message);
        this.toast.error(error.message);
      } else {
        this.formError.set('Une erreur inattendue est survenue. La vente n’a pas été enregistrée.');
        this.toast.error('La vente n’a pas été enregistrée.');
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected closeSuccess(): void {
    this.successOpen.set(false);
  }

  protected viewSale(): void {
    const sale = this.successSale();
    this.successOpen.set(false);
    if (sale) {
      void this.router.navigate(['/transactions'], { queryParams: { sale: sale.id } });
    }
  }

  protected newSale(): void {
    this.successOpen.set(false);
  }

  private resetAfterSale(): void {
    this.cart.set([]);
    this.customer.set('');
    this.paidInput.set(null);
    this.method.set('cash');
    this.formError.set('');
    this.customerError.set('');
    this.submissionKey = createId('checkout');
  }

  private announce(message: string): void {
    this.liveMessage.set(message);
    if (this.liveTimer) clearTimeout(this.liveTimer);
    this.liveTimer = setTimeout(() => this.liveMessage.set(''), 1800);
  }
}
