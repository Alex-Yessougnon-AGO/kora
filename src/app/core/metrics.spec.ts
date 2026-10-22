import { describe, expect, it } from 'vitest';
import { buildFixtures } from './fixtures';
import { computeMetrics } from './metrics';
import type { Expense, KoraData, Product, Sale } from './models';

const NOW = new Date('2026-10-21T12:00:00.000Z');

function product(): Product {
  return {
    id: 'p1',
    name: 'Pagne',
    purchasePrice: 600,
    sellingPrice: 1000,
    stockQuantity: 20,
    lowStockThreshold: 5,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
  };
}

function sale(overrides: Partial<Sale> & Pick<Sale, 'id' | 'createdAt'>): Sale {
  return {
    reference: `VTE-${overrides.id}`,
    status: 'paid',
    lines: [
      {
        productId: 'p1',
        productNameSnapshot: 'Pagne',
        quantity: 5,
        unitSellingPrice: 1000,
        unitPurchasePrice: 600,
        lineTotal: 5000,
        lineCost: 3000,
      },
    ],
    totalAmount: 5000,
    costAmount: 3000,
    amountPaid: 5000,
    balanceDue: 0,
    payments: [],
    ...overrides,
  };
}

function expense(overrides: Partial<Expense> & Pick<Expense, 'id' | 'createdAt'>): Expense {
  return {
    label: 'Transport',
    category: 'Transport',
    amount: 1000,
    ...overrides,
  };
}

function data(sales: Sale[], expenses: Expense[]): KoraData {
  return {
    schemaVersion: 1,
    shop: { name: 'Test', owner: 'Awa', city: 'Abidjan' },
    products: [product()],
    sales,
    expenses,
    movements: [],
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: NOW.toISOString(),
  };
}

describe('computeMetrics', () => {
  const currentSale = sale({
    id: 'current',
    createdAt: '2026-10-20T10:00:00.000Z',
    amountPaid: 2000,
    balanceDue: 3000,
    status: 'partial',
    payments: [
      {
        id: 'pay_1',
        saleId: 'current',
        amount: 2000,
        method: 'cash',
        createdAt: '2026-10-20T10:05:00.000Z',
      },
    ],
  });
  const previousSale = sale({
    id: 'previous',
    createdAt: '2026-09-01T10:00:00.000Z',
    amountPaid: 2000,
    balanceDue: 3000,
    status: 'partial',
    payments: [
      {
        id: 'pay_2',
        saleId: 'previous',
        amount: 2000,
        method: 'cash',
        createdAt: '2026-09-01T10:05:00.000Z',
      },
    ],
  });

  const metrics = computeMetrics(
    data(
      [currentSale, previousSale],
      [
        expense({ id: 'e1', createdAt: '2026-10-19T09:00:00.000Z' }),
        expense({ id: 'e2', createdAt: '2026-08-30T09:00:00.000Z', amount: 500 }),
      ],
    ),
    '30d',
    NOW,
  );

  it('distingue chiffre d’affaires, encaissements, dépenses et résultat', () => {
    expect(metrics.revenue).toBe(5000);
    expect(metrics.cashIn).toBe(2000);
    expect(metrics.expenses).toBe(1000);
    expect(metrics.cogs).toBe(3000);
    expect(metrics.grossMargin).toBe(2000);
    expect(metrics.netResult).toBe(1000);
    expect(metrics.outstanding).toBe(3000);
    expect(metrics.salesCount).toBe(1);
    expect(metrics.averageSale).toBe(5000);
  });

  it('ne compte pas le solde dû dans les encaissements', () => {
    expect(metrics.cashIn).toBe(2000);
    expect(metrics.outstanding).toBe(3000);
    expect(metrics.paymentBreakdown).toHaveLength(1);
    expect(metrics.paymentBreakdown[0].amount).toBe(2000);
    expect(metrics.paymentBreakdown[0].share).toBe(100);
  });

  it('compare à la période précédente', () => {
    expect(metrics.previous.revenue).toBe(5000);
    expect(metrics.previous.cashIn).toBe(2000);
    expect(metrics.deltas.revenue).toBe(0);
    expect(metrics.deltas.cashIn).toBe(0);
  });

  it('construit une série quotidienne cohérente', () => {
    const seriesRevenue = metrics.series.reduce((total, point) => total + point.revenue, 0);
    const seriesCash = metrics.series.reduce((total, point) => total + point.cashIn, 0);
    expect(metrics.series).toHaveLength(30);
    expect(seriesRevenue).toBe(metrics.revenue);
    expect(seriesCash).toBe(metrics.cashIn);
  });
});

describe('buildFixtures', () => {
  const fixtures = buildFixtures(NOW);

  it('produit un jeu de données cohérent', () => {
    expect(fixtures.products.length).toBeGreaterThan(10);
    expect(fixtures.sales.length).toBeGreaterThan(20);
    expect(fixtures.expenses.length).toBeGreaterThan(5);

    for (const sale of fixtures.sales) {
      const total = sale.lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const cost = sale.lines.reduce((sum, line) => sum + line.lineCost, 0);
      expect(sale.totalAmount).toBe(total);
      expect(sale.costAmount).toBe(cost);
      expect(sale.amountPaid).toBe(
        sale.payments.reduce((sum, payment) => sum + payment.amount, 0),
      );
      expect(sale.balanceDue).toBe(sale.totalAmount - sale.amountPaid);
      expect(new Date(sale.createdAt).getTime()).toBeLessThanOrEqual(NOW.getTime());
      for (const line of sale.lines) {
        expect(line.lineTotal).toBe(line.quantity * line.unitSellingPrice);
        expect(line.lineCost).toBe(line.quantity * line.unitPurchasePrice);
      }
    }

    expect(new Set(fixtures.sales.map((sale) => sale.reference)).size).toBe(fixtures.sales.length);
    expect(fixtures.products.every((item) => item.stockQuantity >= 0)).toBe(true);
  });

  it('rend le stock courant recalculable depuis les mouvements', () => {
    for (const item of fixtures.products) {
      const fromMovements = fixtures.movements
        .filter((movement) => movement.productId === item.id)
        .reduce((total, movement) => total + movement.quantityDelta, 0);
      expect(fromMovements).toBe(item.stockQuantity);
    }
  });

  it('conserve des montants entiers en FCFA', () => {
    const amounts = [
      ...fixtures.sales.flatMap((sale) => [
        sale.totalAmount,
        sale.amountPaid,
        sale.balanceDue,
        ...sale.payments.map((payment) => payment.amount),
      ]),
      ...fixtures.products.flatMap((item) => [item.purchasePrice, item.sellingPrice]),
      ...fixtures.expenses.map((item) => item.amount),
    ];
    expect(amounts.every((amount) => Number.isInteger(amount) && amount >= 0)).toBe(true);
  });
});
