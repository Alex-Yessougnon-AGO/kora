import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { Dialog } from './dialog';

@Component({
  selector: 'app-confirm-dialog',
  imports: [Dialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-dialog [title]="title()" [eyebrow]="eyebrow()" size="sm" [(open)]="open">
      <p class="confirm-text">{{ message() }}</p>
      @if (detail()) {
        <p class="confirm-detail">{{ detail() }}</p>
      }
      <div dialog-footer>
        <button type="button" class="kora-btn kora-btn--outline" (click)="cancel()">
          {{ cancelLabel() }}
        </button>
        <button
          type="button"
          class="kora-btn"
          [class.kora-btn--danger]="tone() === 'danger'"
          [class.kora-btn--primary]="tone() !== 'danger'"
          [disabled]="busy()"
          (click)="confirmed.emit()"
        >
          {{ busy() ? 'Traitement…' : confirmLabel() }}
        </button>
      </div>
    </app-dialog>
  `,
  styles: [
    `
      .confirm-text {
        font-size: 0.9375rem;
        line-height: 1.6;
        color: #3a423e;
      }

      .confirm-detail {
        margin-top: 0.75rem;
        padding: 0.75rem 0.875rem;
        border-radius: 10px;
        background: #fbf3e4;
        border: 1px solid #f0dfbd;
        color: #6f4b18;
        font-size: 0.8125rem;
        line-height: 1.55;
      }
    `,
  ],
})
export class ConfirmDialog {
  readonly open = model(false);
  readonly title = input('Confirmer l’action');
  readonly eyebrow = input('Confirmation');
  readonly message = input.required<string>();
  readonly detail = input('');
  readonly confirmLabel = input('Confirmer');
  readonly cancelLabel = input('Annuler');
  readonly tone = input<'default' | 'danger'>('default');
  readonly busy = input(false);
  readonly confirmed = output<void>();

  cancel(): void {
    this.open.set(false);
  }
}
