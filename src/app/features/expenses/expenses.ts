import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { addDays, formatDateShort, startOfDay, todayInputValue } from '../../core/dates';
import { formatXof, percent, toXof } from '../../core/money';
import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
  type ExpenseDraft,
} from '../../core/models';
import { StoreService } from '../../core/store';
import { datedFilename, downloadTextFile } from '../../shared/download';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { ToastService } from '../../shared/ui/toast';

type ExpensePeriod = '30d' | '90d' | 'all';

interface ExpenseErrors {
  label?: string;
  amount?: string;
  date?: string;
}

@Component({
  selector: 'app-expenses',
  imports: [FormsModule, PageHeader, Icon, EmptyState, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './expenses.html',
  styleUrl: './expenses.scss',
})
export class ExpensesPage {
  private readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);

  protected readonly expenses = this.store.expenses;
  protected readonly categories = EXPENSE_CATEGORIES;
  protected readonly today = todayInputValue();
  protected readonly formatXof = formatXof;
  protected readonly formatDateShort = formatDateShort;

  protected readonly period = signal<ExpensePeriod>('30d');
  protected readonly categoryFilter = signal<'all' | ExpenseCategory>('all');
  protected readonly search = signal('');
  protected readonly errors = signal<ExpenseErrors>({});
  protected readonly deleteOpen = signal(false);
  protected readonly deleteTarget = signal<Expense | null>(null);

  protected draft: ExpenseDraft = {
    label: '',
    category: 'Fournitures',
    amount: 0,
    date: this.today,
    note: '',
  };

  protected readonly filteredExpenses = computed(() => {
    const now = new Date();
    const period = this.period();
    const start =
      period === 'all'
        ? null
        : startOfDay(addDays(now, -(period === '30d' ? 29 : 89))).getTime();
    const query = this.search().trim().toLowerCase();
    const category = this.categoryFilter();

    return this.expenses().filter((expense) => {
      if (start !== null && new Date(expense.createdAt).getTime() < start) return false;
      if (category !== 'all' && expense.category !== category) return false;
      if (!query) return true;
      return [expense.label, expense.category, expense.note]
        .filter(Boolean)
        .some((value) => `${value}`.toLowerCase().includes(query));
    });
  });

  protected readonly filteredTotal = computed(() =>
    this.filteredExpenses().reduce((total, expense) => total + expense.amount, 0),
  );

  protected readonly monthTotal = computed(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return this.expenses()
      .filter((expense) => new Date(expense.createdAt).getTime() >= start)
      .reduce((total, expense) => total + expense.amount, 0);
  });

  protected readonly averageExpense = computed(() =>
    this.filteredExpenses().length
      ? Math.round(this.filteredTotal() / this.filteredExpenses().length)
      : 0,
  );

  protected readonly topCategory = computed(() => {
    const map = new Map<string, number>();
    for (const expense of this.filteredExpenses()) {
      map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount);
    }
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0] ?? null;
  });

  protected readonly topCategoryName = computed(() => this.topCategory()?.[0] ?? '—');
  protected readonly topCategoryAmount = computed(() => this.topCategory()?.[1] ?? 0);

  protected readonly categoryBreakdown = computed(() => {
    const map = new Map<string, number>();
    for (const expense of this.filteredExpenses()) {
      map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount);
    }
    const total = this.filteredTotal();
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount, share: percent(amount, total) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  });

  protected readonly categoryOptions = computed(() => {
    const values = Array.from(new Set(this.expenses().map((expense) => expense.category))).sort((a, b) =>
      a.localeCompare(b, 'fr'),
    );
    return values;
  });

  protected readonly hasFilters = computed(
    () => this.search().length > 0 || this.categoryFilter() !== 'all' || this.period() !== '30d',
  );

  protected setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.search.set('');
    this.categoryFilter.set('all');
    this.period.set('30d');
  }

  protected addExpense(): void {
    const errors: ExpenseErrors = {};
    if (!this.draft.label.trim()) errors.label = 'Le libellé est obligatoire.';
    if (!Number.isFinite(this.draft.amount) || this.draft.amount <= 0) {
      errors.amount = 'Le montant doit être supérieur à zéro.';
    }
    if (!this.draft.date) errors.date = 'La date est obligatoire.';
    this.errors.set(errors);
    if (Object.keys(errors).length) return;

    try {
      this.store.addExpense({
        label: this.draft.label.trim(),
        category: this.draft.category,
        amount: toXof(this.draft.amount),
        date: this.draft.date,
        note: this.draft.note,
      });
      this.toast.success(`Dépense « ${this.draft.label.trim()} » enregistrée.`);
      this.draft = {
        label: '',
        category: this.draft.category,
        amount: 0,
        date: todayInputValue(),
        note: '',
      };
      this.errors.set({});
    } catch {
      this.toast.error('La dépense n’a pas pu être enregistrée.');
    }
  }

  protected askDelete(expense: Expense): void {
    this.deleteTarget.set(expense);
    this.deleteOpen.set(true);
  }

  protected confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.store.deleteExpense(target.id);
    this.deleteOpen.set(false);
    this.toast.success(`Dépense « ${target.label} » supprimée.`);
    this.deleteTarget.set(null);
  }

  protected exportCsv(): void {
    downloadTextFile(datedFilename('kora-depenses'), this.store.expensesCsv());
    this.toast.info('Export CSV des dépenses généré.', 'Export prêt');
  }
}
