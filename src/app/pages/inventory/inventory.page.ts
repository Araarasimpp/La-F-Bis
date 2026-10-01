import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';

import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';
import { DataService } from '../../services/data.service';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from 'src/app/services/auth.service';
import { umbralStock } from 'src/app/services/stock';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, ...IONIC_IMPORTS],
  templateUrl: './inventory.page.html',
  styleUrls: ['./inventory.page.scss']
})
export class InventoryPage implements OnInit, OnDestroy {

  /** Desde cuántas unidades se avisa (Configuración → Inventario) */
  umbral = umbralStock();

  // Resumen calculado al cargar (no en cada ciclo de pantalla)
  agotados = 0;
  porAgotarse = 0;
  valorInventario = 0;

  // Lector de código de barras por teclado
  barcodeBuffer = '';
  lastKeyTime = 0;

  // Hoja del formulario
  showModal = false;
  guardando = false;
  previewImage: string | ArrayBuffer | null = null;
  selectedFile?: File;

  // Datos
  productos: any[] = [];
  productosFiltrados: any[] = [];
  categorias: any[] = [];
  cargando = true;

  // Combobox de categoría (dentro del formulario)
  categoriaBusqueda = '';
  categoriasBusquedaResultados: any[] = [];
  mostrarDropdownCategorias = false;

  // Filtros de la lista
  busqueda = '';
  categoriaFiltro = '';
  soloStockBajo = false;

  form: any = this.getEmptyForm();

