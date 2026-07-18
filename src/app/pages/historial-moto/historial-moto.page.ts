import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // 🔥 Para ngIf, ngFor y Pipes (date, uppercase, currency)
import { FormsModule } from '@angular/forms';   // 🔥 Para el [(ngModel)] del buscador
import { IonicModule } from '@ionic/angular';   // 🔥 Para ion-content, ion-spinner, ion-icon, etc.
import { DataService } from '../../services/data.service';
import { 
  searchOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-historial-moto',
  templateUrl: './historial-moto.page.html',
  styleUrls: ['./historial-moto.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonicModule
  ] // 🔥 Agregamos los módulos necesarios para la vista
})
export class HistorialMotoPage implements OnInit {
  placaBuscar: string = '';
  historiales: any[] = [];
  buscando: boolean = false;

  constructor(private dataService: DataService) {
    addIcons({
      searchOutline
    });
  }
  

  ngOnInit() {}

  async buscarHistorial() {
    if (!this.placaBuscar.trim()) return;
    this.buscando = true;

    try {
      this.historiales = await this.dataService.getHistorialPorPlaca(this.placaBuscar);
    } catch (error) {
      console.error(error);
    } finally {
      this.buscando = false;
    }
  }
}