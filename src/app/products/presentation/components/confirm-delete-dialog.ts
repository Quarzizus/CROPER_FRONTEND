import { Injectable, inject } from '@angular/core';
import { DialogService } from '../../../shared/ui/dialog/dialog.service';

/**
 * Confirmación de borrado del dominio de productos. Compone el texto y delega el
 * diálogo accesible en `DialogService`; el borrado siempre pasa por aquí.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDeleteDialog {
  private readonly dialogs = inject(DialogService);

  confirmDelete(productName: string): Promise<boolean> {
    return this.dialogs.confirm({
      title: '¿Eliminar este producto?',
      description: `"${productName}" dejará de aparecer en el catálogo. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar producto',
      cancelLabel: 'Conservarlo',
      destructive: true,
    });
  }
}
