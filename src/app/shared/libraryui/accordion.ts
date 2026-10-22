import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Icon, type IconName } from '../ui/icon';

export interface AccordionItem {
  question: string;
  answer: string;
}

export interface AccordionCategory {
  label: string;
  icon: IconName;
  items: AccordionItem[];
}

/**
 * LibraryUI — Accordion (variante Angular × Tailwind, catégorie Autres).
 * Source : https://libraryui.com/components/tailwind/accordion-tw
 * Reprise des catégories dépliables, des questions/réponses et des chevrons.
 * Adaptations Kora : icônes intégrées, aria-expanded/aria-controls, contenu
 * en français et palette du thème.
 */
@Component({
  selector: 'app-lui-accordion',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3">
      @for (category of categories(); track category.label; let ci = $index) {
        <section class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <button
            type="button"
            class="w-full flex justify-between items-center px-5 py-4 bg-gray-50 hover:bg-gray-100 border-0 cursor-pointer transition-colors text-left"
            [attr.aria-expanded]="isCategoryOpen(ci)"
            [attr.aria-controls]="'acc-cat-' + ci"
            (click)="toggleCat(ci)"
          >
            <span class="flex items-center gap-3.5">
              <span class="w-9 h-9 bg-indigo-50 rounded-[0.625rem] flex items-center justify-center text-indigo-600">
                <app-icon [name]="category.icon" [size]="18" />
              </span>
              <span class="text-[0.95rem] font-bold text-gray-900">{{ category.label }}</span>
            </span>
            <span class="text-gray-400" aria-hidden="true">
              <app-icon [name]="isCategoryOpen(ci) ? 'chevron-up' : 'chevron-down'" [size]="16" />
            </span>
          </button>

          @if (isCategoryOpen(ci)) {
            <div class="px-5 pt-1 pb-3" [id]="'acc-cat-' + ci">
              @for (item of category.items; track item.question; let ii = $index) {
                <div class="border-b border-gray-100 last:border-b-0">
                  <button
                    type="button"
                    class="w-full flex justify-between items-center py-3.5 bg-transparent border-0 cursor-pointer text-[0.875rem] font-semibold text-gray-700 text-left gap-4"
                    [attr.aria-expanded]="isItemOpen(ci, ii)"
                    [attr.aria-controls]="'acc-item-' + ci + '-' + ii"
                    (click)="toggleItem(ci, ii)"
                  >
                    <span>{{ item.question }}</span>
                    <span
                      class="text-indigo-600 text-[0.8rem] shrink-0 transition-transform duration-200"
                      [style.transform]="isItemOpen(ci, ii) ? 'rotate(90deg)' : 'rotate(0deg)'"
                      aria-hidden="true"
                    >
                      <app-icon name="chevron-right" [size]="14" />
                    </span>
                  </button>

                  @if (isItemOpen(ci, ii)) {
                    <div class="pb-3.5" [id]="'acc-item-' + ci + '-' + ii">
                      <p class="m-0 text-[0.82rem] text-gray-500 leading-[1.8]">{{ item.answer }}</p>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      button:focus-visible {
        outline-offset: -2px;
      }
    `,
  ],
})
export class Accordion {
  readonly categories = input.required<AccordionCategory[]>();

  private readonly categoryState = signal<Record<number, boolean>>({});
  private readonly itemState = signal<Record<string, boolean>>({});

  protected isCategoryOpen(index: number): boolean {
    const state = this.categoryState();
    return state[index] ?? index === 0;
  }

  protected toggleCat(index: number): void {
    const next = !this.isCategoryOpen(index);
    this.categoryState.update((state) => ({ ...state, [index]: next }));
  }

  protected toggleItem(cat: number, item: number): void {
    const key = `${cat}-${item}`;
    this.itemState.update((state) => ({ ...state, [key]: !state[key] }));
  }

  protected isItemOpen(cat: number, item: number): boolean {
    return Boolean(this.itemState()[`${cat}-${item}`]);
  }
}
