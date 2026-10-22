import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

/**
 * LibraryUI — Breadcrumb (variante Angular × Tailwind, catégorie Navigation).
 * Source : https://libraryui.com/components/tailwind/breadcrumb-tw
 * Structure et séparateurs conservés ; navigation réelle via RouterLink et
 * palette Kora appliquée (thème global Tailwind).
 */
@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex py-1 font-sans" aria-label="Fil d’Ariane">
      <ol class="flex items-center flex-wrap gap-2 list-none p-0 m-0">
        @for (item of items(); track $index; let last = $last) {
          <li class="flex items-center gap-2">
            @if (last || !item.path) {
              <span
                class="text-[0.75rem] font-semibold text-gray-900"
                [attr.aria-current]="last ? 'page' : null"
              >
                {{ item.label }}
              </span>
            } @else {
              <a
                [routerLink]="item.path"
                class="text-[0.75rem] font-medium text-gray-400 no-underline hover:text-indigo-600 transition-colors"
              >
                {{ item.label }}
              </a>
            }
            @if (!last) {
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                fill="currentColor"
                class="text-gray-300"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
                />
              </svg>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class Breadcrumb {
  readonly items = input.required<BreadcrumbItem[]>();
}
