import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';
import { DataService } from '../../services/data.service';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from 'src/app/services/auth.service';
import { NotificationService } from 'src/app/services/notification.service';
import { CarritoStateService } from 'src/app/services/carrito-state.service';
import { CarritoModalComponent } from 'src/app/components/carrito-modal/carrito-modal.component';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, ...IONIC_IMPORTS, CarritoModalComponent],
  templateUrl: './ventas.page.html',
  styleUrls: ['./ventas.page.scss']
})
export class VentasPage implements OnInit, OnDestroy {

  // Lector de código de barras por teclado (pistola USB/Bluetooth)
  barcodeBuffer = '';
  lastKeyTime = 0;

  categoriaFiltro = '';
  busqueda = '';
  productos: any[] = [];
  cargando = true;

  // Carrito
  carrito: any[] = [];
  total = 0;
  metodoPago = 'efectivo';
  pagoRecibido: any = '';
  cambio = 0;
  ventaIdActual = '';
  procesando = false;

  // Orden de taller
  placaMoto = '';
  esServicioTaller = false;
  descripcionMecanico = '';

  private abrirSub?: Subscription;

  constructor(
    private dataService: DataService,
    private supabaseService: SupabaseService,
    private router: Router,
    public auth: AuthService,
    private modalController: ModalController,
    private alertController: AlertController,
    private notiService: NotificationService,
    private carritoState: CarritoStateService
  ) {}

