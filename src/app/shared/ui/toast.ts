import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { Icon } from './icon';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private sequence = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly toasts = signal<ToastMessage[]>([]);

  show(message: string, tone: ToastTone = 'success', title?: string): number {
    const id = ++this.sequence;
    const defaultTitle =
      tone === 'success' ? 'C’est enregistré' : tone === 'error' ? 'Action impossible' : 'Information';
    this.toasts.update((current) => [
      ...current.slice(-2),
      { id, tone, title: title ?? defaultTitle, message },
    ]);
    const timer = setTimeout(() => this.dismiss(id), tone === 'error' ? 7000 : 5000);
    this.timers.set(id, timer);
    return id;
  }

  success(message: string, title?: string): number {
    return this.show(message, 'success', title);
  }

  error(message: string, title?: string): number {
    return this.show(message, 'error', title);
  }

  info(message: string, title?: string): number {
    return this.show(message, 'info', title);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }
}

@Component({
  selector: 'app-toasts',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="false">
      @for (toast of toasts(); track toast.id) {
        <div
          class="toast"
          [class.toast--error]="toast.tone === 'error'"
          [class.toast--info]="toast.tone === 'info'"
          [attr.role]="toast.tone === 'error' ? 'alert' : 'status'"
        >
          <span class="toast__icon" aria-hidden="true">
            <app-icon
              [name]="toast.tone === 'error' ? 'alert-circle' : toast.tone === 'success' ? 'check' : 'info'"
              [size]="18"
            />
          </span>
          <div class="toast__body">
            <strong>{{ toast.title }}</strong>
            <p>{{ toast.message }}</p>
          </div>
          <button
            type="button"
            class="toast__close"
            (click)="dismiss(toast.id)"
            aria-label="Fermer la notification"
          >
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-stack {
        position: fixed;
        z-index: 80;
        right: 1rem;
        top: calc(1rem + 64px);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: min(24rem, calc(100vw - 2rem));
        pointer-events: none;
      }

      .toast {
        pointer-events: auto;
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
        padding: 0.875rem 1rem;
        border-radius: 14px;
        background: #133d32;
        color: #f7f7f2;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 20px 40px -20px rgba(13, 44, 36, 0.5);
        animation: toast-in 0.22s ease both;
      }

      .toast--error {
        background: #7f2e1d;
        border-color: #9c3a25;
      }

      .toast--info {
        background: #ffffff;
        color: #202724;
        border-color: #e3e7e2;
      }

      .toast__icon {
        display: inline-flex;
        margin-top: 0.1rem;
        color: #e9b96e;
      }

      .toast--error .toast__icon {
        color: #f6dcd5;
      }

      .toast--info .toast__icon {
        color: #16794b;
      }

      .toast__body {
        flex: 1;
        min-width: 0;
      }

      .toast__body strong {
        display: block;
        font-size: 0.8125rem;
        letter-spacing: 0.01em;
      }

      .toast__body p {
        margin-top: 0.15rem;
        font-size: 0.8125rem;
        line-height: 1.45;
        opacity: 0.85;
      }

      .toast__close {
        border: 0;
        background: transparent;
        color: currentColor;
        opacity: 0.6;
        padding: 0.25rem;
        border-radius: 6px;
        display: inline-flex;
      }

      .toast__close:hover {
        opacity: 1;
      }

      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(-6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 640px) {
        .toast-stack {
          top: auto;
          bottom: calc(76px + env(safe-area-inset-bottom, 0px));
          right: 0.75rem;
          left: 0.75rem;
          width: auto;
        }
      }
    `,
  ],
})
export class Toasts {
  private readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
