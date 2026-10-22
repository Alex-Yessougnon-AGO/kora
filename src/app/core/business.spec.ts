import { describe, expect, it } from 'vitest';
import {
  BusinessError,
  applyExpense,
  applyPayment,
  applyProduct,
  applySale,
  stockLevel,
  validateProductDraft,
} from './business';
import type { KoraData, Product, SaleDraft } from './models';

const NOW = new Date('2026-10-21T10:00:00.000Z');

function product(overrides: Partial<Product> & Pick<Product, 'id' | 'name'>): Product {
  return {
    purchasePrice: 600,
    sellingPrice: 1000,
    stockQuantity: 5,
    lowStockThreshold: 2,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  };
}

function makeData(products: Product[]): KoraData {
  return {
    schemaVersion: 1,
    shop: { name: 'Boutique test', owner: 'Awa', city: 'Abidjan' },
    products,
    sales: [],
    expenses: [],
    movements: [],
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  };
}

function draft(lines: SaleDraft['lines'], amountPaid: number): SaleDraft {
  return { lines, amountPaid, method: 'cash', customerName: 'Client test' };
}

describe('applySale', () => {
  it('enregistre une vente multi-produits, calcule total/coût/marge et décrémente le stock une seule fois', () => {
    const p1 = product({ id: 'p1', name: 'Pagne', stockQuantity: 5 });
    const p2 = product({ id: 'p2', name: 'Sac', sellingPrice: 2500, purchasePrice: 1000, stockQuantity: 3 });
    const data = makeData([p1, p2]);

    const next = applySale(
      data,
      draft(
        [
          { productId: 'p1', quantity: 2 },
          { productId: 'p2', quantity: 1 },
        ],
        4500,
      ),
      { now: NOW, id: 'sale_1' },
    );

    const sale = next.sales[0];
    expect(sale.totalAmount).toBe(4500);
    expect(sale.costAmount).toBe(2200);
    expect(sale.totalAmount - sale.costAmount).toBe(2300);
    expect(sale.status).toBe('paid');
    expect(sale.balanceDue).toBe(0);
    expect(sale.payments).toHaveLength(1);
    expect(sale.payments[0].amount).toBe(4500);
    expect(next.products.find((item) => item.id === 'p1')?.stockQuantity).toBe(3);
    expect(next.products.find((item) => item.id === 'p2')?.stockQuantity).toBe(2);
    expect(next.movements.filter((movement) => movement.type === 'sale')).toHaveLength(2);
    expect(sale.reference).toMatch(/^VTE-\d{6}-\d{3}$/);
  });

  it('refuse une quantité supérieure au stock disponible', () => {
    const data = makeData([product({ id: 'p1', name: 'Pagne', stockQuantity: 1 })]);

    expect(() =>
      applySale(data, draft([{ productId: 'p1', quantity: 2 }], 2000), { now: NOW }),
    ).toThrowError(BusinessError);

    try {
      applySale(data, draft([{ productId: 'p1', quantity: 2 }], 2000), { now: NOW });
    } catch (error) {
      expect((error as BusinessError).code).toBe('INSUFFICIENT_STOCK');
      expect((error as BusinessError).message).toContain('Stock insuffisant');
    }

    expect(data.products[0].stockQuantity).toBe(1);
    expect(data.sales).toHaveLength(0);
  });

  it('conserve un paiement partiel et le solde dû exact', () => {
    const data = makeData([product({ id: 'p1', name: 'Pagne', stockQuantity: 5 })]);
    const next = applySale(data, draft([{ productId: 'p1', quantity: 2 }], 1000), {
      now: NOW,
      id: 'sale_partial',
    });

    const sale = next.sales[0];
    expect(sale.status).toBe('partial');
    expect(sale.amountPaid).toBe(1000);
    expect(sale.balanceDue).toBe(1000);
  });

  it('marque une vente sans paiement comme crédit avec un solde complet', () => {
    const data = makeData([product({ id: 'p1', name: 'Pagne', stockQuantity: 5 })]);
    const next = applySale(data, draft([{ productId: 'p1', quantity: 1 }], 0), { now: NOW });

    expect(next.sales[0].status).toBe('credit');
    expect(next.sales[0].amountPaid).toBe(0);
    expect(next.sales[0].balanceDue).toBe(1000);
    expect(next.sales[0].payments).toHaveLength(0);
  });

  it('refuse un montant reçu supérieur au total', () => {
    const data = makeData([product({ id: 'p1', name: 'Pagne' })]);
    expect(() =>
      applySale(data, draft([{ productId: 'p1', quantity: 1 }], 1500), { now: NOW }),
    ).toThrowError(/dépasser/);
  });

  it('refuse deux lignes pour le même produit', () => {
    const data = makeData([product({ id: 'p1', name: 'Pagne', stockQuantity: 5 })]);
    expect(() =>
      applySale(
        data,
        draft(
          [
            { productId: 'p1', quantity: 1 },
            { productId: 'p1', quantity: 1 },
          ],
          2000,
        ),
        { now: NOW },
      ),
    ).toThrowError(/déjà/);
  });

  it('fige les prix et le nom dans la ligne de vente malgré une modification du catalogue', () => {
    const p1 = product({ id: 'p1', name: 'Pagne wax' });
    const data = makeData([p1]);
    const sold = applySale(data, draft([{ productId: 'p1', quantity: 1 }], 1000), {
      now: NOW,
      id: 'sale_snapshot',
    });

    const updated = applyProduct(
      sold,
      {
        id: 'p1',
        name: 'Pagne wax premium',
        purchasePrice: 900,
        sellingPrice: 1900,
        stockQuantity: 4,
        lowStockThreshold: 2,
      },
      NOW,
    );

    const line = updated.sales[0].lines[0];
    expect(line.productNameSnapshot).toBe('Pagne wax');
    expect(line.unitSellingPrice).toBe(1000);
    expect(line.unitPurchasePrice).toBe(600);
    expect(updated.products[0].sellingPrice).toBe(1900);
  });
});