  constructor(
    private dataService: DataService,
    private router: Router,
    private supabaseService: SupabaseService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.cargarProductos();
    this.cargarCategorias();
    window.addEventListener('keydown', this.handleScanner);
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.handleScanner);
  }

  get editando() {
    return !!this.form?.id;
  }

  /** Al volver a la pantalla (por ejemplo desde Configuración) */
  ionViewWillEnter() {
    const nuevo = umbralStock();
    if (nuevo !== this.umbral) {
      this.umbral = nuevo;
      this.calcularResumen();
      this.filtrar();
    }
  }

  private calcularResumen() {
    this.agotados = this.productos.filter(p => p.stock <= 0).length;
    this.porAgotarse = this.productos.filter(p => p.stock > 0 && p.stock <= this.umbral).length;
    this.valorInventario = Math.round(
      this.productos.reduce((s, p) => s + (p.stock > 0 ? Number(p.costo || 0) * p.stock : 0), 0)
    );
  }

  trackId(_: number, p: any) {
    return p.id;
  }

  // =========================
  // 📦 Formulario
  // =========================

  getEmptyForm() {
    return {
      id: null,
      numero_inventario: '',
      codigo_barras: '',
      codigo: '',
      elemento: '',
      ubicacion: '',
      marca: '',
      proveedor: '',
      moto: '',
      costo: 0,
      porcentaje_ganancia: 0,
      precio: 0,
      stock: 0,
      categoria_id: null,
      imagen_url: ''
    };
  }

  calcularPrecio() {
    const costo = Number(this.form.costo) || 0;
    const ganancia = Number(this.form.porcentaje_ganancia) || 0;
    this.form.precio = Math.round(costo + (costo * ganancia) / 100);
  }

  /** Si se edita el precio a mano, el % de ganancia se ajusta solo */
  recalcularGanancia() {
    const costo = Number(this.form.costo) || 0;
    const precio = Number(this.form.precio) || 0;
    this.form.porcentaje_ganancia = costo > 0 ? Math.round(((precio - costo) / costo) * 1000) / 10 : 0;
  }

  cambiarStock(delta: number) {
    this.form.stock = Math.max(0, (Number(this.form.stock) || 0) + delta);
  }

  formatearNumero(valor: number | string): string {
    if (!valor) return '';
    return new Intl.NumberFormat('es-CO').format(Number(valor));
  }

  parseNumero(valor: string): number {
    if (!valor) return 0;
    return Number(valor.replace(/\./g, '').replace(/[^\d]/g, ''));
  }

  // =========================
  // 🔍 Combobox de categoría
  // =========================

  filtrarCategoriasBusqueda() {
    const texto = this.categoriaBusqueda.toLowerCase().trim();

    this.categoriasBusquedaResultados = !texto
      ? this.categorias
      : this.categorias.filter(c => c.nombre?.toLowerCase().includes(texto));
  }

  abrirDropdownCategorias() {
    this.filtrarCategoriasBusqueda();
    this.mostrarDropdownCategorias = true;
  }

  cerrarDropdownCategorias() {
    // Pequeña espera para que el toque en una opción alcance a registrarse
    setTimeout(() => (this.mostrarDropdownCategorias = false), 150);
  }

  seleccionarCategoria(categoria: any) {
    this.form.categoria_id = categoria.id;
    this.categoriaBusqueda = categoria.nombre;
    this.mostrarDropdownCategorias = false;
  }

  quitarCategoria() {
    this.form.categoria_id = null;
    this.categoriaBusqueda = '';
    this.mostrarDropdownCategorias = false;
  }

  // =========================
  // 📷 Imagen
  // =========================

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => (this.previewImage = reader.result);
    reader.readAsDataURL(file);
  }

  async tomarFoto() {
    await this.obtenerFoto(CameraSource.Camera);
  }

  async elegirGaleria() {
    await this.obtenerFoto(CameraSource.Photos);
  }

  private async obtenerFoto(source: CameraSource) {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source
      });

      if (!photo.webPath) return;

      this.previewImage = photo.webPath;

      const response = await fetch(photo.webPath);
      const blob = await response.blob();

      this.selectedFile = new File([blob], `producto_${Date.now()}.jpg`, { type: blob.type });
    } catch (e) {
      console.log('Foto cancelada', e);
    }
  }

  // =========================
  // 🔫 Códigos de barras
  // =========================

  handleScanner = (event: KeyboardEvent) => {
    const ahora = Date.now();
    const diff = ahora - this.lastKeyTime;
    this.lastKeyTime = ahora;

    if (diff > 100) this.barcodeBuffer = '';

    if (event.key === 'Enter') {
      if (this.barcodeBuffer.length > 5) {
        // Con el formulario abierto, el código llena el campo en vez de abrir otro producto
        if (this.showModal) {
          this.form.codigo_barras = this.barcodeBuffer;
        } else {
          this.procesarCodigoBarras(this.barcodeBuffer);
        }
      }
      this.barcodeBuffer = '';
      return;
    }

    if (event.key.length === 1) {
      this.barcodeBuffer += event.key;
    }
  };

  /** Abre la cámara y devuelve el código leído (o null) */
  private async leerCodigo(): Promise<string | null> {
    try {
      const supported = await BarcodeScanner.isSupported();

      if (!supported.supported) {
        alert('Este dispositivo no soporta el escáner. Usa un lector USB o escribe el código.');
        return null;
      }

      await BarcodeScanner.requestPermissions();

      const result = await BarcodeScanner.scan({
        formats: [
          BarcodeFormat.Ean13,
          BarcodeFormat.Ean8,
          BarcodeFormat.Code128,
          BarcodeFormat.Code39,
          BarcodeFormat.UpcA,
          BarcodeFormat.UpcE
        ]
      });

      return result.barcodes[0]?.displayValue || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  /** Botón de escanear de la lista: abre el producto o crea uno nuevo con ese código */
  async escanearCodigo() {
    const codigo = await this.leerCodigo();
    if (codigo) await this.procesarCodigoBarras(codigo);
  }

  /** Botón de escanear dentro del formulario: solo llena el campo */
  async escanearParaFormulario() {
    const codigo = await this.leerCodigo();
    if (codigo) this.form.codigo_barras = codigo;
  }

  async procesarCodigoBarras(codigo: string) {
    const { data } = await this.supabaseService.supabase
      .from('productos')
      .select(`*, categorias_repuestos(nombre)`)
      .eq('codigo_barras', codigo)
      .maybeSingle();

    if (data) {
      this.abrirModal(data);
    } else {
      this.abrirModal({ codigo_barras: codigo });
    }
  }

  // =========================
  // 📦 CRUD
  // =========================

  async cargarProductos() {
    this.cargando = true;
    this.productos = await this.dataService.getProductos();
    this.cargando = false;
    this.calcularResumen();
    this.filtrar();
  }

  async cargarCategorias() {
    this.categorias = await this.dataService.getCategorias();
    this.categoriasBusquedaResultados = this.categorias;
  }

  abrirModal(producto?: any) {
    this.selectedFile = undefined;
    this.previewImage = null;
    this.mostrarDropdownCategorias = false;

    if (producto?.id) {
      this.form = {
        ...producto,
        categoria_id: producto.categoria_id || null,
        // Se guardaba con muchos decimales (73,4441273…); se muestra con uno
        porcentaje_ganancia: Math.round((Number(producto.porcentaje_ganancia) || 0) * 10) / 10
      };
      this.previewImage = producto.imagen_url || null;
      this.categoriaBusqueda = producto.categorias_repuestos?.nombre || '';
    } else {
      this.form = this.getEmptyForm();
      this.categoriaBusqueda = '';

      if (producto?.codigo_barras) {
        this.form.codigo_barras = producto.codigo_barras;
      }
    }

    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
  }

  async guardarProducto() {
    if (this.guardando) return;

    if (!this.form.elemento?.trim()) {
      alert('Escribe el nombre del producto');
      return;
    }

    if (!Number(this.form.precio)) {
      alert('Escribe el precio de venta');
      return;
    }

    // El código interno es obligatorio y único en la base de datos
    if (!this.form.codigo?.trim()) {
      this.form.codigo =
        this.form.codigo_barras?.trim() ||
        this.form.numero_inventario?.trim() ||
        'INT-' + Date.now().toString(36).toUpperCase();
    }

    this.guardando = true;

    const datos = { ...this.form };
    delete datos.categorias_repuestos;

    try {
      if (datos.id) {
        await this.dataService.actualizarProducto(datos.id, datos, this.selectedFile);
      } else {
        await this.dataService.crearProducto(datos, this.selectedFile);
      }

      this.cerrarModal();
      await this.cargarProductos();

    } catch (error: any) {
      console.error(error);

      if (error?.code === '23505') {
        alert('Ya existe un producto con ese código interno o código de barras.');
      } else {
        alert('No se pudo guardar el producto.');
      }
    } finally {
      this.guardando = false;
    }
  }

  async eliminar(id: string) {
    if (!confirm('¿Eliminar este producto? También se borran sus líneas en el historial de ventas.')) {
      return;
    }

    const { error } = await this.dataService.eliminarProducto(id);

    if (error) {
      console.error(error);
      alert('No se pudo eliminar el producto.');
      return;
    }

    this.productos = this.productos.filter(p => p.id !== id);
    this.calcularResumen();
    this.filtrar();
    this.cerrarModal();
  }

  // =========================
  // 🔍 Búsqueda y filtros
  // =========================

  setCategoria(nombre: string) {
    this.categoriaFiltro = nombre;
    this.soloStockBajo = false;
    this.filtrar();
  }

  toggleStockBajo() {
    this.soloStockBajo = !this.soloStockBajo;
    this.categoriaFiltro = '';
    this.filtrar();
  }

  filtrar() {
    const palabras = this.busqueda.toLowerCase().trim().split(' ').filter(p => p);

    this.productosFiltrados = this.productos.filter(p => {
      const texto = `
        ${p.elemento} ${p.marca} ${p.codigo} ${p.codigo_barras}
        ${p.numero_inventario} ${p.proveedor} ${p.moto} ${p.ubicacion}
        ${p.precio} ${p.costo} ${p.stock} ${p.categorias_repuestos?.nombre}
      `.toLowerCase();

      const matchBusqueda = palabras.every(w => texto.includes(w));
      const matchCategoria = !this.categoriaFiltro || p.categorias_repuestos?.nombre === this.categoriaFiltro;
      const matchStock = !this.soloStockBajo || p.stock <= this.umbral;

      return matchBusqueda && matchCategoria && matchStock;
    });
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }
}
