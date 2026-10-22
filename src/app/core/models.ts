/**
 * Modèles de données Kora — une seule source de vérité pour l'application.
 * Les montants sont des entiers en francs CFA (XOF), jamais des flottants.
 */

export type PaymentMethod = 'cash' | 'mobile_money' | 'other';

export type SaleStatus = 'paid' | 'partial' | 'credit' | 'cancelled';

export type StockMovementType = 'initial' | 'sale' | 'restock' | 'adjustment' | 'sale_cancelled';

export type ExpenseCategory =
  | 'Loyer'
  | 'Salaires'
  | 'Transport'
  | 'Emballage'
  | 'Énergie'
  | 'Communication'
  | 'Entretien'
  | 'Marketing'
  | 'Fournitures'
  | 'Autres';

export interface ShopSettings {
  name: string;
  owner: string;
  city: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  unit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleLine {
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitSellingPrice: number;
  unitPurchasePrice: number;
  lineTotal: number;
  lineCost: number;
}

export interface Payment {
  id: string;
  saleId: string;
  amount: number;
  method: PaymentMethod;
  createdAt: string;
  note?: string;
}

export interface Sale {
  id: string;
  reference: string;
  customerName?: string;
  createdAt: string;
  status: SaleStatus;
  lines: SaleLine[];
  totalAmount: number;
  costAmount: number;
  amountPaid: number;
  balanceDue: number;
  payments: Payment[];
  cancelledAt?: string;
  note?: string;
}

export interface Expense {
  id: string;
  label: string;
  category: ExpenseCategory;
  amount: number;
  createdAt: string;
  note?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantityDelta: number;
  referenceId?: string;
  reason?: string;
  createdAt: string;
}

export interface KoraData {
  schemaVersion: number;
  shop: ShopSettings;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  movements: StockMovement[];
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Entrées des actions métier                                                 */
/* -------------------------------------------------------------------------- */

export interface SaleDraftLine {
  productId: string;
  quantity: number;
}

export interface SaleDraft {
  lines: SaleDraftLine[];
  amountPaid: number;
  method: PaymentMethod;
  customerName?: string;
  note?: string;
}

export interface ProductDraft {
  id?: string;
  name: string;
  sku?: string;
  category?: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  unit?: string;
}

export interface ExpenseDraft {
  label: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // yyyy-mm-dd
  note?: string;
}

export interface ProductFormErrors {
  name?: string;
  purchasePrice?: string;
  sellingPrice?: string;
  stockQuantity?: string;
  lowStockThreshold?: string;
}

/* -------------------------------------------------------------------------- */
/* Libellés                                                                   */
/* -------------------------------------------------------------------------- */

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  mobile_money: 'Mobile Money',
  other: 'Autre',
};

export const PAYMENT_METHOD_SHORT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  mobile_money: 'Mobile Money',
  other: 'Autre',
};

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  paid: 'Payée',
  partial: 'Partielle',
  credit: 'À crédit',
  cancelled: 'Annulée',
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Loyer',
  'Salaires',
  'Transport',
  'Emballage',
  'Énergie',
  'Communication',
  'Entretien',
  'Marketing',
  'Fournitures',
  'Autres',
];

export const PRODUCT_CATEGORIES = [
  'Tissus',
  'Prêt-à-porter',
  'Accessoires',
  'Chaussures',
  'Épicerie',
] as const;

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  initial: 'Stock initial',
  sale: 'Vente',
  restock: 'Réapprovisionnement',
  adjustment: 'Correction',
  sale_cancelled: 'Vente annulée',
};
