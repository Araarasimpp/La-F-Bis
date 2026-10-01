import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonSpinner, ModalController } from '@ionic/angular/standalone';

/**
 * Carrito de la venta actual.
 * - Como modal (celular): se abre desde el botón central de la barra.
 * - En línea (escritorio): panel fijo a la derecha de la pantalla de venta.
 * Toda la lógica vive en VentasPage; aquí solo se presenta.
 */
@Component({
  selector: 'app-carrito-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonSpinner],
  templateUrl: './carrito-modal.component.html',
  styleUrls: ['./carrito-modal.component.scss']
})
export class CarritoModalComponent {

  @Input() ventas: any;
  @Input() inline = false;

  constructor(private modalCtrl: ModalController) {}

  get unidades(): number {
    return this.ventas?.unidades || 0;
  }

  cerrar() {
    this.modalCtrl.dismiss();
  }

  setMetodo(metodo: string) {
    this.ventas.metodoPago = metodo;
    this.ventas.calcularCambio();
  }

  setPago(valor: any) {
    this.ventas.pagoRecibido = valor;
    this.ventas.calcularCambio();
  }

  /** Billetes rápidos para no tener que escribir el monto */
  get sugerencias(): number[] {
    const total = this.ventas?.total || 0;
    if (!total) return [];

    const opciones = [10000, 20000, 50000, 100000]
      .map(b => Math.ceil(total / b) * b)
      .filter(v => v >= total);

    return [total, ...Array.from(new Set(opciones))].slice(0, 4);
  }

  setPlaca(valor: string) {
    this.ventas.placaMoto = (valor || '').toUpperCase().replace(/\s+/g, '');
  }

  async finalizarVenta() {
    const ok = await this.ventas.vender();

    if (ok && !this.inline) {
      this.modalCtrl.dismiss();
    }
  }
}
