import { Dialog } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog, type ConfirmDialogData } from './confirm-dialog';

export type ConfirmOptions = Omit<ConfirmDialogData, 'cancelLabel'> &
  Partial<Pick<ConfirmDialogData, 'cancelLabel'>>;

/** Puerta única a diálogos modales dentro de la app. */
@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(Dialog);

  /** Resuelve `true` solo si la persona confirma; cerrar con Esc resuelve `false`. */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<boolean, ConfirmDialogData>(ConfirmDialog, {
      data: { cancelLabel: 'Cancelar', ...options },
      ariaModal: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      closeOnNavigation: true,
      panelClass: 'app-dialog-panel',
      backdropClass: 'app-dialog-backdrop',
    });

    return (await firstValueFrom(ref.closed)) === true;
  }
}
