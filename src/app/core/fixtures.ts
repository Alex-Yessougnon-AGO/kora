import { addDays, startOfDay } from './dates';
import { deriveSaleStatus, makeReference } from './business';
import type {
  Expense,
  ExpenseCategory,
  KoraData,
  Payment,
  PaymentMethod,
  Product,
  Sale,
  SaleLine,
  StockMovement,
} from './models';

const SCHEMA_VERSION = 1;

interface ProductTemplate {
  name: string;
  sku: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  threshold: number;
  unit: string;
}

const PRODUCT_TEMPLATES: ProductTemplate[] = [
  { name: 'Pagne wax 6 yards', sku: 'KOR-001', category: 'Tissus', purchasePrice: 12_000, sellingPrice: 18_500, stock: 18, threshold: 6, unit: 'pagne' },
  { name: 'Bazin riche brodé', sku: 'KOR-002', category: 'Tissus', purchasePrice: 22_000, sellingPrice: 32_000, stock: 7, threshold: 3, unit: 'coupon' },
  { name: 'Chemise en lin', sku: 'KOR-003', category: 'Prêt-à-porter', purchasePrice: 9_000, sellingPrice: 15_500, stock: 11, threshold: 4, unit: 'pièce' },
  { name: 'T-shirt coton bio', sku: 'KOR-004', category: 'Prêt-à-porter', purchasePrice: 3_500, sellingPrice: 7_000, stock: 34, threshold: 10, unit: 'pièce' },
  { name: 'Robe en wax', sku: 'KOR-005', category: 'Prêt-à-porter', purchasePrice: 11_000, sellingPrice: 19_000, stock: 6, threshold: 3, unit: 'pièce' },
  { name: 'Ensemble femme pagne', sku: 'KOR-006', category: 'Prêt-à-porter', purchasePrice: 15_000, sellingPrice: 26_000, stock: 4, threshold: 2, unit: 'ensemble' },
  { name: 'Sac à main cuir', sku: 'KOR-007', category: 'Accessoires', purchasePrice: 14_000, sellingPrice: 24_000, stock: 5, threshold: 2, unit: 'pièce' },
  { name: 'Sac en raphia', sku: 'KOR-008', category: 'Accessoires', purchasePrice: 4_500, sellingPrice: 9_500, stock: 15, threshold: 5, unit: 'pièce' },
  { name: 'Foulard en soie', sku: 'KOR-009', category: 'Accessoires', purchasePrice: 2_500, sellingPrice: 6_000, stock: 19, threshold: 6, unit: 'pièce' },
  { name: 'Boucles d’oreilles laiton', sku: 'KOR-010', category: 'Accessoires', purchasePrice: 1_200, sellingPrice: 3_500, stock: 27, threshold: 8, unit: 'paire' },
  { name: 'Sandales en cuir', sku: 'KOR-011', category: 'Chaussures', purchasePrice: 7_500, sellingPrice: 13_000, stock: 9, threshold: 4, unit: 'paire' },
  { name: 'Baskets en toile', sku: 'KOR-012', category: 'Chaussures', purchasePrice: 8_000, sellingPrice: 14_500, stock: 12, threshold: 5, unit: 'paire' },
  { name: 'Savon noir artisanal', sku: 'KOR-013', category: 'Épicerie', purchasePrice: 800, sellingPrice: 1_500, stock: 42, threshold: 12, unit: 'pièce' },
  { name: 'Huile de coco 250 ml', sku: 'KOR-014', category: 'Épicerie', purchasePrice: 1_500, sellingPrice: 2_800, stock: 23, threshold: 8, unit: 'flacon' },
  { name: 'Café Touba 500 g', sku: 'KOR-015', category: 'Épicerie', purchasePrice: 2_000, sellingPrice: 3_500, stock: 14, threshold: 5, unit: 'sachet' },
  { name: 'Riz parfumé 5 kg', sku: 'KOR-016', category: 'Épicerie', purchasePrice: 4_000, sellingPrice: 6_000, stock: 17, threshold: 6, unit: 'sac' },
];

const CUSTOMERS = [
  'Aya Bamba',
  'Koffi Mensah',
  'Fatou Diallo',
  'Mariam Koné',
  'Yao Kouassi',
  'Nadège Zadi',
  'Ibrahim Sow',
  'Awa Traoré',
  'Client comptoir',
];

