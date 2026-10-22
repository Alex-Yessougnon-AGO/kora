import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { formatDateTime } from '../../core/dates';
import { formatXof } from '../../core/money';
import { totalRevenue } from '../../core/metrics';
import { StoreService } from '../../core/store';
import { datedFilename, downloadTextFile } from '../../shared/download';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { Icon } from '../../shared/ui/icon';
import { PageHeader } from '../../shared/ui/page-header';
import { ToastService } from '../../shared/ui/toast';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, RouterLink, PageHeader, Icon, ConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsPage {
  private readonly store = inject(StoreService);
  private readonly toast = inject(ToastService);

  protected readonly data = this.store.data;
  protected readonly notice = this.store.notice;
  protected readonly lastSavedAt = this.store.lastSavedAt;
  protected readonly resetOpen = signal(false);
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatXof = formatXof;

  protected shopDraft = { ...this.store.shop() };
  protected readonly nameError = signal('');

  protected readonly revenueAllTime = computed(() => totalRevenue(this.data()));
  protected readonly lastSavedLabel = computed(() => {
    const saved = this.lastSavedAt();
    return saved
      ? `Dernière écriture : ${formatDateTime(saved)} · Schéma v${this.data().schemaVersion}`
      : `Données chargées depuis la démonstration locale · Schéma v${this.data().schemaVersion}`;
  });
  protected readonly outstanding = this.store.outstanding;
  protected readonly counts = computed(() => ({
    products: this.data().products.length,
    sales: this.data().sales.length,
    expenses: this.data().expenses.length,
    movements: this.data().movements.length,
  }));

  protected saveShop(): void {
    if (!this.shopDraft.name.trim()) {
      this.nameError.set('Le nom de la boutique est obligatoire.');
      return;
    }
    this.nameError.set('');
    this.store.updateShop(this.shopDraft);
    this.shopDraft = { ...this.store.shop() };
    this.toast.success('Les informations de la boutique ont été mises à jour.');
  }

  protected exportSales(): void {
    downloadTextFile(datedFilename('kora-ventes'), this.store.salesCsv());
    this.toast.info('Export CSV des ventes généré.', 'Export prêt');
  }

  protected exportExpenses(): void {
    downloadTextFile(datedFilename('kora-depenses'), this.store.expensesCsv());
    this.toast.info('Export CSV des dépenses généré.', 'Export prêt');
  }

  protected exportBackup(): void {
    downloadTextFile(
      datedFilename('kora-sauvegarde', 'json'),
      JSON.stringify(this.data(), null, 2),
      'application/json;charset=utf-8',
    );
    this.toast.info('Sauvegarde JSON générée sur cet appareil.', 'Sauvegarde prête');
  }

  protected askReset(): void {
    this.resetOpen.set(true);
  }

  protected confirmReset(): void {
    this.store.resetDemo();
    this.shopDraft = { ...this.store.shop() };
    this.resetOpen.set(false);
    this.toast.success('Le jeu de démonstration a été rechargé.');
  }
}
