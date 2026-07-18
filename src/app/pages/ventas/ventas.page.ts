import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from 'src/app/services/auth.service';
import { ModalController } from '@ionic/angular/standalone';
import { CarritoModalComponent } from 'src/app/components/carrito-modal/carrito-modal.component';
import { IonMenuButton } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { NotificationService } from 'src/app/services/notification.service';
import { AlertController } from '@ionic/angular';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { addIcons } from 'ionicons';
import { 
  analyticsOutline,
  calendarOutline,
  cartOutline, 
  cubeOutline,
  chatbubbleOutline,
  peopleOutline,
  settingsOutline,
  logOutOutline,
  sunnyOutline,
  receiptOutline,
  moonOutline, 
  cashOutline,
  locationOutline,
  searchOutline,
  car
} from 'ionicons/icons';
import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, ...IONIC_IMPORTS, IonMenuButton],
  templateUrl: './ventas.page.html',
  styleUrls: ['./ventas.page.scss']
})

export class VentasPage implements OnInit {

  barcodeBuffer = '';
  lastKeyTime = 0;
  categoriaFiltro = '';

  currentRoute = '';

  // Dentro de tu ventas.page.ts
  placaMoto: string = ''; // Enlazar a un <ion-input> en el HTML
  esServicioTaller: boolean = false; // Checkbox para saber si se le hizo mano de obra
  descripcionMecanico: string = ''; // Detalles del trabajo hecho
  productos: any[] = [];
  busqueda = '';
  carrito: any[] = [];
  total = 0;
  ventaIdActual = '';

  constructor(
    private dataService: DataService,
    private supabaseService: SupabaseService,
    private router: Router,
    public auth: AuthService,
    private modalController: ModalController,
    private alertController: AlertController,
    private notiService: NotificationService
  ) {
    addIcons({
          analyticsOutline,
          cubeOutline,
          chatbubbleOutline,
          peopleOutline,
          settingsOutline,
          logOutOutline,
          sunnyOutline,
          cartOutline,
          receiptOutline,
          moonOutline,
          calendarOutline,
          cashOutline,
          locationOutline,
          searchOutline
        });
  }

  async ngOnInit() {
    this.currentRoute = this.router.url;
    await this.cargarProductos();
    window.addEventListener('keydown', this.handleScanner);
  }

  ngOnDestroy() {
    window.removeEventListener('keydown', this.handleScanner);
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }

  metodoPago = 'efectivo';
  pagoRecibido = '';
  cambio = 0;

  calcularCambio() {
    this.cambio = Number(this.pagoRecibido) - this.total;
  }

