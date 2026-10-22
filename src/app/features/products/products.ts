import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BusinessError, stockLevel, validateProductDraft } from '../../core/business';
import { formatDateShort, formatDateTime } from '../../core/dates';
import { formatXof, marginPercent, toXof } from '../../core/money';
import { PRODUCT_CATEGORIES, STOCK_MOVEMENT_LABELS, type Product, type ProductDraft, type ProductFormErrors, type StockMovement } from '../../core/models';
import { StoreService } from '../../core/store';
import { Dialog } from '../../shared/ui/dialog';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { ToastService } from '../../shared/ui/toast';

type StockFilter = 'all' | 'low' | 'out' | 'ok';

function emptyDraft(): ProductDraft {
  return {
    name: '',
    sku: '',
    category: '',
    purchasePrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    lowStockThreshold: 3,
    unit: 'pièce',
  };
}

@Component({
  selector: 'app-products',
  imports: [FormsModule, PageHeader, Icon, Dialog, EmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class ProductsPage {
  private readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);

  protected readonly products = this.store.products;
  protected readonly search = signal('');
  protected readonly category = signal('Toutes');
  protected readonly stockFilter = signal<StockFilter>('all');

  protected readonly productOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected draft: ProductDraft = emptyDraft();
  protected readonly errors = signal<ProductFormErrors>({});

  protected readonly restockOpen = signal(false);
  protected readonly restockTarget = signal<Product | null>(null);
  protected restockQuantity: number | null = null;
  protected restockNote = '';
  protected readonly restockError = signal('');

  protected readonly historyOpen = signal(false);
  protected readonly historyTarget = signal<Product | null>(null);
  protected readonly historyMovements = computed<StockMovement[]>(() => {
    const product = this.historyTarget();
    return product ? this.store.movementsFor(product.id) : [];
  });

  protected readonly formatXof = formatXof;
  protected readonly formatDateShort = formatDateShort;
  protected readonly formatDateTime = formatDateTime;
  protected readonly stockMovementLabels = STOCK_MOVEMENT_LABELS;
  protected readonly categorySuggestions = PRODUCT_CATEGORIES;

  protected readonly categoryOptions = computed(() => {
    const values = Array.from(
      new Set(this.products().map((product) => product.category).filter((value): value is string => !!value)),
    ).sort((a, b) => a.localeCompare(b, 'fr'));
    return ['Toutes', ...values];
  });

  protected readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLowerCase();
    const category = this.category();
    const stock = this.stockFilter();
    return this.products().filter((product) => {
      if (category !== 'Toutes' && product.category !== category) return false;
      if (stock === 'low' && stockLevel(product) !== 'low') return false;
      if (stock === 'out' && stockLevel(product) !== 'out') return false;
      if (stock === 'ok' && stockLevel(product) !== 'ok') return false;
      if (!query) return true;
      return [product.name, product.sku, product.category]
        .filter(Boolean)
        .some((value) => `${value}`.toLowerCase().includes(query));
    });
  });

  protected readonly stockValue = computed(() =>
    this.products().reduce((total, product) => total + product.purchasePrice * product.stockQuantity, 0),
  );

  protected readonly lowStockCount = computed(
    () => this.products().filter((product) => stockLevel(product) === 'low').length,
  );

  protected readonly outOfStockCount = computed(
    () => this.products().filter((product) => stockLevel(product) === 'out').length,
  );

  protected readonly totalUnits = computed(() =>
    this.products().reduce((total, product) => total + product.stockQuantity, 0),
  );

  protected readonly canCreate = computed(() => this.editingId() === null);

  protected setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected setStockFilter(value: StockFilter): void {
    this.stockFilter.set(value);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.category.set('Toutes');
    this.stockFilter.set('all');
  }

  protected openCreate(): void {
    this.editingId.set(null);
    this.draft = emptyDraft();
    this.errors.set({});
    this.productOpen.set(true);
  }

  protected openEdit(product: Product): void {
    this.editingId.set(product.id);
    this.draft = {
      id: product.id,
      name: product.name,
      sku: product.sku ?? '',
      category: product.category ?? '',
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      unit: product.unit ?? '',
    };
    this.errors.set({});
    this.productOpen.set(true);
  }

  protected saveProduct(): void {
    const errors = validateProductDraft(this.draft);
    this.errors.set(errors);
    if (Object.keys(errors).length) return;

    const normalized: ProductDraft = {
      ...this.draft,
      name: this.draft.name.trim(),
      purchasePrice: toXof(this.draft.purchasePrice),
      sellingPrice: toXof(this.draft.sellingPrice),
      stockQuantity: toXof(this.draft.stockQuantity),
      lowStockThreshold: toXof(this.draft.lowStockThreshold),
    };

    try {
      const saved = this.store.saveProduct(normalized);
      this.productOpen.set(false);
      this.toast.success(
        this.canCreate() ? `Le produit « ${saved.name} » a été créé.` : `Le produit « ${saved.name} » a été mis à jour.`,
      );
    } catch (error) {
      const message = error instanceof BusinessError ? error.message : 'Le produit n’a pas pu être enregistré.';
      this.toast.error(message);
    }
  }

  protected openRestock(product: Product): void {
    this.restockTarget.set(product);
    this.restockQuantity = null;
    this.restockNote = '';
    this.restockError.set('');
    this.restockOpen.set(true);
  }

  protected confirmRestock(): void {
    const product = this.restockTarget();
    const quantity = Math.round(this.restockQuantity ?? 0);
    if (!product) return;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      this.restockError.set('Saisissez une quantité entière supérieure à zéro.');
      return;
    }
    try {
      this.store.restock(product.id, quantity, this.restockNote);
      this.restockOpen.set(false);
      this.toast.success(`${quantity} ${product.unit ?? 'unité(s)'} ajoutée(s) au stock de « ${product.name} ».`);
    } catch (error) {
      this.restockError.set(error instanceof BusinessError ? error.message : 'Le stock n’a pas pu être mis à jour.');
    }
  }

  protected openHistory(product: Product): void {
    this.historyTarget.set(product);
    this.historyOpen.set(true);
  }

  protected stockTone(product: Product): string {
    const level = stockLevel(product);
    return level === 'out' ? 'out' : level === 'low' ? 'low' : 'ok';
  }

  protected stockText(product: Product): string {
    const level = stockLevel(product);
    if (level === 'out') return 'Rupture';
    if (level === 'low') return 'Stock faible';
    return 'Disponible';
  }

  protected margin(product: Product): number {
    return marginPercent(product.sellingPrice, product.purchasePrice);
  }

  protected stockBar(product: Product): number {
    const max = Math.max(1, product.lowStockThreshold * 3);
    return Math.min(100, Math.round((product.stockQuantity / max) * 100));
  }

  protected movementReference(movement: StockMovement): string {
    if (!movement.referenceId) return movement.reason ?? '—';
    const sale = this.store.saleById(movement.referenceId);
    return sale ? sale.reference : (movement.reason ?? '—');
  }

  protected movementSign(movement: StockMovement): string {
    return movement.quantityDelta > 0 ? `+${movement.quantityDelta}` : `${movement.quantityDelta}`;
  }
}