  async ngOnInit() {
    window.addEventListener('keydown', this.handleScanner);

    // El botón central de la barra abre el carrito cuando ya estamos aquí
    this.abrirSub = this.carritoState.abrir$.subscribe(() => {
      if (window.innerWidth < 992) {
        this.abrirCarrito();
      }
    });

    await this.cargarProductos();
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.handleScanner);
    this.abrirSub?.unsubscribe();
    this.carritoState.setCount(0);
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }

  // =========================
  // 📦 Productos
  // =========================

  async cargarProductos() {
    this.cargando = true;
    this.productos = await this.dataService.getProductos();
    this.cargando = false;
  }

  get productosFiltrados() {
    const palabras = this.busqueda.toLowerCase().trim().split(' ').filter(p => p);

    if (palabras.length === 0) {
      return this.categoriaFiltro
        ? this.productos.filter(p => p.categorias_repuestos?.nombre === this.categoriaFiltro)
        : this.productos;
    }

    return this.productos.filter(p => {
      const texto = `
        ${p.elemento} ${p.marca} ${p.codigo} ${p.codigo_barras}
        ${p.numero_inventario} ${p.proveedor} ${p.moto} ${p.precio}
        ${p.costo} ${p.stock} ${p.categorias_repuestos?.nombre} ${p.ubicacion}
      `.toLowerCase();

      const matchBusqueda = palabras.every(palabra => texto.includes(palabra));
      const matchCategoria = !this.categoriaFiltro || p.categorias_repuestos?.nombre === this.categoriaFiltro;

      return matchBusqueda && matchCategoria;
    });
  }

  trackId(_: number, p: any) {
    return p.id;
  }

  cantidadEnCarrito(producto: any): number {
    return this.carrito.find(p => p.id === producto.id)?.cantidad || 0;
  }

  // =========================
  // 🔫 Lector de códigos
  // =========================

  handleScanner = (event: KeyboardEvent) => {
    const ahora = Date.now();
    const diff = ahora - this.lastKeyTime;
    this.lastKeyTime = ahora;

    if (diff > 100) {
      this.barcodeBuffer = '';
    }

    if (event.key === 'Enter') {
      if (this.barcodeBuffer.length > 5) {
        this.buscarPorCodigo(this.barcodeBuffer);
      }
      this.barcodeBuffer = '';
      return;
    }

    if (event.key.length === 1) {
      this.barcodeBuffer += event.key;
    }
  };

  buscarPorCodigo(codigo: string) {
    const producto = this.productos.find(p => p.codigo_barras === codigo);

    if (!producto) {
      alert('Producto no encontrado');
      return;
    }

    this.agregarAlCarrito(producto);
  }

  // =========================
  // 🛒 Carrito
  // =========================

  get unidades(): number {
    return this.carrito.reduce((s, p) => s + p.cantidad, 0);
  }

  agregarAlCarrito(producto: any) {
    if (producto.stock <= 0) {
      alert('Sin stock');
      return;
    }

    const existe = this.carrito.find(p => p.id === producto.id);

    if (existe) {
      if (existe.cantidad < producto.stock) {
        existe.cantidad++;
      }
    } else {
      this.carrito.push({ ...producto, cantidad: 1 });
    }

    this.calcularTotal();
  }

  disminuir(item: any) {
    item.cantidad--;

    if (item.cantidad <= 0) {
      this.carrito = this.carrito.filter(p => p.id !== item.id);
    }

    this.calcularTotal();
  }

  aumentar(item: any) {
    if (item.cantidad < item.stock) {
      item.cantidad++;
      this.calcularTotal();
    }
  }

  vaciarCarrito() {
    if (!this.carrito.length) return;
    if (!confirm('¿Vaciar el carrito?')) return;

    this.carrito = [];
    this.pagoRecibido = '';
    this.calcularTotal();
  }

  calcularTotal() {
    this.total = this.carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0);
    this.carritoState.setCount(this.unidades);

    if (this.pagoRecibido !== '' && this.pagoRecibido !== null) {
      this.calcularCambio();
    } else {
      this.cambio = 0;
    }
  }

  calcularCambio() {
    this.cambio = Number(this.pagoRecibido || 0) - this.total;
  }

  async abrirCarrito() {
    const modal = await this.modalController.create({
      component: CarritoModalComponent,
      componentProps: { ventas: this },
      breakpoints: [0, 0.5, 0.92],
      initialBreakpoint: 0.92,
      handle: true
    });

    await modal.present();
  }

  // =========================
  // 💾 Venta
  // =========================

  /** Devuelve true si la venta quedó guardada */
  async vender(): Promise<boolean> {
    if (this.procesando) return false;

    if (this.carrito.length === 0) {
      alert('Carrito vacío');
      return false;
    }

    if (this.metodoPago === 'efectivo' && Number(this.pagoRecibido) < this.total) {
      alert('Pago insuficiente');
      return false;
    }

    this.procesando = true;

    const { data: userData } = await this.supabaseService.supabase.auth.getUser();
    const user = userData?.user;
    const ventaId = crypto.randomUUID();
    this.ventaIdActual = ventaId;

    try {
      // 1. Guardar cada línea de la factura y descontar stock
      for (const item of this.carrito) {
        const { error } = await this.supabaseService.supabase
          .from('ventas')
          .insert([{
            venta_id: ventaId,
            producto_id: item.id,
            cantidad: item.cantidad,
            total: item.precio * item.cantidad,
            costo: item.costo * item.cantidad,
            vendido_por: user?.id,
            metodo_pago: this.metodoPago,
            pago_recibido: this.metodoPago === 'efectivo' ? this.pagoRecibido : this.total,
            cambio: this.metodoPago === 'efectivo' ? this.cambio : 0
          }]);

        if (error) {
          console.error(error);
          alert('Error guardando venta');
          return false;
        }

        await this.dataService.actualizarStock(item.id, item.stock - item.cantidad);
        item.stock -= item.cantidad;

        if (item.stock <= 3) {
          this.notiService.notificarStockBajo(item.elemento, item.stock);
        }
      }

      // 2. Orden de taller (si se escribió una placa)
      if (this.placaMoto && this.placaMoto.trim() !== '') {
        try {
          const repuestos = this.carrito.map(item => ({
            elemento: item.elemento,
            cantidad: item.cantidad,
            precio_unitario: item.precio
          }));

          const descripcion = this.esServicioTaller && this.descripcionMecanico.trim() !== ''
            ? this.descripcionMecanico
            : 'Compra e instalación de repuestos en mostrador.';

          await this.dataService.agregarHistorialMoto({
            placa: this.placaMoto.trim().toUpperCase(),
            descripcion_servicio: descripcion,
            repuestos_utilizados: repuestos,
            total_servicio: this.total
          });
        } catch (tallerError) {
          // Si falla el historial no se pierde la venta ni el ticket
          console.error('Error al insertar en historial_motos:', tallerError);
        }
      }

      // 3. El ticket se arma con el carrito antes de limpiarlo
      const html = this.generarTicketHTML();
      const ticketDiv = this.prepararTicket(html);
      const totalNotificacion = this.total;

      this.carrito = [];
      this.total = 0;
      this.pagoRecibido = '';
      this.cambio = 0;
      this.placaMoto = '';
      this.esServicioTaller = false;
      this.descripcionMecanico = '';
      this.carritoState.setCount(0);

      await this.cargarProductos();

      // 4. Comprobante
      try {
        await this.compartirComprobante(ticketDiv);

        const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const imprimirAuto = localStorage.getItem('ticket_auto') !== 'false';

        if (!esMovil && imprimirAuto) {
          this.imprimirTicketAuto(html);
        }
      } catch (ticketError: any) {
        console.error('Fallo en el ticket:', ticketError);
        alert('Venta guardada, pero falló el ticket: ' + (ticketError.message || JSON.stringify(ticketError)));
      }

      this.notiService.notificarVentaExitosa(totalNotificacion);
      return true;

    } catch (err) {
      console.error(err);
      alert('Error realizando venta');
      return false;
    } finally {
      this.procesando = false;
    }
  }

  // =========================
  // 🧾 Comprobante
  // =========================

  private prepararTicket(html: string): HTMLDivElement {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
  }

  async compartirComprobante(ticket: HTMLDivElement) {
    const alerta = await this.alertController.create({
      header: 'Comprobante',
      message: '¿Desea enviar el comprobante al cliente?',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí',
          handler: () => {
            // Se dispara en segundo plano para que la alerta se cierre de inmediato
            this.procesarYCompartirTicket(ticket);
            return true;
          }
        }
      ]
    });

    await alerta.present();
  }

  async procesarYCompartirTicket(ticket: HTMLDivElement) {
    try {
      const div = document.createElement('div');

      // Invisible pero renderizable para la captura
      div.style.position = 'fixed';
      div.style.left = '0';
      div.style.top = '0';
      div.style.zIndex = '-9999';
      div.style.opacity = '0';
      div.style.width = '300px';
      div.style.background = 'white';
      div.style.padding = '10px';
      div.style.fontFamily = 'monospace';
      div.style.fontSize = '12px';
      div.style.color = '#000000';
      div.innerHTML = ticket.innerHTML;

      document.body.appendChild(div);

      const canvas = await html2canvas(div, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      document.body.removeChild(div);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, canvas.height * 0.264583]
      });

      const img = canvas.toDataURL('image/png');
      const ancho = 80;
      const alto = (canvas.height * ancho) / canvas.width;

      pdf.addImage(img, 'PNG', 0, 0, ancho, alto);

      const base64 = pdf.output('datauristring').split(',')[1];
      const nombre = `ticket-${Date.now()}.pdf`;

      await Filesystem.writeFile({ path: nombre, directory: Directory.Cache, data: base64 });
      const uri = await Filesystem.getUri({ directory: Directory.Cache, path: nombre });

      await Share.share({
        title: 'Comprobante de Venta',
        text: 'Gracias por su compra.',
        url: uri.uri,
        dialogTitle: 'Compartir comprobante'
      });

    } catch (error: any) {
      console.error('Error generando o compartiendo el ticket:', error);
      alert('No se pudo compartir el comprobante: ' + (error.message || JSON.stringify(error)));
    }
  }

  imprimirTicketAuto(html: string) {
    const ventana = window.open('', '_blank', 'width=300,height=600');
    if (!ventana) return;

    ventana.document.open();
    ventana.document.write(`
      <html>
        <head>
          <title>Ticket</title>
          <style>
            body { font-family: monospace; width: 45mm; margin: 0; padding: 5px; font-size: 10px; }
            h1, h2, h3, p { margin: 2px 0; text-align: center; }
            .line { border-top: 1px dashed #000; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; font-size: 10px; }
            @media print { @page { size: 58mm auto; margin: 0; } }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    ventana.document.close();

    const checkReady = setInterval(() => {
      if (ventana.document.readyState === 'complete') {
        clearInterval(checkReady);

        setTimeout(() => {
          try {
            ventana.focus();
            ventana.print();
          } catch (err) {
            console.error('Error print:', err);
          }

          setTimeout(() => ventana.close(), 500);
        }, 300);
      }
    }, 100);
  }

  generarTicketHTML() {
    const filas = this.carrito.map(item => `
      <div style="margin-bottom:8px;">
        <div style="font-weight:bold;">${item.elemento}</div>
        <div style="display:flex;justify-content:space-between;">
          <span>${item.cantidad} x ${Number(item.precio).toLocaleString('es-CO')}</span>
          <span>${(item.cantidad * item.precio).toLocaleString('es-CO')}</span>
        </div>
      </div>
    `).join('');

    const efectivo = this.metodoPago === 'efectivo'
      ? `
        <br>
        <div style="display:flex;justify-content:space-between;">
          <span>Recibido</span><span>${Number(this.pagoRecibido || 0).toLocaleString('es-CO')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span>Cambio</span><span>${this.cambio.toLocaleString('es-CO')}</span>
        </div>
      `
      : '';

    const placa = this.placaMoto?.trim()
      ? `<div><b>Placa:</b> ${this.placaMoto.trim().toUpperCase()}</div>`
      : '';

    return `
      <div style="width:280px;background:#fff;color:#000;font-family:monospace;font-size:13px;padding:10px;box-sizing:border-box;">
        <h2 style="text-align:center;margin:0;">REPUESTOS LA F BIS</h2>
        <div style="text-align:center;margin-top:5px;">Cra 1 A 5 F bis #73A-11</div>
        <div style="text-align:center;">Tel: +57 3103762079</div>
        <hr>
        <div><b>Fecha:</b> ${new Date().toLocaleString('es-CO')}</div>
        <div><b>Factura:</b> ${this.ventaIdActual.slice(0, 8)}</div>
        <div><b>Pago:</b> ${this.metodoPago.toUpperCase()}</div>
        ${placa}
        <hr>
        ${filas}
        <hr>
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:bold;">
          <span>TOTAL</span><span>${this.total.toLocaleString('es-CO')}</span>
        </div>
        ${efectivo}
        <hr>
        <div style="text-align:center;font-weight:bold;">¡Gracias por su compra!</div>
        <div style="text-align:center;">Vuelva pronto</div>
      </div>
    `;
  }
}
