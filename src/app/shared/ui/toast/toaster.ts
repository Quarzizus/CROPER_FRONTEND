import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BrnSonnerToaster } from '@spartan-ng/brain/sonner';

/** Anfitrión del toaster de spartan (sonner). Se monta una vez en el shell. */
@Component({
  selector: 'app-toaster',
  imports: [BrnSonnerToaster],
  template: `
    <brn-sonner-toaster position="top-right" [richColors]="true" [closeButton]="true" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toaster {}
