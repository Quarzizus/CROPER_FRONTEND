import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Envoltura de campo de formulario: etiqueta, control proyectado y mensaje.
 * No conoce reglas de negocio; solo presenta el estado que recibe.
 */
@Component({
  selector: 'app-field',
  template: `
    <div class="space-y-2">
      <label [for]="htmlFor()" class="text-sm font-medium leading-none">{{ label() }}</label>
      <ng-content />
      @if (error(); as message) {
        <p class="text-destructive text-sm leading-relaxed" role="alert">{{ message }}</p>
      } @else if (hint(); as message) {
        <p class="text-muted-foreground text-xs leading-relaxed">{{ message }}</p>
      }
    </div>
  `,
  // Un elemento de componente es inline por defecto: sin `block`, los márgenes
  // de `space-y-*` del formulario no separan un campo del siguiente.
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Field {
  readonly label = input.required<string>();
  readonly htmlFor = input.required<string>();
  /** Error de validación visible; sustituye al hint cuando existe. */
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
}
