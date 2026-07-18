import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme';
import { SupabaseService } from '../../services/supabase.service';
import { IonMenuButton } from '@ionic/angular/standalone';
import { AuthService } from 'src/app/services/auth.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import {
  BarcodeScanner,
  BarcodeFormat
} from '@capacitor-mlkit/barcode-scanning';
import { addIcons } from 'ionicons';
import { 
  searchOutline
} from 'ionicons/icons';
import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, ...IONIC_IMPORTS, IonMenuButton],
  templateUrl: './inventory.page.html',
  styleUrls: ['./inventory.page.scss']
})
export class InventoryPage implements OnInit, OnDestroy {

  isDark = false;
  currentRoute = '';

  // 🔥 SCANNER
  barcodeBuffer = '';
  lastKeyTime = 0;

  // 🔥 UI
  showModal = false;
  previewImage: string | ArrayBuffer | null = null;
  selectedFile!: File;

  // 🔥 DATA
  productos: any[] = [];
  productosFiltrados: any[] = [];
  categorias: any[] = [];

  // 🔍 filtros
  busqueda = '';
  categoriaFiltro = '';

  // 🔥 FORM = ÚNICA FUENTE DE VERDAD
  form: any = this.getEmptyForm();

  constructor(
    private dataService: DataService,
    private router: Router,
    public themeService: ThemeService,
    private supabaseService: SupabaseService,
    public auth: AuthService
  ) {
    addIcons({
      searchOutline
    });
  }

