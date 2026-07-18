import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';

import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';

@Component({
  selector: 'app-carrito-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ...IONIC_IMPORTS
  ],
  templateUrl: './carrito-modal.component.html',
  styleUrls: ['./carrito-modal.component.scss']
})
export class CarritoModalComponent {

  @Input() ventas: any;

  constructor(private modalCtrl: ModalController) {}

  cerrar() {
    this.modalCtrl.dismiss();
  }

  async finalizarVenta() {

    await this.ventas.vender();

    this.modalCtrl.dismiss();

  }

}