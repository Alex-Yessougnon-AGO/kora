import { fromDateInputValue } from './dates';
import { toXof } from './money';
import type {
  ExpenseDraft,
  KoraData,
  PaymentMethod,
  Product,
  ProductDraft,
  ProductFormErrors,
  Sale,
  SaleDraft,
  SaleLine,
  SaleStatus,
  ShopSettings,
  StockMovement,
} from './models';

export type BusinessErrorCode =
  | 'EMPTY_SALE'
  | 'INVALID_QUANTITY'
  | 'DUPLICATE_LINE'
  | 'UNKNOWN_PRODUCT'
  | 'INSUFFICIENT_STOCK'
  | 'PAYMENT_EXCEEDS_TOTAL'
  | 'INVALID_PAYMENT'
  | 'SALE_NOT_FOUND'
  | 'SALE_CANCELLED'
  | 'INVALID_EXPENSE'
  | 'INVALID_PRODUCT'
  | 'PRODUCT_NOT_FOUND'
  | 'INVALID_STOCK'
  | 'DUPLICATE_SUBMISSION'
  | 'STORAGE_FAILED';

export class BusinessError extends Error {
  constructor(
    readonly code: BusinessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

export function createId(prefix: string): string {
  const globalCrypto = typeof crypto !== 'undefined' ? crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return `${prefix}_${globalCrypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function saleTotals(lines: SaleLine[]): { total: number; cost: number; margin: number } {
  let total = 0;
  let cost = 0;
  for (const line of lines) {
    total += line.lineTotal;
    cost += line.lineCost;
  }
  return { total, cost, margin: total - cost };
}

export function deriveSaleStatus(
  total: number,
  paid: number,
  cancelled = false,
): SaleStatus {
  if (cancelled) return 'cancelled';
  if (paid >= total) return 'paid';
  if (paid > 0) return 'partial';
  return 'credit';
}

export function makeReference(date: Date, sequence: number): string {
  const year = `${date.getFullYear()}`.slice(-2);
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `VTE-${year}${month}${day}-${`${sequence}`.padStart(3, '0')}`;
}

export function nextReference(data: KoraData, date: Date): string {
  const dayPrefix = makeReference(date, 0).slice(0, -3);
  const count = data.sales.filter((sale) => sale.reference.startsWith(dayPrefix)).length;
  let sequence = count + 1;
  let reference = makeReference(date, sequence);
  const existing = new Set(data.sales.map((sale) => sale.reference));
  while (existing.has(reference)) {
    sequence += 1;
    reference = makeReference(date, sequence);
  }
  return reference;
}

export interface SaleValidation {
  formError?: string;
  lineErrors: Record<string, string>;
  valid: boolean;
}

export function validateSaleDraft(products: Product[], draft: SaleDraft): SaleValidation {
  const lineErrors: Record<string, string> = {};
  const seen = new Set<string>();
  let formError: string | undefined;

  if (!draft.lines.length) {
    formError = 'Ajoutez au moins un produit à la vente.';
  }

  for (const line of draft.lines) {
    const product = products.find((item) => item.id === line.productId);
    if (!product) {
      lineErrors[line.productId] = 'Ce produit n’existe plus dans le catalogue.';
      continue;
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      lineErrors[line.productId] = 'La quantité doit être un nombre entier supérieur à zéro.';
      continue;
    }
    if (seen.has(line.productId)) {
      lineErrors[line.productId] = 'Ce produit figure déjà dans la vente.';
      continue;
    }
    seen.add(line.productId);
    if (line.quantity > product.stockQuantity) {
      lineErrors[line.productId] =
        product.stockQuantity === 0
          ? `${product.name} est en rupture de stock.`
          : `Stock insuffisant : ${product.stockQuantity} ${product.unit ?? 'unité(s)'} disponible(s) pour ${product.name}.`;
    }
  }

  if (!formError) {
    const total = computeDraftTotal(products, draft.lines);
    const paid = toXof(draft.amountPaid);
    if (!Number.isFinite(draft.amountPaid) || draft.amountPaid < 0) {
      formError = 'Le montant reçu doit être positif ou nul.';
    } else if (paid > total) {
      formError = 'Le montant reçu ne peut pas dépasser le total de la vente.';
    }
  }

  return { formError, lineErrors, valid: !formError && Object.keys(lineErrors).length === 0 };
}

export function computeDraftTotal(products: Product[], lines: { productId: string; quantity: number }[]): number {
  return lines.reduce((total, line) => {
    const product = products.find((item) => item.id === line.productId);
    return total + (product ? product.sellingPrice * Math.max(0, line.quantity) : 0);
  }, 0);
}

export interface BuildSaleOptions {
  now: Date;
  id?: string;
  reference?: string;
}

/** Construit la vente, décrémente le stock une seule fois et trace les mouvements. */
export function applySale(data: KoraData, draft: SaleDraft, options: BuildSaleOptions): KoraData {
  const validation = validateSaleDraft(data.products, draft);
  if (!validation.valid) {
    if (validation.formError) {
      const code =
        validation.formError.includes('dépasser') ? 'PAYMENT_EXCEEDS_TOTAL' : 'EMPTY_SALE';
      throw new BusinessError(code, validation.formError);
    }
    const firstError = Object.values(validation.lineErrors)[0];
    const insufficient = firstError?.startsWith('Stock insuffisant') || firstError?.includes('rupture');
    throw new BusinessError(insufficient ? 'INSUFFICIENT_STOCK' : 'INVALID_QUANTITY', firstError ?? 'Vente invalide.');
  }

  const now = options.now;
  const saleId = options.id ?? createId('sale');
  const createdAt = now.toISOString();
  const lines: SaleLine[] = draft.lines.map((line) => {
    const product = data.products.find((item) => item.id === line.productId)!;
    return {
      productId: product.id,
      productNameSnapshot: product.name,
      quantity: line.quantity,
      unitSellingPrice: product.sellingPrice,
      unitPurchasePrice: product.purchasePrice,
      lineTotal: product.sellingPrice * line.quantity,
      lineCost: product.purchasePrice * line.quantity,
    };
  });

  const { total, cost } = saleTotals(lines);
  const amountPaid = Math.min(toXof(draft.amountPaid), total);
  const payments =
    amountPaid > 0
      ? [
          {
            id: createId('pay'),
            saleId,
            amount: amountPaid,
            method: draft.method,
            createdAt,
          },
        ]
      : [];

  const sale: Sale = {
    id: saleId,
    reference: options.reference ?? nextReference(data, now),
    customerName: draft.customerName?.trim() || undefined,
    createdAt,
    status: deriveSaleStatus(total, amountPaid),
    lines,
    totalAmount: total,
    costAmount: cost,
    amountPaid,
    balanceDue: total - amountPaid,
    payments,
    note: draft.note?.trim() || undefined,
  };

  const updatedProducts = data.products.map((product) => {
    const line = lines.find((item) => item.productId === product.id);
    if (!line) return product;
    return {
      ...product,
      stockQuantity: product.stockQuantity - line.quantity,
      updatedAt: createdAt,
    };
  });

  const movements: StockMovement[] = lines.map((line) => ({
    id: createId('mov'),
    productId: line.productId,
    type: 'sale',
    quantityDelta: -line.quantity,
    referenceId: saleId,
    createdAt,
  }));

  return {
    ...data,
    sales: [sale, ...data.sales],
    products: updatedProducts,
    movements: [...movements, ...data.movements],
    updatedAt: createdAt,
  };
}

export function applyPayment(
  data: KoraData,
  saleId: string,
  amount: number,
  method: PaymentMethod,
  now: Date,
  note?: string,
): KoraData {
  const sale = data.sales.find((item) => item.id === saleId);
  if (!sale) throw new BusinessError('SALE_NOT_FOUND', 'Vente introuvable.');
  if (sale.cancelledAt) throw new BusinessError('SALE_CANCELLED', 'Cette vente est annulée.');

  const safeAmount = toXof(amount);
  if (!Number.isFinite(amount) || safeAmount <= 0) {
    throw new BusinessError('INVALID_PAYMENT', 'Le montant du paiement doit être supérieur à zéro.');
  }
  if (safeAmount > sale.balanceDue) {
    throw new BusinessError(
      'INVALID_PAYMENT',
      `Le montant dépasse le solde restant (${sale.balanceDue.toLocaleString('fr-FR')} FCFA).`,
    );
  }

  const createdAt = now.toISOString();
  const payment = {
    id: createId('pay'),
    saleId,
    amount: safeAmount,
    method,
    createdAt,
    note: note?.trim() || undefined,
  };
  const amountPaid = sale.amountPaid + safeAmount;
  const balanceDue = sale.totalAmount - amountPaid;
  const updatedSale: Sale = {
    ...sale,
    payments: [...sale.payments, payment],
    amountPaid,
    balanceDue,
    status: deriveSaleStatus(sale.totalAmount, amountPaid),
  };

  return {
    ...data,
    sales: data.sales.map((item) => (item.id === saleId ? updatedSale : item)),
    updatedAt: createdAt,
  };
}

export function applyExpense(data: KoraData, draft: ExpenseDraft): KoraData {
  const label = draft.label.trim();
  const amount = toXof(draft.amount);
  if (!label) throw new BusinessError('INVALID_EXPENSE', 'Le libellé de la dépense est obligatoire.');
  if (!Number.isFinite(draft.amount) || amount <= 0) {
    throw new BusinessError('INVALID_EXPENSE', 'Le montant de la dépense doit être supérieur à zéro.');
  }
  const createdAt = fromDateInputValue(draft.date).toISOString();
  const expense = {
    id: createId('exp'),
    label,
    category: draft.category,
    amount,
    createdAt,
    note: draft.note?.trim() || undefined,
  };

  return {
    ...data,
    expenses: [expense, ...data.expenses],
    updatedAt: new Date().toISOString(),
  };
}

export function applyDeleteExpense(data: KoraData, expenseId: string): KoraData {
  return {
    ...data,
    expenses: data.expenses.filter((expense) => expense.id !== expenseId),
    updatedAt: new Date().toISOString(),
  };
}

export function validateProductDraft(draft: ProductDraft): ProductFormErrors {
  const errors: ProductFormErrors = {};
  if (!draft.name?.trim()) errors.name = 'Le nom du produit est obligatoire.';
  if (!Number.isFinite(draft.purchasePrice) || draft.purchasePrice < 0) {
    errors.purchasePrice = 'Le prix d’achat doit être positif ou nul.';
  }
  if (!Number.isFinite(draft.sellingPrice) || draft.sellingPrice < 0) {
    errors.sellingPrice = 'Le prix de vente doit être positif ou nul.';
  }
  if (!Number.isInteger(draft.stockQuantity) || draft.stockQuantity < 0) {
    errors.stockQuantity = 'La quantité doit être un entier positif ou nul.';
  }
  if (!Number.isInteger(draft.lowStockThreshold) || draft.lowStockThreshold < 0) {
    errors.lowStockThreshold = 'Le seuil d’alerte doit être un entier positif ou nul.';
  }
  return errors;
}

export function applyProduct(data: KoraData, draft: ProductDraft, now: Date): KoraData {
  const errors = validateProductDraft(draft);
  if (Object.keys(errors).length > 0) {
    throw new BusinessError('INVALID_PRODUCT', Object.values(errors)[0] ?? 'Produit invalide.');
  }

  const iso = now.toISOString();
  const name = draft.name.trim();

  if (!draft.id) {
    const id = createId('prod');
    const product: Product = {
      id,
      name,
      sku: draft.sku?.trim() || undefined,
      category: draft.category?.trim() || undefined,
      purchasePrice: toXof(draft.purchasePrice),
      sellingPrice: toXof(draft.sellingPrice),
      stockQuantity: toXof(draft.stockQuantity),
      lowStockThreshold: toXof(draft.lowStockThreshold),
      unit: draft.unit?.trim() || undefined,
      createdAt: iso,
      updatedAt: iso,
    };
    const movement: StockMovement = {
      id: createId('mov'),
      productId: id,
      type: 'initial',
      quantityDelta: product.stockQuantity,
      reason: 'Création du produit',
      createdAt: iso,
    };
    return {
      ...data,
      products: [product, ...data.products],
      movements: [movement, ...data.movements],
      updatedAt: iso,
    };
  }

  const existing = data.products.find((item) => item.id === draft.id);
  if (!existing) throw new BusinessError('PRODUCT_NOT_FOUND', 'Produit introuvable.');

  const nextStock = toXof(draft.stockQuantity);
  const delta = nextStock - existing.stockQuantity;
  const product: Product = {
    ...existing,
    name,
    sku: draft.sku?.trim() || undefined,
    category: draft.category?.trim() || undefined,
    purchasePrice: toXof(draft.purchasePrice),
    sellingPrice: toXof(draft.sellingPrice),
    stockQuantity: nextStock,
    lowStockThreshold: toXof(draft.lowStockThreshold),
    unit: draft.unit?.trim() || undefined,
    updatedAt: iso,
  };

  const movements = [...data.movements];
  if (delta !== 0) {
    movements.unshift({
      id: createId('mov'),
      productId: existing.id,
      type: 'adjustment',
      quantityDelta: delta,
      reason: 'Correction manuelle du stock',
      createdAt: iso,
    });
  }

  return {
    ...data,
    products: data.products.map((item) => (item.id === existing.id ? product : item)),
    movements,
    updatedAt: iso,
  };
}

export function applyRestock(data: KoraData, productId: string, quantity: number, now: Date, reason?: string): KoraData {
  const product = data.products.find((item) => item.id === productId);
  if (!product) throw new BusinessError('PRODUCT_NOT_FOUND', 'Produit introuvable.');
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new BusinessError('INVALID_STOCK', 'La quantité à ajouter doit être un entier supérieur à zéro.');
  }
  const iso = now.toISOString();
  const updated: Product = {
    ...product,
    stockQuantity: product.stockQuantity + quantity,
    updatedAt: iso,
  };
  const movement: StockMovement = {
    id: createId('mov'),
    productId,
    type: 'restock',
    quantityDelta: quantity,
    reason: reason?.trim() || 'Réapprovisionnement',
    createdAt: iso,
  };
  return {
    ...data,
    products: data.products.map((item) => (item.id === productId ? updated : item)),
    movements: [movement, ...data.movements],
    updatedAt: iso,
  };
}

export function applyShop(data: KoraData, shop: ShopSettings): KoraData {
  return {
    ...data,
    shop: {
      name: shop.name.trim() || data.shop.name,
      owner: shop.owner.trim() || data.shop.owner,
      city: shop.city.trim(),
    },
    updatedAt: new Date().toISOString(),
  };
}

export type StockLevel = 'out' | 'low' | 'ok';

export function stockLevel(product: Product): StockLevel {
  if (product.stockQuantity <= 0) return 'out';
  if (product.stockQuantity <= product.lowStockThreshold) return 'low';
  return 'ok';
}
