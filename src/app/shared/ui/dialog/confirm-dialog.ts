import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ButtonDirective } from '../button/button.directive';

export interface ConfirmDialogData {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  /** `true` pinta la acción principal en rojo. */
  readonly destructive: boolean;
}

/**
 * Diálogo de confirmación genérico. CDK se encarga del foco (entra al cancelar,
 * vuelve al elemento que lo abrió) y de `aria-modal`.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ButtonDirective],
  template: `
    <div
      class="bg-card w-[min(92vw,26rem)] rounded-xl border p-6 shadow-xl"
      role="document"
    >
      <h2 class="text-lg font-semibold tracking-tight" id="confirm-dialog-title">
        {{ data.title }}
      </h2>
      <p class="text-muted-foreground mt-2 text-sm" id="confirm-dialog-description">
        {{ data.description }}
      </p>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          appButton
          variant="outline"
          type="button"
          cdkFocusInitial
          (click)="close(false)"
        >
          {{ data.cancelLabel }}
        </button>
        <button
          appButton
          [variant]="data.destructive ? 'destructive' : 'default'"
          type="button"
          (click)="close(true)"
        >
          {{ data.confirmLabel }}
        </button>
      </div>
    </div>
  `,
  host: {
    '[attr.aria-labelledby]': '"confirm-dialog-title"',
    '[attr.aria-describedby]': '"confirm-dialog-description"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected close(result: boolean): void {
    this.ref.close(result);
  }
}
