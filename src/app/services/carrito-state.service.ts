import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

/**
 * Puente entre la pantalla de venta y la barra inferior:
 * - count$: unidades en el carrito (insignia del botón central)
 * - abrir$: la barra pide abrir el carrito cuando ya estás en /ventas
 */
@Injectable({
  providedIn: 'root'
})
export class CarritoStateService {

  private countSubject = new BehaviorSubject<number>(0);
  count$ = this.countSubject.asObservable();

  private abrirSubject = new Subject<void>();
  abrir$ = this.abrirSubject.asObservable();

  setCount(unidades: number) {
    this.countSubject.next(unidades);
  }

  pedirAbrir() {
    this.abrirSubject.next();
  }
}