const EXPENSE_TEMPLATES: { label: string; category: ExpenseCategory; amount: number; dayOffset: number; note?: string }[] = [
  { label: 'Loyer de la boutique', category: 'Loyer', amount: 45_000, dayOffset: 38, note: 'Mois en cours' },
  { label: 'Salaire vendeuse', category: 'Salaires', amount: 60_000, dayOffset: 37 },
  { label: 'Transport marchandises', category: 'Transport', amount: 8_500, dayOffset: 33, note: 'Bouaké → Abidjan' },
  { label: 'Emballages et sachets', category: 'Emballage', amount: 5_500, dayOffset: 30 },
  { label: 'Facture électricité', category: 'Énergie', amount: 12_400, dayOffset: 27 },
  { label: 'Internet boutique', category: 'Communication', amount: 10_000, dayOffset: 24 },
  { label: 'Entretien climatiseur', category: 'Entretien', amount: 7_000, dayOffset: 21 },
  { label: 'Publicité Instagram', category: 'Marketing', amount: 15_000, dayOffset: 18 },
  { label: 'Fournitures de caisse', category: 'Fournitures', amount: 3_500, dayOffset: 15 },
  { label: 'Eau de la boutique', category: 'Énergie', amount: 4_500, dayOffset: 12 },
  { label: 'Loyer de la boutique', category: 'Loyer', amount: 45_000, dayOffset: 8, note: 'Mois précédent' },
  { label: 'Transport fournisseur', category: 'Transport', amount: 6_000, dayOffset: 6 },
  { label: 'Salaire vendeuse', category: 'Salaires', amount: 60_000, dayOffset: 4 },
  { label: 'Sachets et rubans', category: 'Emballage', amount: 4_000, dayOffset: 2 },
  { label: 'Crédit communication', category: 'Communication', amount: 2_500, dayOffset: 1 },
  { label: 'Taxi livraison cliente', category: 'Transport', amount: 3_000, dayOffset: 0 },
];

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'cash', 'cash', 'mobile_money', 'mobile_money', 'other'];

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function clampDate(date: Date, now: Date): Date {
  return date.getTime() > now.getTime() ? new Date(now) : date;
}

