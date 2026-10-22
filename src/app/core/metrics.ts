import { addDays, formatDayShort, startOfDay } from './dates';
import { percent } from './money';
import { getPeriodRange, isInRange, previousRange, type DateRange, type PeriodKey } from './period';
import {
  PAYMENT_METHOD_LABELS,
  type KoraData,
  type Payment,
  type PaymentMethod,
  type Product,
  type Sale,
} from './models';

export interface SeriesPoint {
  date: string;
  label: string;
  revenue: number;
  cashIn: number;
}

export interface PaymentBreakdownItem {
  method: PaymentMethod;
  label: string;
  amount: number;
  count: number;
  share: number;
}

export interface ProductRanking {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface TodayMetrics {
  revenue: number;
  cashIn: number;
  expenses: number;
  salesCount: number;
}

export interface MetricComparison {
  revenue: number;
  cashIn: number;
  netResult: number;
}

export interface DashboardMetrics {
  range: DateRange;
  revenue: number;
  cashIn: number;
  expenses: number;
  cogs: number;
  grossMargin: number;
  netResult: number;
  salesCount: number;
  averageSale: number;
  outstanding: number;
  grossMarginRate: number;
  paymentBreakdown: PaymentBreakdownItem[];
  series: SeriesPoint[];
  lowStock: Product[];
  outOfStock: number;
  stockValue: number;
  totalProducts: number;
  totalUnits: number;
  topProducts: ProductRanking[];
  previous: MetricComparison;
  deltas: { revenue: number | null; cashIn: number | null; netResult: number | null };
  today: TodayMetrics;
}

function paymentsOf(sales: Sale[]): Payment[] {
  return sales.flatMap((sale) => sale.payments);
}

function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function comparisonFor(data: KoraData, range: DateRange): MetricComparison {
  const sales = data.sales.filter(
    (sale) => !sale.cancelledAt && isInRange(sale.createdAt, range),
  );
  const payments = paymentsOf(data.sales).filter((payment) => isInRange(payment.createdAt, range));
  const expenses = data.expenses.filter((expense) => isInRange(expense.createdAt, range));
  const revenue = sum(sales, (sale) => sale.totalAmount);
  const cogs = sum(sales, (sale) => sale.costAmount);
  const netResult = revenue - cogs - sum(expenses, (expense) => expense.amount);
  return {
    revenue,
    cashIn: sum(payments, (payment) => payment.amount),
    netResult,
  };
}

export function computeMetrics(
  data: KoraData,
  periodKey: PeriodKey,
  now = new Date(),
): DashboardMetrics {
  const range = getPeriodRange(periodKey, data, now);
  const sales = data.sales.filter(
    (sale) => !sale.cancelledAt && isInRange(sale.createdAt, range),
  );
  const payments = paymentsOf(data.sales).filter((payment) => isInRange(payment.createdAt, range));
  const expenses = data.expenses.filter((expense) => isInRange(expense.createdAt, range));

  const revenue = sum(sales, (sale) => sale.totalAmount);
  const cogs = sum(sales, (sale) => sale.costAmount);
  const grossMargin = revenue - cogs;
  const expensesTotal = sum(expenses, (expense) => expense.amount);
  const netResult = grossMargin - expensesTotal;
  const cashIn = sum(payments, (payment) => payment.amount);

  const paymentBreakdown: PaymentBreakdownItem[] = (['cash', 'mobile_money', 'other'] as PaymentMethod[])
    .map((method) => {
      const methodPayments = payments.filter((payment) => payment.method === method);
      const amount = sum(methodPayments, (payment) => payment.amount);
      return {
        method,
        label: PAYMENT_METHOD_LABELS[method],
        amount,
        count: methodPayments.length,
        share: percent(amount, cashIn),
      };
    })
    .filter((item) => item.amount > 0);

  const series: SeriesPoint[] = [];
  const firstDay = startOfDay(range.start);
  const lastDay = startOfDay(range.end);
  for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
    const key = day.toISOString().slice(0, 10);
    const dayRevenue = sales
      .filter((sale) => sale.createdAt.slice(0, 10) === key)
      .reduce((total, sale) => total + sale.totalAmount, 0);
    const dayCash = payments
      .filter((payment) => payment.createdAt.slice(0, 10) === key)
      .reduce((total, payment) => total + payment.amount, 0);
    series.push({
      date: day.toISOString(),
      label: formatDayShort(day),
      revenue: dayRevenue,
      cashIn: dayCash,
    });
  }

  const lowStock = data.products
    .filter((product) => product.stockQuantity <= product.lowStockThreshold)
    .sort((a, b) => a.stockQuantity - b.stockQuantity);

  const ranking = new Map<string, ProductRanking>();
  for (const sale of sales) {
    for (const line of sale.lines) {
      const current = ranking.get(line.productId) ?? {
        productId: line.productId,
        name: line.productNameSnapshot,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += line.quantity;
      current.revenue += line.lineTotal;
      ranking.set(line.productId, current);
    }
  }

  const previous = comparisonFor(data, previousRange(range));
  const todayStart = startOfDay(now);
  const todayEnd = new Date(now);
  const todayRange: DateRange = {
    key: '7d',
    start: todayStart,
    end: todayEnd,
    label: "Aujourd'hui",
    shortLabel: "Aujourd'hui",
    days: 1,
  };
  const todaySales = data.sales.filter(
    (sale) => !sale.cancelledAt && isInRange(sale.createdAt, todayRange),
  );
  const todayPayments = paymentsOf(data.sales).filter((payment) =>
    isInRange(payment.createdAt, todayRange),
  );
  const todayExpenses = data.expenses.filter((expense) => isInRange(expense.createdAt, todayRange));

  return {
    range,
    revenue,
    cashIn,
    expenses: expensesTotal,
    cogs,
    grossMargin,
    netResult,
    salesCount: sales.length,
    averageSale: sales.length ? Math.round(revenue / sales.length) : 0,
    outstanding: sum(sales, (sale) => sale.balanceDue),
    grossMarginRate: percent(grossMargin, revenue),
    paymentBreakdown,
    series,
    lowStock,
    outOfStock: data.products.filter((product) => product.stockQuantity <= 0).length,
    stockValue: sum(data.products, (product) => product.purchasePrice * product.stockQuantity),
    totalProducts: data.products.length,
    totalUnits: sum(data.products, (product) => product.stockQuantity),
    topProducts: Array.from(ranking.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    previous,
    deltas: {
      revenue: deltaPercent(revenue, previous.revenue),
      cashIn: deltaPercent(cashIn, previous.cashIn),
      netResult: deltaPercent(netResult, previous.netResult),
    },
    today: {
      revenue: sum(todaySales, (sale) => sale.totalAmount),
      cashIn: sum(todayPayments, (payment) => payment.amount),
      expenses: sum(todayExpenses, (expense) => expense.amount),
      salesCount: todaySales.length,
    },
  };
}

/** Solde à recevoir sur toutes les ventes non annulées (indépendant de la période). */
export function totalOutstanding(data: KoraData): number {
  return sum(
    data.sales.filter((sale) => !sale.cancelledAt),
    (sale) => sale.balanceDue,
  );
}

export function totalRevenue(data: KoraData): number {
  return sum(
    data.sales.filter((sale) => !sale.cancelledAt),
    (sale) => sale.totalAmount,
  );
}
