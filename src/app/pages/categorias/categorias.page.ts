import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonMenuButton,
  IonIcon
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { searchOutline } from 'ionicons/icons';

import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonMenuButton,
    IonIcon
  ],
  templateUrl: './categorias.page.html',
  styleUrls: ['./categorias.page.scss']
})
export class CategoriasPage implements OnInit {

  categorias: any[] = [];
  categoriasFiltradas: any[] = [];
  busqueda = '';

  showModal = false;
  editando = false;
  guardando = false;

  form: any = {
    id: null,
    nombre: ''
  };

  constructor(private dataService: DataService) {
    addIcons({ searchOutline });
  }

  ngOnInit() {
    this.cargarCategorias();
  }

  async cargarCategorias() {
    this.categorias = await this.dataService.getCategorias();
    this.filtrar();
  }

  filtrar() {
    const texto = this.busqueda.trim().toLowerCase();

    this.categoriasFiltradas = !texto
      ? this.categorias
      : this.categorias.filter(c =>
          c.nombre?.toLowerCase().includes(texto)
        );
  }

  abrirModal(categoria?: any) {
    if (categoria) {
      this.editando = true;
      this.form = { id: categoria.id, nombre: categoria.nombre };
    } else {
      this.editando = false;
      this.form = { id: null, nombre: '' };
    }
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
  }

  async guardarCategoria() {
    const nombre = (this.form.nombre || '').trim();

    if (!nombre) {
      alert('Escribe un nombre para la categoría');
      return;
    }

    this.guardando = true;

    try {
      if (this.editando) {
        await this.dataService.actualizarCategoria(this.form.id, nombre);
      } else {
        await this.dataService.crearCategoria(nombre);
      }

      this.cerrarModal();
      await this.cargarCategorias();
    } catch (error: any) {

      if (error?.code === '23505') {
        alert('Ya existe una categoría con ese nombre');
      } else {
        alert('No se pudo guardar la categoría');
      }
    } finally {
      this.guardando = false;
    }
  }

  async eliminar(id: string) {
    const confirmado = confirm('¿Seguro que quieres eliminar esta categoría?');
    if (!confirmado) return;

    try {
      await this.dataService.eliminarCategoria(id);
      await this.cargarCategorias();
    } catch (error: any) {

      if (error?.code === '23503') {
        alert('No se puede eliminar: hay productos usando esta categoría');
      } else {
        alert('No se pudo eliminar la categoría');
      }
    }
  }
}