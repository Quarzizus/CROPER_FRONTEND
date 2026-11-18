import { Injectable } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';

/**
 * Fachada sobre el toaster de spartan (sonner). Es la única puerta a las
 * notificaciones: si cambia la librería, cambia este archivo.
 */
@Injectable({ providedIn: 'root' })
export class Notifier {
  success(message: string): void {
    toast.success(message);
  }

  error(message: string): void {
    toast.error(message);
  }

  info(message: string): void {
    toast.info(message);
  }
}
