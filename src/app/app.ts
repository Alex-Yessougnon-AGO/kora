import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Shell } from './layout/shell';
import { Toasts } from './shared/ui/toast';

@Component({
  selector: 'app-root',
  imports: [Shell, Toasts],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-shell />
    <app-toasts />
  `,
})
export class App {}