  ngOnInit() {
    this.themeService.isDark$.subscribe(v => this.isDark = v);

    this.currentRoute = this.router.url;

    this.cargarProductos();
    this.cargarCategorias();

    window.addEventListener('keydown', this.handleScanner);
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.handleScanner);
  }

  // =========================
  // 📦 FORM
  // =========================

  getEmptyForm() {
    return {
      id: null,
      numero_inventario: '',
      codigo_barras: '',
      codigo: '',
      elemento: '',
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

    this.form.precio = costo + (costo * ganancia) / 100;
  }

  // =========================
  // 💰 FORMATO MONEDA
  // =========================

  formatearNumero(valor: number | string): string {
    if (!valor) return '';
    return new Intl.NumberFormat('es-CO').format(Number(valor));
  }

  parseNumero(valor: string): number {
    if (!valor) return 0;
    return Number(valor.replace(/\./g, '').replace(/[^\d]/g, ''));
  }

  // =========================
  // 📷 IMAGEN (PREVIEW INMEDIATO)
  // =========================

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.previewImage = reader.result; // 🔥 preview instantáneo
    };
    reader.readAsDataURL(file);
  }

  // =========================
  // 🔫 SCANNER GLOBAL
  // =========================

  handleScanner = (event: KeyboardEvent) => {
    const now = Date.now();
    const diff = now - this.lastKeyTime;
    this.lastKeyTime = now;

    if (diff > 100) this.barcodeBuffer = '';

    if (event.key === 'Enter') {
      if (this.barcodeBuffer.length > 5) {
        this.procesarCodigoBarras(this.barcodeBuffer);
      }
      this.barcodeBuffer = '';
      return;
    }

    if (event.key.length === 1) {
      this.barcodeBuffer += event.key;
    }
  };

  async procesarCodigoBarras(codigo: string) {
    const { data } = await this.supabaseService.supabase
      .from('productos')
      .select(`*, categorias_repuestos(nombre)`)
      .eq('codigo_barras', codigo)
      .maybeSingle();

    if (data) {
      this.abrirModal(data);
    } else {
      const nuevo = this.getEmptyForm();
      nuevo.codigo_barras = codigo;
      this.abrirModal(nuevo);
    }
  }

  // =========================
  // 📦 CRUD
  // =========================

  async cargarProductos() {
    this.productos = await this.dataService.getProductos();
    this.filtrar();
  }

  async cargarCategorias() {
    const { data } = await this.supabaseService.supabase
      .from('categorias_repuestos')
      .select('*');

    this.categorias = data || [];
  }

  abrirModal(producto?: any) {
    this.showModal = true;
    this.selectedFile = undefined as any;
    this.previewImage = null;

    if (producto && producto.id) {
      this.form = {
        ...producto,
        id: producto.id,
        categoria_id: producto.categoria_id || null
      };

      this.previewImage = producto.imagen_url;
    } else {
      this.form = this.getEmptyForm();

      if (producto?.codigo_barras) {
        this.form.codigo_barras = producto.codigo_barras;
      }
    }
  }

  cerrarModal() {
    this.showModal = false;
  }

  async guardar() {

    if (!this.form.elemento) {
      alert('Completa los campos');
      return;
    }

    const costo = Number(this.form.costo) || 0;
    const precio = Number(this.form.precio) || 0;

    this.form.porcentaje_ganancia =
      costo > 0 ? ((precio - costo) / costo) * 100 : 0;

    console.log('GUARDANDO:', this.form);

    if (this.form.id) {
      await this.dataService.actualizarProducto(
        this.form.id,
        this.form,
        this.selectedFile
      );
    } else {
      await this.dataService.crearProducto(
        this.form,
        this.selectedFile
      );
    }

    this.cerrarModal();
    this.cargarProductos();
  }

  async eliminar(id: string) {

    const { error } = await this.dataService.eliminarProducto(id);

    if (error) {
      console.log(error);
      return;
    }

    this.productos = this.productos.filter(p => p.id !== id);
    this.productosFiltrados = this.productosFiltrados.filter(p => p.id !== id);

  }

  async tomarFoto() {

    try {

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (!photo.webPath) return;

      this.previewImage = photo.webPath;

      const response = await fetch(photo.webPath);
      const blob = await response.blob();

      this.selectedFile = new File(
        [blob],
        `producto_${Date.now()}.jpg`,
        {
          type: blob.type
        }
      );

    } catch (e) {
      console.log('Cámara cancelada', e);
    }

  }

  async escanearCodigo() {

    try {

      const supported = await BarcodeScanner.isSupported();

      if (!supported.supported) {
        alert('Este dispositivo no soporta el escáner.');
        return;
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

      if (result.barcodes.length === 0) {
        return;
      }

      const codigo = result.barcodes[0].displayValue;

      if (codigo) {
        await this.procesarCodigoBarras(codigo);
      }

    } catch (e) {
      console.error(e);
    }

  }

  async elegirGaleria() {

    try {

      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos
      });

      if (!photo.webPath) return;

      this.previewImage = photo.webPath;

      const response = await fetch(photo.webPath);
      const blob = await response.blob();

      this.selectedFile = new File(
        [blob],
        `producto_${Date.now()}.jpg`,
        {
          type: blob.type
        }
      );

    } catch (e) {
      console.log(e);
    }

  }

  // =========================
  // 🔍 BUSQUEDA PRO
  // =========================

  filtrar() {
    const palabras = this.busqueda.toLowerCase().trim().split(' ').filter(p => p);

    this.productosFiltrados = this.productos.filter(p => {

      const texto = `
        ${p.elemento}
        ${p.marca}
        ${p.codigo}
        ${p.codigo_barras}
        ${p.numero_inventario}
        ${p.proveedor}
        ${p.moto}
        ${p.precio}
        ${p.costo}
        ${p.stock}
        ${p.categorias_repuestos?.nombre}
      `.toLowerCase();

      const matchBusqueda = palabras.every(w => texto.includes(w));

      const matchCategoria =
        !this.categoriaFiltro ||
        p.categorias_repuestos?.nombre === this.categoriaFiltro;

      return matchBusqueda && matchCategoria;
    });
  }

  onSearch(event: any) {
    this.busqueda = event.target.value;
    this.filtrar();
  }

  // =========================
  // 🚪 NAV
  // =========================

  logout() {
    localStorage.clear();
    this.router.navigateByUrl('/');
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }

  // 🔥 compatibilidad con tu HTML actual
  get editando() {
    return !!this.form?.id;
  }

  // 🔥 alias para input file
  onFileSelected(event: any) {
    this.onFileChange(event);
  }

  // 🔥 alias para botón guardar
  guardarProducto() {
    this.guardar();
  }

}

