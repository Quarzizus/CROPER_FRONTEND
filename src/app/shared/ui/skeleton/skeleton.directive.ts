import { Directive } from '@angular/core';

/** Bloque de carga con pulso. Se usa con clases de tamaño desde el consumidor. */
@Directive({
  selector: '[appSkeleton]',
  host: { class: 'block animate-pulse rounded-md bg-muted', '[attr.aria-hidden]': '"true"' },
})
export class SkeletonDirective {}
