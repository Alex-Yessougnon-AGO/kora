import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon, type IconName } from '../ui/icon';

export interface AccountMenuItem {
  id: string;
  label: string;
  description?: string;
  icon: IconName;
  badge?: string;
  dividerBefore?: boolean;
  danger?: boolean;
}

/**
 * LibraryUI — Dropdown / menu de compte (variante Angular × Tailwind, catégorie Actions).
 * Source : https://libraryui.com/components/tailwind/dropdown-tw
 * Reprise du bouton avatar, du menu role="menu", de la fermeture au clic
 * extérieur / Échap et des badges. Adaptations Kora : initiales au lieu d’une
 * photo distante, items en français, focus géré et palette du thème.
 */
@Component({
  selector: 'app-account-menu',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative inline-flex items-center gap-2">
      <button
        #trigger
        type="button"
        class="account-trigger"
        [attr.aria-label]="'Ouvrir le menu de ' + name()"
        aria-haspopup="menu"
        [attr.aria-expanded]="isOpen()"
        aria-controls="kora-account-menu"
        (click)="toggleMenu()"
      >
        <span class="account-avatar" aria-hidden="true">{{ initials() }}</span>
        <span class="account-meta">
          <span class="account-name">{{ name() }}</span>
          <span class="account-role">{{ role() }}</span>
        </span>
        <app-icon name="chevron-down" [size]="14" class="account-chevron" [class.is-open]="isOpen()" />
      </button>

      @if (isOpen()) {
        <div
          id="kora-account-menu"
          class="absolute right-0 top-full z-30 mt-3 w-72 overflow-hidden rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5"
          role="menu"
          aria-label="Menu du compte"
        >
          <div class="px-3 py-2 border-b border-gray-100 mb-1">
            <p class="text-[0.8rem] font-semibold text-gray-900">{{ shopName() }}</p>
            <p class="text-[0.72rem] text-gray-500">Données enregistrées sur cet appareil</p>
          </div>

          @for (item of menuItems(); track item.id) {
            @if (item.dividerBefore) {
              <div class="my-2 border-t border-gray-100"></div>
            }
            <button
              type="button"
              role="menuitem"
              class="account-item"
              [class.account-item--danger]="item.danger"
              [class.account-item--active]="activeId() === item.id"
              (click)="selectItem(item)"
            >
              <span class="account-item__icon" aria-hidden="true">
                <app-icon [name]="item.icon" [size]="17" />
              </span>
              <span class="flex-1 min-w-0">
                <span class="block truncate text-sm">{{ item.label }}</span>
                @if (item.description) {
                  <span class="block truncate text-[0.7rem] text-gray-500">{{ item.description }}</span>
                }
              </span>
              @if (item.badge) {
                <span class="account-badge">{{ item.badge }}</span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .account-trigger {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        padding: 0.3rem 0.45rem 0.3rem 0.35rem;
        border: 1px solid transparent;
        border-radius: 999px;
        background: transparent;
        min-height: 44px;
        transition: background-color 0.15s ease;
      }

      .account-trigger:hover {
        background: #f0f1eb;
      }

      .account-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #133d32;
        color: #f7f7f2;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        flex: none;
      }

      .account-meta {
        display: none;
        flex-direction: column;
        align-items: flex-start;
        line-height: 1.15;
      }

      .account-name {
        font-size: 0.8rem;
        font-weight: 600;
        color: #202724;
      }

      .account-role {
        font-size: 0.6875rem;
        color: #68716c;
      }

      .account-chevron {
        color: #68716c;
        transition: transform 0.18s ease;
      }

      .account-chevron.is-open {
        transform: rotate(180deg);
      }

      .account-item {
        display: flex;
        width: 100%;
        align-items: center;
        gap: 0.7rem;
        border: 0;
        border-radius: 10px;
        background: transparent;
        padding: 0.55rem 0.65rem;
        text-align: left;
        color: #3a423e;
        transition: background-color 0.12s ease;
      }

      .account-item:hover,
      .account-item--active {
        background: #f4f5f0;
        color: #202724;
      }

      .account-item--danger {
        color: #9c3a25;
      }

      .account-item--danger:hover {
        background: #fbedE9;
        color: #7f2e1d;
      }

      .account-item__icon {
        display: inline-flex;
        width: 28px;
        height: 28px;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        background: #f0f1eb;
        color: #16794b;
        flex: none;
      }

      .account-item--danger .account-item__icon {
        background: #fbedE9;
        color: #9c3a25;
      }

      .account-badge {
        flex: none;
        border-radius: 999px;
        background: #fbf1df;
        color: #8c601f;
        padding: 0.1rem 0.4rem;
        font-size: 0.625rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      @media (min-width: 900px) {
        .account-meta {
          display: flex;
        }
      }

      @media (max-width: 420px) {
        .account-trigger {
          padding-right: 0.3rem;
        }
      }
    `,
  ],
})
export class AccountMenu {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  readonly name = input.required<string>();
  readonly initials = input.required<string>();
  readonly role = input('Gérante');
  readonly shopName = input('Boutique');
  readonly menuItems = input<AccountMenuItem[]>([
    { id: 'settings', label: 'Paramètres de la boutique', icon: 'settings' },
    { id: 'help', label: 'Centre d’aide', icon: 'help' },
    { id: 'data', label: 'Données locales', icon: 'database', badge: 'Démo' },
    { id: 'reset', label: 'Réinitialiser la démo', icon: 'refresh', dividerBefore: true, danger: true },
  ]);

  readonly action = output<string>();

  protected readonly isOpen = signal(false);
  protected readonly activeId = signal('');

  @HostListener('document:click', ['$event.target'])
  protected onDocumentClick(target: EventTarget | null): void {
    if (this.isOpen() && target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.trigger()?.nativeElement.focus();
  }

  protected toggleMenu(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      setTimeout(() => {
        const first = this.elementRef.nativeElement.querySelector('[role="menuitem"]') as HTMLElement | null;
        first?.focus();
      });
    }
  }

  protected selectItem(item: AccountMenuItem): void {
    this.activeId.set(item.id);
    this.isOpen.set(false);
    this.action.emit(item.id);
  }
}
