import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';
import { AuthService } from 'src/app/services/auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { DataService } from '../../services/data.service';

type Periodo = 'hoy' | 'semana' | 'mes' | 'todo' | 'rango';

@Component({
  selector: 'app-historial-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, ...IONIC_IMPORTS],
  templateUrl: './historial-ventas.page.html',
  styleUrls: ['./historial-ventas.page.scss']
})
export class HistorialVentasPage implements OnInit, OnDestroy {

  ventashistorialChannel: any;

  ventas: any[] = [];
  ventasFiltradas: any[] = [];
  cargando = true;

  busqueda = '';
  periodo: Periodo = 'todo';
  fechaInicio = '';
  fechaFin = '';

  // Resumen / cuadre de caja
  totalVentas = 0;
  totalGanancia = 0;
  totalEfectivo = 0;
  totalTransferencia = 0;
  facturasEfectivo = 0;
  facturasTransferencia = 0;

  constructor(
    private router: Router,
    public supabaseService: SupabaseService,
    private dataService: DataService,
    public auth: AuthService
  ) {}

  async ngOnInit() {
    await this.cargarVentas();

    // Se recarga si otra caja registra o anula ventas (requiere Realtime activo)
    this.ventashistorialChannel = this.supabaseService.supabase
      .channel('ventas-historial')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => this.cargarVentas())
      .subscribe();
  }

  ngOnDestroy() {
    if (this.ventashistorialChannel) {
      this.supabaseService.supabase.removeChannel(this.ventashistorialChannel);
    }
  }

  // =========================
  // 📅 Periodos
  // =========================

  setPeriodo(periodo: Periodo) {
    const hoy = new Date();
    this.periodo = periodo;

    if (periodo === 'todo') {
      this.fechaInicio = '';
      this.fechaFin = '';
    } else if (periodo === 'hoy') {
      this.fechaInicio = this.fechaFin = this.iso(hoy);
    } else if (periodo === 'semana') {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 6);
      this.fechaInicio = this.iso(inicio);
      this.fechaFin = this.iso(hoy);
    } else if (periodo === 'mes') {
      this.fechaInicio = this.iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      this.fechaFin = this.iso(hoy);
    }

    this.cargarVentas();
  }

  /** Cuando se escriben fechas a mano */
  cambioFechas() {
    this.periodo = 'rango';
    if ((this.fechaInicio && this.fechaFin) || (!this.fechaInicio && !this.fechaFin)) {
      this.cargarVentas();
    }
  }

  limpiarFechas() {
    this.setPeriodo('todo');
  }

  private iso(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // =========================
  // 📦 Datos
  // =========================

  async cargarVentas() {
    this.cargando = true;

    let query = this.supabaseService.supabase
      .from('ventas')
      .select(`*, productos ( elemento ), profiles ( username )`);

    if (this.fechaInicio && this.fechaFin) {
      const inicioLocal = new Date(this.fechaInicio + 'T00:00:00');
      const finLocal = new Date(this.fechaFin + 'T23:59:59.999');

      query = query
        .gte('fecha', inicioLocal.toISOString())
        .lte('fecha', finLocal.toISOString());
    }

    const { data, error } = await query.order('fecha', { ascending: false });

    this.cargando = false;

    if (error) {
      console.error(error);
      return;
    }

    // Agrupar las líneas por factura (venta_id)
    const agrupadas: Record<string, any> = {};

    (data || []).forEach((v: any) => {
      const clave = v.venta_id || v.id;

      if (!agrupadas[clave]) {
        agrupadas[clave] = {
          venta_id: clave,
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

      agrupadas[clave].productos.push(v);
      agrupadas[clave].total += Number(v.total);
      agrupadas[clave].costo += Number(v.costo || 0);
    });

    this.ventas = Object.values(agrupadas);
    this.filtrarVentas();
  }

  filtrarVentas() {
    const texto = this.busqueda.toLowerCase().trim();

    this.ventasFiltradas = !texto
      ? this.ventas
      : this.ventas.filter((v: any) =>
          v.venta_id?.toLowerCase().includes(texto) ||
          v.vendedor?.toLowerCase().includes(texto) ||
          v.productos.some((p: any) => (p.productos?.elemento || '').toLowerCase().includes(texto))
        );

    this.calcularKPIs();
  }

  calcularKPIs() {
    let total = 0, costo = 0, efectivo = 0, transferencia = 0, nEf = 0, nTr = 0;

    for (const v of this.ventasFiltradas) {
      total += Number(v.total);
      costo += Number(v.costo);

      if (v.metodo_pago === 'transferencia') {
        transferencia += Number(v.total);
        nTr++;
      } else {
        efectivo += Number(v.total);
        nEf++;
      }
    }

    this.totalVentas = Math.round(total);
    this.totalGanancia = Math.round(total - costo);
    this.totalEfectivo = Math.round(efectivo);
    this.totalTransferencia = Math.round(transferencia);
    this.facturasEfectivo = nEf;
    this.facturasTransferencia = nTr;
  }

  // =========================
  // 🗑️ Anular
  // =========================

  async eliminarVenta(venta: any) {
    if (!confirm('¿Anular esta venta completa? El stock de sus productos se devuelve al inventario.')) return;

    try {
      for (const item of venta.productos) {
        const producto = await this.dataService.getProductoById(item.producto_id);

        if (producto) {
          await this.dataService.actualizarStock(item.producto_id, producto.stock + item.cantidad);
        }
      }

      const { error } = await this.supabaseService.supabase
        .from('ventas')
        .delete()
        .eq('venta_id', venta.venta_id);

      if (error) {
        console.error(error);
        alert('Error anulando la venta');
        return;
      }

      await this.cargarVentas();

    } catch (err) {
      console.error(err);
      alert('Error anulando la venta');
    }
  }

  // =========================
  // 📤 Exportar (CSV para Excel)
  // =========================

  async exportarCSV() {
    const filas: (string | number)[][] = [
      ['Factura', 'Fecha', 'Vendedor', 'Método de pago', 'Producto', 'Cantidad', 'Total línea', 'Costo línea', 'Ganancia línea']
    ];

    for (const v of this.ventasFiltradas) {
      for (const item of v.productos) {
        filas.push([
          v.venta_id.slice(0, 8).toUpperCase(),
          new Date(v.fecha).toLocaleString('es-CO'),
          v.vendedor,
          v.metodo_pago || '',
          item.productos?.elemento || 'Producto eliminado',
          item.cantidad,
          Math.round(Number(item.total)),
          Math.round(Number(item.costo || 0)),
          Math.round(Number(item.total) - Number(item.costo || 0))
        ]);
      }
    }

    // Punto y coma: Excel en español lo abre en columnas directamente
    const csv = '\uFEFF' + filas
      .map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const nombre = `ventas-la-f-bis-${this.fechaInicio || 'todo'}${this.fechaFin && this.fechaFin !== this.fechaInicio ? '_' + this.fechaFin : ''}.csv`;

    try {
      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({ path: nombre, data: csv, directory: Directory.Cache, encoding: Encoding.UTF8 });
        const { uri } = await Filesystem.getUri({ path: nombre, directory: Directory.Cache });
        await Share.share({ title: 'Ventas La F Bis', url: uri, dialogTitle: 'Compartir ventas' });
      } else {
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      console.error(e);
      alert('No se pudo exportar: ' + (e?.message || e));
    }
  }

  // =========================
  // 🧾 Reimprimir
  // =========================

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

  reimprimir(venta: any) {
    const html = `
      <h3>*** REPUESTOS LA F BIS ***</h3>
      <p>Cra 1 A 5 F bis # 73A-11</p>
      <p>Tel: +57 310 3762079</p>
      <p>Factura: ${venta.venta_id.slice(0, 8).toUpperCase()}</p>
      <p>${new Date(venta.fecha).toLocaleString('es-CO')}</p>
      <div class="line"></div>
      ${venta.productos.map((p: any) => `
        <div class="row">
          <span>${p.productos?.elemento || 'Producto'}</span>
          <span>x${p.cantidad}</span>
          <span>${Number(p.total).toLocaleString('es-CO')}</span>
        </div>
      `).join('')}
      <div class="line"></div>
      <h2>TOTAL ${Number(venta.total).toLocaleString('es-CO')}</h2>
    `;

    this.imprimirTicketAuto(html);
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }
}
