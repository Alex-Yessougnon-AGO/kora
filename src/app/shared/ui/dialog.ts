import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-dialog',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #nativeDialog
      class="kora-dialog"
      [class.kora-dialog--sm]="size() === 'sm'"
      [class.kora-dialog--lg]="size() === 'lg'"
      [attr.aria-labelledby]="titleId"
      (close)="handleNativeClose()"
      (click)="handleBackdropClick($event)"
    >
      <div class="kora-dialog__panel">
        <header class="kora-dialog__header">
          <div>
            @if (eyebrow()) {
              <p class="kora-eyebrow">{{ eyebrow() }}</p>
            }
            <h2 [id]="titleId">{{ title() }}</h2>
          </div>
          <button type="button" class="kora-dialog__close" (click)="close()" aria-label="Fermer la fenêtre">
            <app-icon name="x" [size]="18" />
          </button>
        </header>
        <div class="kora-dialog__body">
          <ng-content />
        </div>
        <footer class="kora-dialog__footer">
          <ng-content select="[dialog-footer]" />
        </footer>
      </div>
    </dialog>
  `,
  styles: [
    `
      .kora-dialog {
        border: 0;
        padding: 0;
        background: transparent;
        width: min(40rem, calc(100vw - 2rem));
        max-width: calc(100vw - 2rem);
        max-height: calc(100dvh - 2rem);
        color: var(--kora-ink, #202724);
        overflow: visible;
      }

      .kora-dialog--sm {
        width: min(26rem, calc(100vw - 2rem));
      }

      .kora-dialog--lg {
        width: min(56rem, calc(100vw - 2rem));
      }

      .kora-dialog::backdrop {
        background: rgba(13, 44, 36, 0.42);
        backdrop-filter: blur(3px);
      }

      .kora-dialog__panel {
        display: flex;
        flex-direction: column;
        max-height: calc(100dvh - 2rem);
        background: #ffffff;
        border: 1px solid #e3e7e2;
        border-radius: 18px;
        box-shadow: 0 30px 80px -30px rgba(13, 44, 36, 0.5);
        overflow: hidden;
        animation: dialog-in 0.22s ease both;
      }

      .kora-dialog__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.25rem 1.5rem 1rem;
        border-bottom: 1px solid #eef0ea;
      }

      .kora-dialog__header h2 {
        font-size: 1.2rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .kora-dialog__header .kora-eyebrow {
        margin-bottom: 0.3rem;
      }

      .kora-dialog__close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: 1px solid transparent;
        border-radius: 9px;
        background: transparent;
        color: #68716c;
        flex: none;
      }

      .kora-dialog__close:hover {
        background: #f0f1eb;
        color: #202724;
      }

      .kora-dialog__body {
        padding: 1.25rem 1.5rem;
        overflow-y: auto;
      }

      .kora-dialog__footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        flex-wrap: wrap;
        padding: 1rem 1.5rem;
        border-top: 1px solid #eef0ea;
        background: #fafaf6;
      }

      .kora-dialog__footer:empty {
        display: none;
      }

      @keyframes dialog-in {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.99);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (max-width: 640px) {
        .kora-dialog {
          width: calc(100vw - 1rem);
          max-width: calc(100vw - 1rem);
        }

        .kora-dialog__header,
        .kora-dialog__body,
        .kora-dialog__footer {
          padding-left: 1rem;
          padding-right: 1rem;
        }
      }
    `,
  ],
})
export class Dialog {
  readonly title = input.required<string>();
  readonly eyebrow = input<string>('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly open = model(false);
  readonly titleId = `kora-dialog-title-${Math.random().toString(36).slice(2, 8)}`;

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('nativeDialog');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) return;
      if (this.open() && !dialog.open) {
        dialog.showModal();
        document.documentElement.style.overflow = 'hidden';
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });

    effect(() => {
      if (!this.open()) {
        document.documentElement.style.overflow = '';
      }
    });
  }

  close(): void {
    this.open.set(false);
  }

  handleNativeClose(): void {
    this.open.set(false);
    document.documentElement.style.overflow = '';
  }

  handleBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogRef()?.nativeElement) {
      this.close();
    }
  }
}
