import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';

import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-historial-moto',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonSpinner],
  templateUrl: './historial-moto.page.html',
  styleUrls: ['./historial-moto.page.scss']
})
export class HistorialMotoPage {

  placaBuscar = '';
  placaMostrada = '';
  historiales: any[] = [];
  buscando = false;
  buscado = false;

  constructor(private dataService: DataService) {}

  setPlaca(valor: string) {
    this.placaBuscar = (valor || '').toUpperCase().replace(/\s+/g, '');
  }

  get totalGastado(): number {
    return this.historiales.reduce((s, h) => s + Number(h.total_servicio || 0), 0);
  }

  get conManoDeObra(): number {
    return this.historiales.filter(h => !this.esMostrador(h)).length;
  }

  /** Las ventas sin diagnóstico se guardan con este texto fijo */
  esMostrador(h: any): boolean {
    return (h.descripcion_servicio || '').startsWith('Compra e instalación de repuestos en mostrador')
      || (h.descripcion_servicio || '').startsWith('Compra de repuestos en mostrador');
  }

  async buscarHistorial() {
    const placa = this.placaBuscar.trim();
    if (!placa) return;

    this.buscando = true;

    try {
      this.historiales = await this.dataService.getHistorialPorPlaca(placa);
      this.placaMostrada = placa;
      this.buscado = true;
    } catch (error) {
      console.error(error);
    } finally {
      this.buscando = false;
    }
  }
}
