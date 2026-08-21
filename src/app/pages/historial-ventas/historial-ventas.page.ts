import { Component, OnInit } from '@angular/core';
import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { IonMenuButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  analyticsOutline,
  cubeOutline,
  cashOutline,
  peopleOutline,
  settingsOutline,
  logOutOutline,
  receiptOutline,
  searchOutline,
  trashOutline,
  printOutline
} from 'ionicons/icons';

import { SupabaseService } from '../../services/supabase.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-historial-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, ...IONIC_IMPORTS, IonMenuButton],
  templateUrl: './historial-ventas.page.html',
  styleUrls: ['./historial-ventas.page.scss']
})

export class HistorialVentasPage implements OnInit {

  currentRoute = '';
  ventashistorialChannel: any;

  ventas: any[] = [];
  ventasFiltradas: any[] = [];

  busqueda = '';

  fechaInicio = '';
  fechaFin = '';

  totalVentas = 0;
  totalGanancia = 0;

  constructor(
    private router: Router,
    public supabaseService: SupabaseService,
    private dataService: DataService,
    public auth: AuthService
  ) {

    addIcons({
      analyticsOutline,
      cubeOutline,
      cashOutline,
      peopleOutline,
      settingsOutline,
      logOutOutline,
      receiptOutline,
      trashOutline,
      searchOutline,
      printOutline
    });
  }

  async ngOnInit() {

    this.currentRoute = this.router.url;

    await this.cargarVentas();

    // 🔥 REALTIME
    this.ventashistorialChannel = this.supabaseService.supabase

      .channel('ventas-historial')

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ventas'
        },

        () => {

          this.cargarVentas();

        }
      )

      .subscribe();
  }

  ngOnDestroy() {
    if (this.ventashistorialChannel) {
      this.supabaseService.supabase
        .removeChannel(this.ventashistorialChannel);
    }
  }

  async cargarVentas() {

    let query = this.supabaseService.supabase
      .from('ventas')
      .select(`
        *,
        productos (
          elemento
        ),
        profiles (
          username
        )
      `);

    // 🔥 FILTRO POR FECHA (esto era lo que faltaba)
    if (this.fechaInicio && this.fechaFin) {

      const inicioLocal = new Date(this.fechaInicio + 'T00:00:00');
      const finLocal = new Date(this.fechaFin + 'T23:59:59.999');

      query = query
        .gte('fecha', inicioLocal.toISOString())
        .lte('fecha', finLocal.toISOString());
    }

    const { data, error } = await query.order('fecha', { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    // 🔥 AGRUPAR POR venta_id
    const agrupadas: any = {};

    data.forEach((v: any) => {

      if (!agrupadas[v.venta_id]) {

        agrupadas[v.venta_id] = {
          venta_id: v.venta_id,
          fecha: v.fecha,
          metodo_pago: v.metodo_pago,
          vendedor: v.profiles?.username || 'Usuario',
          pago_recibido: v.pago_recibido,
          cambio: v.cambio,

          total: 0,
          costo: 0,

          productos: []
        };
      }

      agrupadas[v.venta_id].productos.push(v);

      agrupadas[v.venta_id].total += Number(v.total);
      agrupadas[v.venta_id].costo += Number(v.costo);
    });

    this.ventas = Object.values(agrupadas);
    this.ventasFiltradas = this.ventas;

    this.calcularKPIs();
  }

  filtrarVentas() {

    if (!this.busqueda) {
      this.ventasFiltradas = this.ventas;
      return;
    }

    const texto = this.busqueda.toLowerCase();

    this.ventasFiltradas = this.ventas.filter((v: any) => {

      const factura =
        v.venta_id?.toLowerCase().includes(texto);

      const vendedor =
        v.vendedor?.toLowerCase().includes(texto);

      return factura || vendedor;
    });

    this.calcularKPIs();
  }

  calcularKPIs() {

    this.totalVentas = Math.round(
      this.ventasFiltradas.reduce(
        (a: number, b: any) => a + Number(b.total),
        0
      )
    );

    this.totalGanancia = Math.round(
      this.ventasFiltradas.reduce(
        (a: number, b: any) => a + (Number(b.total) - Number(b.costo)),
        0
      )
    );
  }

  limpiarFechas() {
    this.fechaInicio = '';
    this.fechaFin = '';
    this.cargarVentas();
  }

  async eliminarVenta(venta: any) {

    const ok = confirm(
      '¿Eliminar esta venta completa?'
    );

    if (!ok) return;

    try {

      // 🔥 devolver stock
      for (const item of venta.productos) {

        // stock actual
        const producto = await this.dataService
          .getProductoById(item.producto_id);

        if (producto) {

          await this.dataService.actualizarStock(
            item.producto_id,
            producto.stock + item.cantidad
          );
        }
      }

      // 🔥 eliminar TODAS las líneas
      const { error } = await this.supabaseService.supabase
        .from('ventas')
        .delete()
        .eq('venta_id', venta.venta_id);

      if (error) {
        console.error(error);
        alert('Error eliminando venta');
        return;
      }

      // 🔥 refrescar
      await this.cargarVentas();

    } catch (err) {

      console.error(err);

      alert('Error eliminando');
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

  reimprimir(venta: any) {

  const html = `
    <h3>*** REPUESTOS LA F BIS ***</h3>
    
    <p>Cra 1 A 5 F bis # 73A-11</p>

    <p>Tel: +57 310 3762079</p>

    <p>Factura: ${venta.venta_id.slice(0,8)}</p>

    <p>${new Date(venta.fecha).toLocaleString()}</p>

    <div class="line"></div>

    ${venta.productos.map((p: any) => `
      <div class="row">
        <span>${p.productos?.elemento}</span>
        <span>x${p.cantidad}</span>
        <span>${Number(p.total).toLocaleString()}</span>
      </div>
    `).join('')}

    <div class="line"></div>

    <h2>TOTAL ${Number(venta.total).toLocaleString()}</h2>
  `;

  this.imprimirTicketAuto(html);
}


  go(path: string) {
    this.router.navigateByUrl(path);
  }

  logout() {
    localStorage.clear();
    this.router.navigateByUrl('/');
  }
}