  formatearNumero(valor: number | string): string {
    if (!valor) return '0';

    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0
    }).format(Number(valor));
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
            body {
              font-family: monospace;
              width: 45mm;
              margin: 0;
              padding: 5px;
              font-size: 10px;
            }

            h1, h2, h3, p {
              margin: 2px 0;
              text-align: center;
            }

            .line {
              border-top: 1px dashed #000;
              margin: 5px 0;
            }

            .row {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
            }

            @media print {
              @page {
                size: 58mm auto;
                margin: 0;
              }
            }
          </style>
        </head>

        <body>
          ${html}
        </body>
      </html>
    `);

    ventana.document.close();

    // 🔥 CONTROL TOTAL DESDE JS (NO desde HTML)
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

          // cerrar después de imprimir
          setTimeout(() => {
            ventana.close();
          }, 500);

        }, 300);
      }

    }, 100);
  }

  handleScanner = (event: KeyboardEvent) => {
    const currentTime = new Date().getTime();
    const diff = currentTime - this.lastKeyTime;
    this.lastKeyTime = currentTime;

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

  async cargarProductos() {
    this.productos = await this.dataService.getProductos();
  }

  async compartirComprobante() {
  const alerta = await this.alertController.create({
    header: 'Comprobante',
    message: '¿Desea enviar el comprobante al cliente?',
    buttons: [
      {
        text: 'No',
        role: 'cancel'
      },
      {
        text: 'Sí',
        handler: () => {
          // Volvemos el handler síncrono y disparamos la lógica en segundo plano
          // para permitir que la ventana de la alerta se cierre de inmediato
          this.procesarYCompartirTicket();
          return true;
        }
      }
    ]
  });

  await alerta.present();
}

// Separamos la lógica pesada en una función dedicada asíncrona
async procesarYCompartirTicket() {
  try {
    const div = document.createElement('div');

    // 🔥 SOLUCIÓN EN MÓVIL: Lo dejamos en pantalla pero invisible/transparente
    div.style.position = 'fixed';
    div.style.left = '0';
    div.style.top = '0';
    div.style.zIndex = '-9999';
    div.style.opacity = '0'; // Invisible para el ojo humano, pero renderizable para el sistema
    div.style.width = '300px';
    div.style.background = 'white';
    div.style.padding = '10px';
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '12px';
    div.style.color = '#000000'; // Asegurar contraste para capturas en modo oscuro

    div.innerHTML = this.generarTicketHTML();

    document.body.appendChild(div);

    // Renderizamos la captura de pantalla nativa
    const canvas = await html2canvas(div, {
        scale: 2, // 2 es suficiente para móvil y ahorra muchísima memoria RAM
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
    const alto = canvas.height * ancho / canvas.width;

    pdf.addImage(img, 'PNG', 0, 0, ancho, alto);

    const base64 = pdf.output('datauristring').split(',')[1];
    const nombre = `ticket-${Date.now()}.pdf`;

    // Guardar en la caché nativa del celular usando Capacitor Filesystem
    await Filesystem.writeFile({
      path: nombre,
      directory: Directory.Cache,
      data: base64
    });

    // Obtener URI segura para compartir
    const uri = await Filesystem.getUri({
      directory: Directory.Cache,
      path: nombre
    });

    // Desplegar menú nativo de compartir (WhatsApp, Correo, etc.)
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

  async procesarVentaConTaller() {
    if (this.carrito.length === 0) return;

    try {
      // 1. Ejecutas tu lógica normal de guardar la venta en Supabase que armamos antes...
      // await this.ejecutarVentaNormal();

      // 2. 🏍️ Si se asignó una placa, guardamos la hoja de vida de la moto en el taller
      if (this.placaMoto) {
        // Formateamos el carrito para guardar solo lo vital en el JSON de Supabase
        const repuestosGuardar = this.carrito.map(item => ({
          elemento: item.elemento,
          cantidad: item.cantidad,
          precio_unitario: item.precio
        }));

        await this.dataService.agregarHistorialMoto({
          placa: this.placaMoto,
          descripcion_servicio: this.esServicioTaller ? this.descripcionMecanico : 'Compra de repuestos en mostrador.',
          repuestos_utilizados: repuestosGuardar,
          total_servicio: this.total
        });
      }

      alert('Venta e Historial de Taller guardados exitosamente.');
      // Limpieza de campos de moto
      this.placaMoto = '';
      this.descripcionMecanico = '';
      this.esServicioTaller = false;

    } catch (error) {
      alert('Fallo al registrar flujo mixto: ' + error);
    }
  }

  async abrirCarrito() {

    const modal = await this.modalController.create({
      component: CarritoModalComponent,
      componentProps: {
        ventas: this
      },
      breakpoints: [0, 0.5, 0.9],
      initialBreakpoint: 0.9
    });

    await modal.present();

  }

  get productosFiltrados() {
    // 1. Limpiamos y dividimos la búsqueda en palabras individuales
    const palabras = this.busqueda.toLowerCase().trim().split(' ').filter(p => p);

    // 2. Si no hay palabras, devolvemos todo (con filtro de categoría opcional)
    if (palabras.length === 0) {
      return this.categoriaFiltro 
        ? this.productos.filter(p => p.categorias_repuestos?.nombre === this.categoriaFiltro)
        : this.productos;
    }

    return this.productos.filter(p => {
      // 3. Creamos el bloque de texto donde buscar
      const texto = `
        ${p.elemento} ${p.marca} ${p.codigo} ${p.codigo_barras} 
        ${p.numero_inventario} ${p.proveedor} ${p.moto} ${p.precio} 
        ${p.costo} ${p.stock} ${p.categorias_repuestos?.nombre}
      `.toLowerCase();

      // 4. Verificamos que CADA palabra de la búsqueda esté en el texto
      const matchBusqueda = palabras.every(palabra => texto.includes(palabra));

      // 5. Mantenemos la lógica de categoría si la necesitas
      const matchCategoria = !this.categoriaFiltro || 
                            p.categorias_repuestos?.nombre === this.categoriaFiltro;

      return matchBusqueda && matchCategoria;
    });
  }

  buscarPorCodigo(codigo: string) {

    const producto = this.productos.find(p =>
      p.codigo_barras === codigo
    );

    if (!producto) {
      alert('Producto no encontrado');
      return;
    }

    this.agregarAlCarrito(producto);
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
      this.carrito.push({
        ...producto,
        cantidad: 1
      });
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

  calcularTotal() {
    this.total = this.carrito.reduce((sum, p) =>
      sum + (p.precio * p.cantidad), 0
    );
  }

  generarTicketHTML() {

    return `
    <div style="
        width:280px;
        background:#fff;
        color:#000;
        font-family:monospace;
        font-size:13px;
        padding:10px;
        box-sizing:border-box;
    ">

        <h2 style="
          text-align:center;
          margin:0;
        ">
          REPUESTOS LA F BIS
        </h2>

        <div style="text-align:center;margin-top:5px;">
            Cra 1 A 5 F bis #73A-11
        </div>

        <div style="text-align:center;">
            Tel: +57 3103762079
        </div>

        <hr>

        <div>
          <b>Fecha:</b>
          ${new Date().toLocaleString()}
        </div>

        <div>
          <b>Factura:</b>
          ${this.ventaIdActual.slice(0,8)}
        </div>

        <div>
          <b>Pago:</b>
          ${this.metodoPago.toUpperCase()}
        </div>

        <hr>

        ${this.carrito.map(item=>`

        <div style="margin-bottom:8px;">

            <div style="font-weight:bold;">
                ${item.elemento}
            </div>

            <div style="
                display:flex;
                justify-content:space-between;
            ">

                <span>
                    ${item.cantidad} x ${item.precio.toLocaleString()}
                </span>

                <span>
                    ${(item.cantidad*item.precio).toLocaleString()}
                </span>

            </div>

        </div>

        `).join('')}

        <hr>

        <div style="
            display:flex;
            justify-content:space-between;
            font-size:16px;
            font-weight:bold;
        ">

            <span>TOTAL</span>

            <span>
                ${this.total.toLocaleString()}
            </span>

        </div>

        ${
        this.metodoPago=="efectivo"
        ?

        `

        <br>

        <div style="display:flex;justify-content:space-between;">
            <span>Recibido</span>
            <span>${this.pagoRecibido.toLocaleString()}</span>
        </div>

        <div style="display:flex;justify-content:space-between;">
            <span>Cambio</span>
            <span>${this.cambio.toLocaleString()}</span>
        </div>

        `

        :

        ''

        }

        <hr>

        <div style="
            text-align:center;
            font-weight:bold;
        ">
            ¡Gracias por su compra!
        </div>

        <div style="text-align:center;">
            Vuelva pronto
        </div>

    </div>

    `;
  }

  async guardarVenta() {
    const { data: userData } = await this.supabaseService.supabase.auth.getUser();
    const user = userData?.user;

    try {
      for (const item of this.carrito) {
        await this.dataService.supabaseService.supabase
          .from('ventas')
          .insert([{
            producto_id: item.id,
            cantidad: item.cantidad,
            total: item.precio * item.cantidad,
            costo: item.costo * item.cantidad,
            vendido_por: user?.id // 🔥 CLAVE
          }]);

        // 🔥 actualizar stock
        await this.dataService.actualizarStock(
          item.id,
          item.stock - item.cantidad
        );
      }

      

    } catch (error) {
      console.error('Error guardando venta:', error);
    }
  }


  
  async vender() {
    if (this.carrito.length === 0) {
      alert('Carrito vacío');
      return;
    }

    if (this.metodoPago === 'efectivo' && Number(this.pagoRecibido) < this.total) {
      alert('Pago insuficiente');
      return;
    }

    const { data: userData } = await this.supabaseService.supabase.auth.getUser();
    const user = userData?.user;
    const ventaId = crypto.randomUUID();
    this.ventaIdActual = ventaId;

    try {
      // 1. 💾 Guardar en la Base de Datos (Bucle actual)
      for (let item of this.carrito) {
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
          return;
        }

        // Actualizar stock
        await this.dataService.actualizarStock(item.id, item.stock - item.cantidad);
        item.stock -= item.cantidad;

        // Notificar stock bajo
        if (item.stock <= 3) {
          this.notiService.notificarStockBajo(item.elemento, item.stock);
        }
      }

      // ==========================================
      // 🏍️ NUEVO: INSERTAR HISTORIAL DE MOTO (TALLER)
      // ==========================================
      if (this.placaMoto && this.placaMoto.trim() !== '') {
        try {
          const repuestosGuardar = this.carrito.map(item => ({
            elemento: item.elemento,
            cantidad: item.cantidad,
            precio_unitario: item.precio
          }));

          const descripcionFinal = this.esServicioTaller && this.descripcionMecanico.trim() !== ''
            ? this.descripcionMecanico
            : 'Compra e instalación de repuestos en mostrador.';

          await this.dataService.agregarHistorialMoto({
            placa: this.placaMoto.trim().toUpperCase(),
            descripcion_servicio: descripcionFinal,
            repuestos_utilizados: repuestosGuardar,
            total_servicio: this.total
          });
          
          console.log('Historial de taller guardado con éxito.');
        } catch (tallerError) {
          // Si falla el taller por RLS o red, se registra en consola pero no frena la venta ni el ticket
          console.error('Error al insertar en historial_motos:', tallerError);
        }
      }

      // ==========================================
      // 🧹 2. LIMPIEZA INMEDIATA
      // ==========================================
      const copiaCarritoParaTicket = [...this.carrito];

      // Guardamos el total actual antes de resetearlo para la notificación exitosa final
      const totalNotificación = this.total; 

      this.carrito = [];
      this.total = 0;
      this.pagoRecibido = '';
      this.cambio = 0;
      
      // Limpieza de campos del taller
      this.placaMoto = '';
      this.esServicioTaller = false;
      this.descripcionMecanico = '';

      // Refrescar la pantalla con los nuevos stocks
      await this.cargarProductos(); 

      // ==========================================
      // 🧾 3. PROCESO DEL TICKET (Al final del todo)
      // ==========================================
      try {
        const html = this.generarTicketHTML(); 
        await this.compartirComprobante();

        const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (!esMovil) {
          this.imprimirTicketAuto(html);
        }
      } catch (ticketError: any) {
        console.error('Fallo crítico en el plugin de Ticket:', ticketError);
        alert('Venta guardada con éxito, pero falló el Ticket: ' + (ticketError.message || JSON.stringify(ticketError)));
      }

      // Notificación Push local de éxito
      this.notiService.notificarVentaExitosa(totalNotificación);

    } catch (err) {
      console.error(err);
      alert('Error realizando venta');
    }
  }

   logout() {
    localStorage.clear();
    this.router.navigateByUrl('/');
  }
}