/** Jeu de démonstration cohérent : stock courant, historique, paiements et dépenses. */
export function buildFixtures(now = new Date()): KoraData {
  const random = createRng(20_261_021);
  const created = startOfDay(addDays(now, -60));
  const products: Product[] = PRODUCT_TEMPLATES.map((template, index) => ({
    id: `prod_demo_${index + 1}`,
    name: template.name,
    sku: template.sku,
    category: template.category,
    purchasePrice: template.purchasePrice,
    sellingPrice: template.sellingPrice,
    stockQuantity: template.stock,
    lowStockThreshold: template.threshold,
    unit: template.unit,
    createdAt: created.toISOString(),
    updatedAt: now.toISOString(),
  }));

  const soldQuantities = new Map<string, number>();
  const sales: Sale[] = [];
  const movementList: StockMovement[] = [];
  const referenceCounters = new Map<string, number>();
  let saleSequence = 0;
  let paymentSequence = 0;

  const saleCount = 68;
  for (let i = 0; i < saleCount; i += 1) {
    const dayOffset = Math.floor(Math.pow(random(), 1.35) * 42);
    const day = addDays(now, -dayOffset);
    const hour = 8 + Math.floor(random() * 11);
    const minute = Math.floor(random() * 60);
    const date = clampDate(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute), now);
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const sequence = (referenceCounters.get(dayKey) ?? 0) + 1;
    referenceCounters.set(dayKey, sequence);

    const lineCount = 1 + Math.floor(random() * 3);
    const chosen = new Set<number>();
    while (chosen.size < Math.min(lineCount, PRODUCT_TEMPLATES.length)) {
      chosen.add(Math.floor(random() * PRODUCT_TEMPLATES.length));
    }
    const lines: SaleLine[] = [];
    for (const index of chosen) {
      const template = PRODUCT_TEMPLATES[index];
      const product = products[index];
      const isBulk = template.category === 'Épicerie';
      const quantity = 1 + Math.floor(random() * (isBulk ? 4 : 2));
      lines.push({
        productId: product.id,
        productNameSnapshot: product.name,
        quantity,
        unitSellingPrice: product.sellingPrice,
        unitPurchasePrice: product.purchasePrice,
        lineTotal: product.sellingPrice * quantity,
        lineCost: product.purchasePrice * quantity,
      });
      soldQuantities.set(product.id, (soldQuantities.get(product.id) ?? 0) + quantity);
    }

    const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const cost = lines.reduce((sum, line) => sum + line.lineCost, 0);
    const scenario = random();
    let paid: number;
    if (scenario < 0.1) paid = 0;
    else if (scenario < 0.32) paid = Math.max(500, Math.round((total * (0.35 + random() * 0.45)) / 500) * 500);
    else paid = total;

    if (paid > total) paid = total;
    const needsCustomer = paid < total;
    const customerName = needsCustomer
      ? CUSTOMERS[Math.floor(random() * (CUSTOMERS.length - 1))]
      : random() > 0.55
        ? CUSTOMERS[Math.floor(random() * CUSTOMERS.length)]
        : undefined;

    const saleId = `sale_demo_${++saleSequence}`;
    const payments: Payment[] = [];
    if (paid > 0) {
      payments.push({
        id: `pay_demo_${++paymentSequence}`,
        saleId,
        amount: paid,
        method: PAYMENT_METHODS[Math.floor(random() * PAYMENT_METHODS.length)],
        createdAt: date.toISOString(),
      });
    }

    const sale: Sale = {
      id: saleId,
      reference: makeReference(date, sequence),
      customerName,
      createdAt: date.toISOString(),
      status: deriveSaleStatus(total, paid),
      lines,
      totalAmount: total,
      costAmount: cost,
      amountPaid: paid,
      balanceDue: total - paid,
      payments,
    };
    sales.push(sale);
  }

  // Paiements ultérieurs sur une partie des ventes à crédit / partielles.
  const creditSales = sales.filter((sale) => sale.balanceDue > 0);
  creditSales.forEach((sale, index) => {
    if (index % 3 !== 0) return;
    const saleDate = new Date(sale.createdAt);
    const later = addDays(saleDate, 2 + (index % 8));
    if (later.getTime() > now.getTime()) return;
    const full = index % 2 === 0;
    const amount = full
      ? sale.balanceDue
      : Math.max(500, Math.round((sale.balanceDue * 0.5) / 500) * 500);
    if (amount <= 0) return;
    const payment: Payment = {
      id: `pay_demo_${++paymentSequence}`,
      saleId: sale.id,
      amount,
      method: index % 2 === 0 ? 'mobile_money' : 'cash',
      createdAt: later.toISOString(),
    };
    sale.payments.push(payment);
    sale.amountPaid += amount;
    sale.balanceDue = sale.totalAmount - sale.amountPaid;
    sale.status = deriveSaleStatus(sale.totalAmount, sale.amountPaid);
  });

  // Réapprovisionnements de démonstration (le stock initial compense).
  const restockPlan: { index: number; quantity: number; dayOffset: number }[] = [
    { index: 3, quantity: 20, dayOffset: 26 },
    { index: 12, quantity: 24, dayOffset: 17 },
    { index: 15, quantity: 12, dayOffset: 9 },
  ];
  const restocked = new Map<string, number>();
  for (const restock of restockPlan) {
    const product = products[restock.index];
    const date = new Date(addDays(now, -restock.dayOffset).setHours(10, 0, 0, 0));
    restocked.set(product.id, restock.quantity);
    movementList.push({
      id: `mov_demo_restock_${restock.index}`,
      productId: product.id,
      type: 'restock',
      quantityDelta: restock.quantity,
      reason: 'Réapprovisionnement fournisseur',
      createdAt: date.toISOString(),
    });
  }

  for (const product of products) {
    const sold = soldQuantities.get(product.id) ?? 0;
    const restock = restocked.get(product.id) ?? 0;
    const initial = Math.max(0, product.stockQuantity + sold - restock);
    movementList.push({
      id: `mov_demo_initial_${product.id}`,
      productId: product.id,
      type: 'initial',
      quantityDelta: initial,
      reason: 'Stock initial',
      createdAt: created.toISOString(),
    });
  }

  for (const sale of sales) {
    for (const line of sale.lines) {
      movementList.push({
        id: `mov_demo_${sale.id}_${line.productId}`,
        productId: line.productId,
        type: 'sale',
        quantityDelta: -line.quantity,
        referenceId: sale.id,
        createdAt: sale.createdAt,
      });
    }
  }

  const expenses: Expense[] = EXPENSE_TEMPLATES.map((template, index) => {
    const date = new Date(addDays(now, -template.dayOffset).setHours(12, 0, 0, 0));
    return {
      id: `exp_demo_${index + 1}`,
      label: template.label,
      category: template.category,
      amount: template.amount,
      createdAt: date.toISOString(),
      note: template.note,
    };
  });

  const nowIso = now.toISOString();

  return {
    schemaVersion: SCHEMA_VERSION,
    shop: {
      name: 'Boutique Awa',
      owner: 'Awa Traoré',
      city: 'Abidjan · Cocody',
    },
    products,
    sales: sales.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    expenses: expenses.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    movements: movementList.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    createdAt: created.toISOString(),
    updatedAt: nowIso,
  };
}

export const DEMO_SCHEMA_VERSION = SCHEMA_VERSION;
