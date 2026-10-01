import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Chart } from 'chart.js/auto';
import flatpickr from 'flatpickr';
import { Subscription } from 'rxjs';

import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';
import { DataService } from '../../services/data.service';
import { ThemeService } from '../../services/theme';
import { AuthService } from 'src/app/services/auth.service';

type Preset = 'hoy' | 'semana' | 'mes' | 'rango';

interface TopProducto {
  nombre: string;
  cantidad: number;
  porcentaje: number;
  ancho: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ...IONIC_IMPORTS],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('ventasChart') ventasChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('gananciaChart') gananciaChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutChart') donutChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('calendar') calendarRef?: ElementRef;

  // Periodo
  preset: Preset = 'mes';
  fechaInicio = '';
  fechaFin = '';
  fechaTexto = '';
  hoyTexto = '';
  showCalendar = false;
  private picker: any;

  // Datos
  ventas: any[] = [];
  totalVentas = 0;
  totalGanancia = 0;
  numFacturas = 0;
  crecimientoVentas = 0;
  topProductos: TopProducto[] = [];
  cargando = true;

  // Gráficas
  private chartVentas?: Chart;
  private chartGanancia?: Chart;
  private chartDonut?: Chart;

  private channel: any;
  private themeSub?: Subscription;
  private vistaLista = false;
  private recarga?: ReturnType<typeof setTimeout>;

  constructor(
    private router: Router,
    private dataService: DataService,
    public themeService: ThemeService,
    public auth: AuthService
  ) {}

  // =========================
  // 📊 Indicadores derivados
  // =========================

  get ticketPromedio(): number {
    return this.numFacturas ? Math.round(this.totalVentas / this.numFacturas) : 0;
  }

  get costoTotal(): number {
    return Math.max(this.totalVentas - this.totalGanancia, 0);
  }

  get margen(): number {
    return this.totalVentas ? Math.round((this.totalGanancia / this.totalVentas) * 100) : 0;
  }

  get tituloPeriodo(): string {
    switch (this.preset) {
      case 'hoy': return 'Ventas de hoy';
      case 'semana': return 'Ventas de la semana';
      case 'mes': return 'Ventas del mes';
      default: return 'Ventas del periodo';
    }
  }

  // =========================
  // 🔁 Ciclo de vida
  // =========================

  ngOnInit() {
    this.hoyTexto = new Date().toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    this.setMes(false);

    // Si cambia el tema, las gráficas se repintan con los colores nuevos
    this.themeSub = this.themeService.isDark$.subscribe(() => {
      if (this.vistaLista && this.ventas.length) {
        setTimeout(() => this.renderGraficas(), 0);
      }
    });

    // Actualización en vivo cuando entra una venta (requiere Realtime activo en la tabla ventas)
    const anterior = this.dataService.supabaseService.supabase
      .getChannels()
      .find(c => c.topic === 'realtime:ventas-live');

    if (anterior) {
      this.dataService.supabaseService.supabase.removeChannel(anterior);
    }

    this.channel = this.dataService.supabaseService.supabase
      .channel('ventas-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ventas' }, () => {
        // Una venta inserta varias líneas: se espera un momento y se recarga una sola vez
        clearTimeout(this.recarga);
        this.recarga = setTimeout(() => this.cargarDatos(), 800);
      })
      .subscribe();
  }

  ngAfterViewInit(): void {
    this.vistaLista = true;
    this.cargarDatos();
  }

  ngOnDestroy() {
    clearTimeout(this.recarga);
    this.themeSub?.unsubscribe();
    this.picker?.destroy();
    this.chartVentas?.destroy();
    this.chartGanancia?.destroy();
    this.chartDonut?.destroy();

    if (this.channel) {
      this.dataService.supabaseService.supabase.removeChannel(this.channel);
    }
  }

  // =========================
  // 📅 Periodo
  // =========================

  setHoy(cargar = true) {
    const hoy = new Date();
    this.aplicarRango('hoy', hoy, hoy, cargar);
  }

  setSemana(cargar = true) {
    const hoy = new Date();
    const inicio = new Date();
    inicio.setDate(hoy.getDate() - 6);
    this.aplicarRango('semana', inicio, hoy, cargar);
  }

  setMes(cargar = true) {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.aplicarRango('mes', inicio, hoy, cargar);
  }

  private aplicarRango(preset: Preset, inicio: Date, fin: Date, cargar: boolean) {
    this.preset = preset;
    this.fechaInicio = this.iso(inicio);
    this.fechaFin = this.iso(fin);
    this.actualizarTextoFecha();

    if (cargar && this.vistaLista) {
      this.cargarDatos();
    }
  }

  toggleCalendar() {
    this.showCalendar = !this.showCalendar;

    if (this.showCalendar) {
      setTimeout(() => this.initCalendar(), 0);
    }
  }

  private initCalendar() {
    if (!this.calendarRef) return;

    this.picker?.destroy();

    this.picker = flatpickr(this.calendarRef.nativeElement, {
      inline: true,
      mode: 'range',
      dateFormat: 'Y-m-d',
      showMonths: 1,
      maxDate: new Date(),
      locale: { firstDayOfWeek: 1 },

      onReady: (_d, _s, instance) => {
        const calendar = instance.calendarContainer;
        if (calendar.querySelector('.calendar-close-btn')) return;

        const cerrar = document.createElement('button');
        cerrar.type = 'button';
        cerrar.textContent = '✕';
        cerrar.className = 'calendar-close-btn';
        cerrar.setAttribute('aria-label', 'Cerrar calendario');
        cerrar.onclick = () => (this.showCalendar = false);

        calendar.style.position = 'relative';
        calendar.appendChild(cerrar);
      },

      onChange: (fechas: Date[]) => {
        if (fechas.length === 2) {
          this.showCalendar = false;
          this.aplicarRango('rango', fechas[0], fechas[1], true);
        }
      }
    });
  }

  private actualizarTextoFecha() {
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const inicio = this.fechaLocal(this.fechaInicio).toLocaleDateString('es-CO', opciones);
    const fin = this.fechaLocal(this.fechaFin).toLocaleDateString('es-CO', opciones);

    this.fechaTexto = this.fechaInicio === this.fechaFin ? inicio : `${inicio} – ${fin}`;
  }

  // =========================
  // 📦 Datos
  // =========================

  async cargarDatos() {
    this.cargando = true;

    const ventas = await this.dataService.getVentas(this.fechaInicio, this.fechaFin);
    this.ventas = ventas || [];

    this.totalVentas = Math.round(
      this.ventas.reduce((a: number, v: any) => a + Number(v.total), 0)
    );

    this.totalGanancia = Math.round(
      this.ventas.reduce((a: number, v: any) => a + Number(v.total) - Number(v.costo || 0), 0)
    );

    // Una factura agrupa varias líneas con el mismo venta_id
    this.numFacturas = new Set(this.ventas.map((v: any) => v.venta_id || v.id)).size;

    this.procesarTopProductos();
    this.cargando = false;

    setTimeout(() => this.renderGraficas(), 0);
    this.calcularComparacion();
  }

  private async calcularComparacion() {
    const inicio = this.fechaLocal(this.fechaInicio);
    const fin = this.fechaLocal(this.fechaFin);
    const dias = Math.round((fin.getTime() - inicio.getTime()) / 86400000) + 1;

    // Periodo anterior del mismo largo, justo antes del actual
    const finAnterior = new Date(inicio);
    finAnterior.setDate(finAnterior.getDate() - 1);
    const inicioAnterior = new Date(finAnterior);
    inicioAnterior.setDate(inicioAnterior.getDate() - (dias - 1));

    const anteriores = await this.dataService.getVentas(this.iso(inicioAnterior), this.iso(finAnterior));
    const totalAnterior = (anteriores || []).reduce((a: number, v: any) => a + Number(v.total), 0);

    this.crecimientoVentas = totalAnterior > 0
      ? Math.round(((this.totalVentas - totalAnterior) / totalAnterior) * 100)
      : 0;
  }

  private procesarTopProductos() {
    const mapa: Record<string, number> = {};
    let unidades = 0;

    this.ventas.forEach((v: any) => {
      const nombre = v.productos?.elemento || 'Sin nombre';
      mapa[nombre] = (mapa[nombre] || 0) + Number(v.cantidad);
      unidades += Number(v.cantidad);
    });

    const lista = Object.entries(mapa)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    const max = lista[0]?.cantidad || 1;

    this.topProductos = lista.map(p => ({
      ...p,
      porcentaje: unidades ? (p.cantidad / unidades) * 100 : 0,
      ancho: (p.cantidad / max) * 100
    }));
  }

  // =========================
  // 📈 Gráficas
  // =========================

  private renderGraficas() {
    if (!this.ventasChartRef || !this.gananciaChartRef || !this.donutChartRef) return;

    const ventasDia: Record<string, number> = {};
    const gananciaDia: Record<string, number> = {};

    this.ventas.forEach((v: any) => {
      const dia = this.iso(new Date(v.fecha));
      ventasDia[dia] = (ventasDia[dia] || 0) + Number(v.total);
      gananciaDia[dia] = (gananciaDia[dia] || 0) + Number(v.total) - Number(v.costo || 0);
    });

    const dias = Object.keys(ventasDia).sort();
    const etiquetas = dias.map(d =>
      this.fechaLocal(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    );

    const acento = this.css('--fb-accent');
    const info = this.css('--fb-info');
    const texto = this.css('--fb-muted');
    const linea = this.css('--fb-line');
    const fondo = this.css('--fb-surface');
    const neutro = this.css('--fb-surface-3');
    const fuente = this.css('--fb-font-body') || 'sans-serif';

    const dinero = (n: number) => '$ ' + Math.round(n).toLocaleString('es-CO');

    const ejes = {
      x: { grid: { display: false }, ticks: { color: texto, font: { family: fuente } }, border: { color: linea } },
      y: {
        grid: { color: linea },
        border: { display: false },
        ticks: {
          color: texto,
          font: { family: fuente },
          callback: (v: any) => (Number(v) >= 1000 ? Math.round(Number(v) / 1000) + ' k' : v)
        }
      }
    };

    const tooltip = { callbacks: { label: (ctx: any) => dinero(ctx.parsed.y ?? ctx.parsed) } };

    this.chartVentas?.destroy();
    this.chartVentas = new Chart(this.ventasChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: etiquetas,
        datasets: [{ label: 'Ventas', data: dias.map(d => ventasDia[d]), backgroundColor: acento, borderRadius: 6, maxBarThickness: 36 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip },
        scales: ejes as any
      }
    });

    this.chartGanancia?.destroy();
    this.chartGanancia = new Chart(this.gananciaChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: etiquetas,
        datasets: [{
          label: 'Ganancia',
          data: dias.map(d => gananciaDia[d]),
          borderColor: info,
          backgroundColor: info,
          pointRadius: 3,
          tension: 0.3,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip },
        scales: ejes as any
      }
    });

    this.chartDonut?.destroy();
    this.chartDonut = new Chart(this.donutChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Ganancia', 'Costo'],
        datasets: [{
          data: [this.totalGanancia, this.costoTotal],
          backgroundColor: [acento, neutro],
          borderColor: fondo,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx: any) => `${ctx.label}: ${dinero(ctx.parsed)}` } }
        }
      }
    });
  }

  // =========================
  // 🧰 Utilidades
  // =========================

  /** Fecha local en formato AAAA-MM-DD (sin el desfase de toISOString) */
  private iso(d: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  private fechaLocal(iso: string): Date {
    return new Date(iso + 'T00:00:00');
  }

  private css(nombre: string): string {
    return getComputedStyle(document.body).getPropertyValue(nombre).trim();
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }
}