describe('applyPayment', () => {
  it('solde une vente partielle sans changer son total', () => {
    const data = makeData([product({ id: 'p1', name: 'Pagne' })]);
    const withSale = applySale(data, draft([{ productId: 'p1', quantity: 2 }], 500), {
      now: NOW,
      id: 'sale_pay',
    });

    const next = applyPayment(withSale, 'sale_pay', 1500, 'mobile_money', NOW);

    expect(next.sales[0].totalAmount).toBe(2000);
    expect(next.sales[0].amountPaid).toBe(2000);
    expect(next.sales[0].balanceDue).toBe(0);
    expect(next.sales[0].status).toBe('paid');
    expect(next.sales[0].payments).toHaveLength(2);
  });

  it('refuse un paiement supérieur au solde restant', () => {
    const data = makeData([product({ id: 'p1', name: 'Pagne' })]);
    const withSale = applySale(data, draft([{ productId: 'p1', quantity: 2 }], 500), {
      now: NOW,
      id: 'sale_pay',
    });

    expect(() => applyPayment(withSale, 'sale_pay', 1600, 'cash', NOW)).toThrowError(
      /dépasse le solde/,
    );
  });

  it('refuse un montant nul ou négatif', () => {
    const data = makeData([product({ id: 'p1', name: 'Pagne' })]);
    const withSale = applySale(data, draft([{ productId: 'p1', quantity: 2 }], 500), {
      now: NOW,
      id: 'sale_pay',
    });

    expect(() => applyPayment(withSale, 'sale_pay', 0, 'cash', NOW)).toThrowError(/supérieur à zéro/);
  });
});

describe('dépenses et produits', () => {
  it('ajoute une dépense à sa date sans toucher aux ventes', () => {
    const data = makeData([product({ id: 'p1', name: 'Pagne' })]);
    const withSale = applySale(data, draft([{ productId: 'p1', quantity: 1 }], 1000), {
      now: NOW,
      id: 'sale_1',
    });

    const next = applyExpense(withSale, {
      label: 'Transport',
      category: 'Transport',
      amount: 300,
      date: '2026-10-21',
    });

    expect(next.sales[0].totalAmount).toBe(1000);
    expect(next.expenses).toHaveLength(1);
    expect(next.expenses[0].amount).toBe(300);
  });

  it('valide les prix négatifs et les noms vides', () => {
    const errors = validateProductDraft({
      name: '  ',
      purchasePrice: -100,
      sellingPrice: -1,
      stockQuantity: 1.5,
      lowStockThreshold: -2,
    });

    expect(errors.name).toBeTruthy();
    expect(errors.purchasePrice).toBeTruthy();
    expect(errors.sellingPrice).toBeTruthy();
    expect(errors.stockQuantity).toBeTruthy();
    expect(errors.lowStockThreshold).toBeTruthy();
  });

  it('trace une correction de stock lors d’une modification manuelle', () => {
    const data = makeData([product({ id: 'p1', name: 'Pagne', stockQuantity: 5 })]);
    const next = applyProduct(
      data,
      {
        id: 'p1',
        name: 'Pagne',
        purchasePrice: 600,
        sellingPrice: 1000,
        stockQuantity: 2,
        lowStockThreshold: 2,
      },
      NOW,
    );

    expect(next.products[0].stockQuantity).toBe(2);
    const adjustment = next.movements.find((movement) => movement.type === 'adjustment');
    expect(adjustment?.quantityDelta).toBe(-3);
  });

  it('classe les niveaux de stock', () => {
    expect(stockLevel(product({ id: 'p1', name: 'A', stockQuantity: 0 }))).toBe('out');
    expect(stockLevel(product({ id: 'p2', name: 'B', stockQuantity: 2, lowStockThreshold: 2 }))).toBe('low');
    expect(stockLevel(product({ id: 'p3', name: 'C', stockQuantity: 9, lowStockThreshold: 2 }))).toBe('ok');
  });
});
