import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { formatDateShort } from '../../core/dates';
import { formatXof } from '../../core/money';
import { Icon } from '../ui/icon';

export interface DataTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  sortKey?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  type?: 'text' | 'muted' | 'number' | 'date' | 'currency' | 'badge' | 'progress' | 'actions';
  badgeColors?: Record<string, string>;
  actions?: ('view' | 'edit' | 'delete')[];
  progressMax?: number;
}

export interface DataTableRow {
  id: string;
  [key: string]: unknown;
}

export interface DataTableFilter {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  value?: string;
}

export interface DataTableActionEvent {
  action: 'view' | 'edit' | 'delete';
  row: DataTableRow;
}

/**
 * LibraryUI — Data table (variante Angular × Tailwind, catégorie Data).
 * Source : https://libraryui.com/components/tailwind/data-table-tw
 * Reprise de la toolbar (recherche + filtres), du tri, de la pagination et des
 * états vides. Adaptations Kora : colonnes typées, montants XOF, actions en
 * sorties, sélection multiple retirée (aucune action groupée dans Kora) et
 * palette du thème.
 */
@Component({
  selector: 'app-lui-data-table',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lui-table">
      <!-- TOOLBAR -->
      <div class="flex items-center flex-wrap gap-3 px-4 py-3.5 border-b border-gray-200 bg-white">
        <div
          class="flex items-center flex-1 min-w-56 max-w-90 px-3.5 py-2.5 bg-gray-50 border-2 border-transparent rounded-lg transition-all focus-within:bg-white focus-within:border-indigo-600 focus-within:shadow-[0_0_0_3px_rgba(22,121,75,0.1)]"
        >
          <app-icon name="search" [size]="16" class="text-gray-400 shrink-0 mr-2.5" />
          <label class="sr-only" [for]="searchId">{{ searchLabel() }}</label>
          <input
            [id]="searchId"
            type="search"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            [placeholder]="searchPlaceholder()"
            class="flex-1 border-none bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none font-[inherit] min-w-0"
          />
          @if (searchQuery()) {
            <button
              type="button"
              class="p-1 bg-transparent border-none text-gray-400 cursor-pointer rounded hover:text-gray-700 hover:bg-gray-200 transition-colors"
              (click)="clearSearch()"
              aria-label="Effacer la recherche"
            >
              <app-icon name="x" [size]="14" [strokeWidth]="2.4" />
            </button>
          }
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          @for (filter of filters(); track filter.key) {
            <label class="sr-only" [for]="'lui-filter-' + filter.key">{{ filter.label }}</label>
            <select
              [id]="'lui-filter-' + filter.key"
              [value]="filterValue(filter.key)"
              (change)="onFilterChange(filter.key, $event)"
              class="dt-filter-select px-3.5 py-2.5 bg-gray-50 border-2 border-transparent rounded-lg text-sm text-gray-700 cursor-pointer outline-none focus:bg-white focus:border-indigo-600 transition-colors font-[inherit]"
            >
              @for (option of filter.options; track option.value) {
                <option [value]="option.value" [selected]="option.value === filterValue(filter.key)">
                  {{ option.label }}
                </option>
              }
            </select>
          }

          @if (searchQuery() || hasActiveFilters()) {
            <button
              type="button"
              class="flex items-center gap-1.5 px-2.5 py-2 bg-transparent border-none text-gray-500 text-[0.8rem] cursor-pointer rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors font-[inherit]"
              (click)="clearFilters()"
            >
              <app-icon name="x" [size]="14" />
              Effacer
            </button>
          }
        </div>
      </div>

      <!-- TABLE -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-[0.875rem] min-w-[820px]">
          <caption class="sr-only">{{ caption() }}</caption>
          <thead class="bg-linear-to-br from-slate-50 to-slate-100">
            <tr>
              @for (col of columns(); track col.key) {
                <th
                  scope="col"
                  class="px-4 py-3.5 font-semibold text-gray-700 text-[0.6875rem] uppercase tracking-wider border-b border-gray-200 whitespace-nowrap select-none"
                  [style.width]="col.width"
                  [style.text-align]="col.align || 'left'"
                  [attr.aria-sort]="ariaSort(col)"
                >
                  @if (col.sortable) {
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 bg-transparent border-0 p-0 font-semibold uppercase tracking-wider text-[0.6875rem] text-gray-700 cursor-pointer hover:text-indigo-700"
                      [style.justify-content]="
                        col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start'
                      "
                      [style.width]="'100%'"
                      (click)="sortBy(col)"
                    >
                      <span>{{ col.label }}</span>
                      <span class="text-gray-400" aria-hidden="true">
                        @if (getSortState(col) === 'none') {
                          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="7 10 12 5 17 10" />
                            <polyline points="7 14 12 19 17 14" />
                          </svg>
                        }
                        @if (getSortState(col) === 'asc') {
                          <svg class="w-3 h-3 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        }
                        @if (getSortState(col) === 'desc') {
                          <svg class="w-3 h-3 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        }
                      </span>
                    </button>
                  } @else {
                    {{ col.label }}
                  }
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of displayedRows(); track row.id) {
              <tr class="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                @for (col of columns(); track col.key) {
                  <td class="px-4 py-3.5 text-gray-700 align-middle" [style.text-align]="col.align || 'left'">
                    @switch (col.type) {
                      @case ('currency') {
                        <span class="font-semibold text-gray-900 kora-num">{{ formatCurrency(asNumber(row, col)) }}</span>
                      }
                      @case ('date') {
                        <span class="whitespace-nowrap">{{ formatDateValue(row, col) }}</span>
                      }
                      @case ('badge') {
                        <span [class]="badgeClass(col, row)">
                          {{ row[col.key] }}
                        </span>
                      }
                      @case ('progress') {
                        <div class="flex items-center gap-3 min-w-24">
                          <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              class="dt-progress-fill"
                              [style.width.%]="progressValue(row, col)"
                              [style.background]="progressColor(row, col)"
                            ></div>
                          </div>
                          <span class="text-[0.8rem] font-semibold text-gray-500 min-w-7.5 kora-num">
                            {{ row[col.key] }}
                          </span>
                        </div>
                      }
                      @case ('actions') {
                        <div class="flex items-center justify-center gap-1">
                          @if (hasAction(col, 'view')) {
                            <button
                              type="button"
                              class="p-1.5 bg-transparent border-0 text-gray-400 cursor-pointer rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors"
                              title="Voir le détail"
                              [attr.aria-label]="'Voir le détail de ' + row['reference']"
                              (click)="emitAction('view', row)"
                            >
                              <app-icon name="eye" [size]="16" />
                            </button>
                          }
                          @if (hasAction(col, 'edit')) {
                            <button
                              type="button"
                              class="p-1.5 bg-transparent border-0 text-gray-400 cursor-pointer rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors"
                              title="Modifier"
                              aria-label="Modifier la ligne"
                              (click)="emitAction('edit', row)"
                            >
                              <app-icon name="edit" [size]="16" />
                            </button>
                          }
                          @if (hasAction(col, 'delete')) {
                            <button
                              type="button"
                              class="p-1.5 bg-transparent border-0 text-gray-400 cursor-pointer rounded-md hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="Supprimer"
                              aria-label="Supprimer la ligne"
                              (click)="emitAction('delete', row)"
                            >
                              <app-icon name="trash" [size]="16" />
                            </button>
                          }
                        </div>
                      }
                      @case ('muted') {
                        <span class="text-gray-500">{{ row[col.key] ?? '—' }}</span>
                      }
                      @default {
                        {{ row[col.key] ?? '—' }}
                      }
                    }
                  </td>
                }
              </tr>
            }

            @if (displayedRows().length === 0) {
              <tr>
                <td [attr.colspan]="columns().length" class="text-center py-12">
                  <div class="flex flex-col items-center gap-3">
                    <span class="flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-50 text-gray-300">
                      <app-icon name="search" [size]="22" />
                    </span>
                    <p class="text-gray-500 m-0">{{ emptyMessage() }}</p>
                    @if (searchQuery() || hasActiveFilters()) {
                      <button
                        type="button"
                        class="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-700 cursor-pointer hover:border-indigo-600 hover:text-indigo-700 transition-all font-[inherit]"
                        (click)="clearFilters()"
                      >
                        Réinitialiser les filtres
                      </button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- PAGINATION -->
      @if (totalItems() > 0) {
        <div
          class="flex items-center justify-between flex-wrap gap-4 px-4 py-3.5 border-t border-gray-200 bg-white max-md:flex-col max-md:items-stretch"
        >
          <div class="text-sm text-gray-500">
            Affichage de <strong class="text-gray-900">{{ getStartIndex() }}</strong>
            à <strong class="text-gray-900">{{ getEndIndex() }}</strong>
            sur <strong class="text-gray-900">{{ totalItems() }}</strong> résultats
          </div>

          <div class="flex items-center gap-4 flex-wrap max-md:flex-col max-md:items-stretch max-md:gap-3">
            <div class="flex items-center gap-2">
              <label class="text-[0.8rem] text-gray-500 shrink-0" [for]="pageSizeId">Lignes par page :</label>
              <select
                [id]="pageSizeId"
                [value]="pageSize()"
                (change)="onPageSizeChange($event)"
                class="dt-page-select px-3 py-1.5 border border-gray-200 rounded-md text-[0.8rem] text-gray-700 cursor-pointer outline-none focus:border-indigo-600 font-[inherit]"
              >
                @for (size of pageSizeOptions(); track size) {
                  <option [value]="size" [selected]="size === pageSize()">{{ size }}</option>
                }
              </select>
            </div>

            <nav class="flex items-center gap-1 max-md:justify-center" aria-label="Pagination">
              <button
                type="button"
                class="lui-page-btn"
                [disabled]="currentPage() === 1"
                (click)="goToPage(1)"
                aria-label="Première page"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
              <button
                type="button"
                class="lui-page-btn"
                [disabled]="currentPage() === 1"
                (click)="goToPage(currentPage() - 1)"
                aria-label="Page précédente"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              @for (page of pageNumbers(); track page) {
                <button
                  type="button"
                  class="lui-page-btn"
                  [class.lui-page-btn--active]="page === currentPage()"
                  [attr.aria-current]="page === currentPage() ? 'page' : null"
                  (click)="goToPage(page)"
                >
                  {{ page }}
                </button>
              }

              <button
                type="button"
                class="lui-page-btn"
                [disabled]="currentPage() === totalPages()"
                (click)="goToPage(currentPage() + 1)"
                aria-label="Page suivante"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button
                type="button"
                class="lui-page-btn"
                [disabled]="currentPage() === totalPages()"
                (click)="goToPage(totalPages())"
                aria-label="Dernière page"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .lui-table {
        background: #ffffff;
        border: 1px solid #e3e7e2;
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 1px 2px rgba(19, 61, 50, 0.04);
      }

      .dt-filter-select {
        appearance: none;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2368716c' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
        background-position: right 0.55rem center;
        background-repeat: no-repeat;
        background-size: 1.1em 1.1em;
        padding-right: 2rem;
      }

      .dt-page-select {
        appearance: none;
        padding-right: 1.75rem;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2368716c' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
        background-position: right 0.35rem center;
        background-repeat: no-repeat;
        background-size: 1em 1em;
      }

      .dt-progress-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
      }

      .lui-page-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
        padding: 0 0.5rem;
        border: 1px solid #e3e7e2;
        border-radius: 7px;
        background: #ffffff;
        color: #3a423e;
        font-size: 0.8125rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .lui-page-btn:hover:not(:disabled) {
        border-color: #16794b;
        color: #12603c;
      }

      .lui-page-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .lui-page-btn--active {
        background: #133d32;
        border-color: #133d32;
        color: #ffffff;
      }

      .lui-page-btn--active:hover:not(:disabled) {
        background: #133d32;
        border-color: #133d32;
        color: #ffffff;
      }

      .lui-badge--primary {
        background: #eef4ef;
        color: #12603c;
      }

      .lui-badge--success {
        background: #e5f3e8;
        color: #12603c;
      }

      .lui-badge--warning {
        background: #fbf3e4;
        color: #7a5316;
      }

      .lui-badge--danger {
        background: #fbedE9;
        color: #9c3a25;
      }

      .lui-badge--secondary {
        background: #f0f1eb;
        color: #68716c;
      }
    `,
  ],
})
export class LuiDataTable {
  readonly columns = input.required<DataTableColumn[]>();
  readonly rows = input.required<DataTableRow[]>();
  readonly filters = input<DataTableFilter[]>([]);
  readonly searchKeys = input<string[]>(['reference']);
  readonly searchPlaceholder = input('Rechercher…');
  readonly searchLabel = input('Rechercher dans le tableau');
  readonly caption = input('Tableau de données');
  readonly emptyMessage = input('Aucun résultat trouvé.');
  readonly pageSizeOptions = input<number[]>([5, 10, 25, 50]);
  readonly initialPageSize = input(5);
  readonly action = output<DataTableActionEvent>();

  protected readonly searchId = `lui-search-${Math.random().toString(36).slice(2, 8)}`;
  protected readonly pageSizeId = `lui-page-size-${Math.random().toString(36).slice(2, 8)}`;

  protected readonly searchQuery = signal('');
  protected readonly filterSelections = signal<Record<string, string>>({});
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(5);
  private readonly sortColumn = signal('');
  private readonly sortDirection = signal<'asc' | 'desc'>('asc');

  protected readonly filteredRows = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const keys = this.searchKeys();
    const selections = this.filterSelections();
    let result = [...this.rows()];

    if (query) {
      result = result.filter((row) =>
        keys.some((key) => `${row[key] ?? ''}`.toLowerCase().includes(query)),
      );
    }

    for (const filter of this.filters()) {
      const value = selections[filter.key] ?? filter.value ?? '';
      if (value) {
        result = result.filter((row) => `${row[filter.key] ?? ''}` === value);
      }
    }

    const columnKey = this.sortColumn();
    if (columnKey) {
      const column = this.columns().find((item) => item.key === columnKey);
      const key = column?.sortKey ?? columnKey;
      const direction = this.sortDirection() === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        const va = a[key];
        const vb = b[key];
        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * direction;
        const da = new Date(`${va}`);
        const db = new Date(`${vb}`);
        if (!Number.isNaN(da.getTime()) && !Number.isNaN(db.getTime()) && `${va}`.includes('-')) {
          return (da.getTime() - db.getTime()) * direction;
        }
        return `${va}`.localeCompare(`${vb}`, 'fr', { numeric: true }) * direction;
      });
    }

    return result;
  });

  protected readonly totalItems = computed(() => this.filteredRows().length);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));

  protected readonly displayedRows = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize();
    return this.filteredRows().slice(start, start + this.pageSize());
  });

  constructor() {
    effect(() => {
      this.pageSize.set(this.initialPageSize());
      this.currentPage.set(1);
    });
  }

  protected readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = Math.min(this.currentPage(), total);
    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);
    if (end - start < 4) {
      if (start === 1) end = Math.min(total, start + 4);
      else start = Math.max(1, end - 4);
    }
    const pages: number[] = [];
    for (let index = start; index <= end; index += 1) pages.push(index);
    return pages;
  });

  protected filterValue(key: string): string {
    const explicit = this.filterSelections()[key];
    if (explicit !== undefined) return explicit;
    return this.filters().find((filter) => filter.key === key)?.value ?? '';
  }

  protected hasActiveFilters(): boolean {
    return this.filters().some((filter) => this.filterValue(filter.key) !== '');
  }

  protected onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  protected onFilterChange(key: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterSelections.update((current) => ({ ...current, [key]: value }));
    this.currentPage.set(1);
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.filterSelections.set({});
    this.currentPage.set(1);
  }

  protected sortBy(column: DataTableColumn): void {
    if (!column.sortable) return;
    if (this.sortColumn() === column.key) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column.key);
      this.sortDirection.set('asc');
    }
  }

  protected getSortState(column: DataTableColumn): 'none' | 'asc' | 'desc' {
    if (!column.sortable || this.sortColumn() !== column.key) return 'none';
    return this.sortDirection();
  }

  protected ariaSort(column: DataTableColumn): 'ascending' | 'descending' | 'none' | null {
    const state = this.getSortState(column);
    if (state === 'asc') return 'ascending';
    if (state === 'desc') return 'descending';
    return column.sortable ? 'none' : null;
  }

  protected onPageSizeChange(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.currentPage.set(1);
  }

  protected goToPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  protected getStartIndex(): number {
    if (!this.totalItems()) return 0;
    return (Math.min(this.currentPage(), this.totalPages()) - 1) * this.pageSize() + 1;
  }

  protected getEndIndex(): number {
    const page = Math.min(this.currentPage(), this.totalPages());
    return Math.min(page * this.pageSize(), this.totalItems());
  }

  protected formatCurrency(value: number): string {
    return formatXof(value);
  }

  protected asNumber(row: DataTableRow, column: DataTableColumn): number {
    const value = row[column.key];
    return typeof value === 'number' ? value : Number(value) || 0;
  }

  protected formatDateValue(row: DataTableRow, column: DataTableColumn): string {
    const value = row[column.key];
    return typeof value === 'string' ? formatDateShort(value) : '—';
  }

  protected badgeClass(column: DataTableColumn, row: DataTableRow): string {
    const value = `${row[column.key] ?? ''}`;
    const tone = column.badgeColors?.[value] ?? 'secondary';
    return `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.7rem] font-semibold lui-badge--${tone}`;
  }

  protected progressValue(row: DataTableRow, column: DataTableColumn): number {
    const value = this.asNumber(row, column);
    const max = column.progressMax ?? Math.max(100, value);
    return Math.min(100, Math.max(0, (value / max) * 100));
  }

  protected progressColor(row: DataTableRow, column: DataTableColumn): string {
    const value = this.asNumber(row, column);
    if (value <= 0) return '#b4472f';
    if (value <= 10) return '#a9762a';
    return '#16794b';
  }

  protected hasAction(column: DataTableColumn, action: 'view' | 'edit' | 'delete'): boolean {
    return column.actions?.includes(action) ?? false;
  }

  protected emitAction(action: 'view' | 'edit' | 'delete', row: DataTableRow): void {
    this.action.emit({ action, row });
  }
}
