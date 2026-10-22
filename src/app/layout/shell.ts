import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { formatDateLong } from '../core/dates';
import { StoreService } from '../core/store';
import { AccountMenu } from '../shared/libraryui/account-menu';
import { ConfirmDialog } from '../shared/ui/confirm-dialog';
import { Icon, type IconName } from '../shared/ui/icon';
import { ToastService } from '../shared/ui/toast';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  exact?: boolean;
  badge?: 'lowStock';
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, AccountMenu, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly router = inject(Router);
  private readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly shop = this.store.shop;
  protected readonly drawerOpen = signal(false);
  protected readonly resetOpen = signal(false);
  protected readonly currentUrl = signal(this.router.url);
  protected readonly today = formatDateLong(new Date());
  protected readonly initials = computed(() =>
    this.shop()
      .owner.split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join(''),
  );
  protected readonly lowStockCount = computed(
    () => this.store.products().filter((product) => product.stockQuantity <= product.lowStockThreshold).length,
  );
  protected readonly pageTitle = computed(() => {
    const url = this.currentUrl().split('?')[0];
    if (url.startsWith('/vente')) return 'Nouvelle vente';
    if (url.startsWith('/produits')) return 'Produits & stock';
    if (url.startsWith('/depenses')) return 'Dépenses';
    if (url.startsWith('/transactions')) return 'Transactions';
    if (url.startsWith('/aide')) return 'Centre d’aide';
    if (url.startsWith('/parametres')) return 'Paramètres';
    return 'Tableau de bord';
  });

  protected readonly navItems: { group: string; items: NavItem[] }[] = [
    {
      group: 'Pilotage',
      items: [
        { label: 'Tableau de bord', path: '/tableau-de-bord', icon: 'dashboard', exact: true },
        { label: 'Nouvelle vente', path: '/vente', icon: 'cart' },
      ],
    },
    {
      group: 'Gestion',
      items: [
        { label: 'Produits & stock', path: '/produits', icon: 'box', badge: 'lowStock' },
        { label: 'Dépenses', path: '/depenses', icon: 'wallet' },
      ],
    },
    {
      group: 'Suivi',
      items: [
        { label: 'Transactions', path: '/transactions', icon: 'receipt' },
        { label: 'Centre d’aide', path: '/aide', icon: 'help' },
      ],
    },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.closeDrawer();
      });
  }

  protected openDrawer(): void {
    this.drawerOpen.set(true);
    document.documentElement.style.overflow = 'hidden';
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
    document.documentElement.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.drawerOpen()) this.closeDrawer();
  }

  protected handleAccountAction(action: string): void {
    switch (action) {
      case 'settings':
        void this.router.navigate(['/parametres']);
        break;
      case 'help':
        void this.router.navigate(['/aide']);
        break;
      case 'data':
        void this.router.navigate(['/parametres'], { fragment: 'donnees' });
        break;
      case 'reset':
        this.resetOpen.set(true);
        break;
    }
  }

  protected confirmReset(): void {
    this.store.resetDemo();
    this.resetOpen.set(false);
    this.toast.success('Le jeu de démonstration a été rechargé sur cet appareil.');
  }
}
