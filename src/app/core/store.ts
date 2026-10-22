import { Injectable, computed, inject, signal } from '@angular/core';
import {
  BusinessError,
  applyDeleteExpense,
  applyExpense,
  applyPayment,
  applyProduct,
  applyRestock,
  applySale,
  applyShop,
} from './business';
import { formatDateTime } from './dates';
import { buildFixtures } from './fixtures';
import { totalOutstanding } from './metrics';
import { PAYMENT_METHOD_LABELS, SALE_STATUS_LABELS } from './models';
import type {
  ExpenseDraft,
  KoraData,
  PaymentMethod,
  Product,
  ProductDraft,
  Sale,
  SaleDraft,
  ShopSettings,
  StockMovement,
} from './models';
import { KORA_REPOSITORY, type KoraRepository } from './persistence';

export interface StorageNotice {
  tone: 'info' | 'warning' | 'error';
  message: string;
}

/**
 * Source de vérité unique de Kora.
 * Toute mutation construit un nouvel état, le persiste, puis publie le signal.
 * En cas d'échec d'écriture, l'état en mémoire reste inchangé.
 */
@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly repository = inject(KORA_REPOSITORY);

  private readonly state = signal<KoraData>(buildFixtures());
  private readonly completedSubmissions = new Set<string>();

  readonly data = this.state.asReadonly();
  readonly notice = signal<StorageNotice | null>(null);
  readonly lastSavedAt = signal<Date | null>(null);

  readonly products = computed(() =>
    [...this.state().products].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  );
  readonly sales = computed(() =>
    [...this.state().sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  readonly expenses = computed(() =>
    [...this.state().expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  readonly movements = computed(() =>
    [...this.state().movements].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  readonly outstanding = computed(() => totalOutstanding(this.state()));
  readonly shop = computed(() => this.state().shop);

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const result = this.repository.load();
    if (result.status === 'ok') {
      this.state.set(result.data);
      return;
    }

    const demo = buildFixtures();
    this.state.set(demo);

    if (result.status === 'empty') {
      this.persistSeed(demo);
      return;
    }

    this.notice.set({ tone: 'warning', message: result.message });
    this.persistSeed(demo);
  }

  private persistSeed(data: KoraData): void {
    const saved = this.repository.save(data);
    if (saved.ok) {
      this.lastSavedAt.set(new Date());
    } else {
      this.notice.set({ tone: 'error', message: saved.message });
    }
  }

  private commit(next: KoraData): void {
    const saved = this.repository.save(next);
    if (!saved.ok) {
      this.notice.set({ tone: 'error', message: saved.message });
      throw new BusinessError('STORAGE_FAILED', saved.message);
    }
    this.state.set(next);
    this.lastSavedAt.set(new Date());
  }

  dismissNotice(): void {
    this.notice.set(null);
  }

  recordSale(draft: SaleDraft, submissionKey: string): Sale {
    if (this.completedSubmissions.has(submissionKey)) {
      throw new BusinessError(
        'DUPLICATE_SUBMISSION',
        'Cette vente a déjà été enregistrée. Actualisez le panier pour en créer une nouvelle.',
      );
    }

    const now = new Date();
    const next = applySale(this.state(), draft, { now });
    this.commit(next);
    this.completedSubmissions.add(submissionKey);
    const created = next.sales[0];
    if (!created) {
      throw new BusinessError('SALE_NOT_FOUND', 'La vente a été enregistrée mais reste introuvable.');
    }
    return created;
  }

  recordPayment(saleId: string, amount: number, method: PaymentMethod, note?: string): void {
    this.commit(applyPayment(this.state(), saleId, amount, method, new Date(), note));
  }

  addExpense(draft: ExpenseDraft): void {
    this.commit(applyExpense(this.state(), draft));
  }

  deleteExpense(expenseId: string): void {
    this.commit(applyDeleteExpense(this.state(), expenseId));
  }

  saveProduct(draft: ProductDraft): Product {
    const knownIds = new Set(this.state().products.map((product) => product.id));
    const next = applyProduct(this.state(), draft, new Date());
    this.commit(next);
    const saved = draft.id
      ? next.products.find((product) => product.id === draft.id)
      : next.products.find((product) => !knownIds.has(product.id));
    if (!saved) {
      throw new BusinessError('PRODUCT_NOT_FOUND', 'Produit introuvable après enregistrement.');
    }
    return saved;
  }

  restock(productId: string, quantity: number, reason?: string): void {
    this.commit(applyRestock(this.state(), productId, quantity, new Date(), reason));
  }

  updateShop(shop: ShopSettings): void {
    this.commit(applyShop(this.state(), shop));
  }

  resetDemo(): void {
    const demo = buildFixtures(new Date());
    const saved = this.repository.save(demo);
    this.state.set(demo);
    if (saved.ok) {
      this.lastSavedAt.set(new Date());
      this.notice.set({
        tone: 'info',
        message: 'Les données de démonstration ont été rechargées sur cet appareil.',
      });
    } else {
      this.notice.set({ tone: 'error', message: saved.message });
    }
  }

  productById(id: string): Product | undefined {
    return this.state().products.find((product) => product.id === id);
  }

  saleById(id: string): Sale | undefined {
    return this.state().sales.find((sale) => sale.id === id);
  }

  movementsFor(productId: string): StockMovement[] {
    return this.movements().filter((movement) => movement.productId === productId);
  }

  /** Export CSV des ventes (séparateur ; pour Excel FR, BOM UTF-8). */
  salesCsv(): string {
    const header = [
      'Référence',
      'Date',
      'Client',
      'Statut',
      'Total FCFA',
      'Encaissé FCFA',
      'Solde FCFA',
      'Mode de paiement',
      'Produits',
    ];
    const rows = this.sales().map((sale) => {
      const methods = Array.from(new Set(sale.payments.map((payment) => PAYMENT_METHOD_LABELS[payment.method])));
      return [
        sale.reference,
        formatDateTime(sale.createdAt),
        sale.customerName ?? 'Client comptoir',
        SALE_STATUS_LABELS[sale.status],
        sale.totalAmount,
        sale.amountPaid,
        sale.balanceDue,
        methods.join(' + ') || '—',
        sale.lines.map((line) => `${line.quantity} × ${line.productNameSnapshot}`).join(' | '),
      ];
    });
    return toCsv([header, ...rows]);
  }

  expensesCsv(): string {
    const header = ['Libellé', 'Catégorie', 'Date', 'Montant FCFA', 'Note'];
    const rows = this.expenses().map((expense) => [
      expense.label,
      expense.category,
      formatDateTime(expense.createdAt),
      expense.amount,
      expense.note ?? '',
    ]);
    return toCsv([header, ...rows]);
  }
}

function toCsv(rows: (string | number)[][]): string {
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = `${cell}`.replace(/"/g, '""');
          return /[;"\n]/.test(value) ? `"${value}"` : value;
        })
        .join(';'),
    )
    .join('\r\n');
  return `\uFEFF${body}`;
}
