import { Component, OnInit, AfterViewInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { addIcons } from 'ionicons';
import { Chart } from 'chart.js/auto';
import { ViewChild, ElementRef } from '@angular/core';
import { ThemeService } from '../../services/theme';
import { AuthService } from 'src/app/services/auth.service';
import { IonMenuButton } from '@ionic/angular/standalone';
import flatpickr from 'flatpickr';
import {NotificationService} from '../../services/notification.service';

import { 
  analyticsOutline,
  calendarOutline,
  cashOutline, 
  cubeOutline,
  chatbubbleOutline,
  peopleOutline,
  settingsOutline,
  receiptOutline,
  logOutOutline,
  sunnyOutline,
  moonOutline
} from 'ionicons/icons';
import { first } from 'rxjs';
import { IONIC_IMPORTS } from 'src/app/shared/ionic-imports';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule, ...IONIC_IMPORTS, IonMenuButton],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})


export class HomePage implements OnInit, AfterViewInit {

  currentRoute = '';




  @ViewChild('ventasChart') ventasChartRef!: ElementRef;
  @ViewChild('gananciaChart') gananciaChartRef!: ElementRef;
  @ViewChild('donutChart') donutChartRef!: ElementRef;
  @ViewChild('fechaInicioInput') fechaInicioInput!: ElementRef;
  @ViewChild('calendar') calendarRef!: ElementRef;

  showCalendar = false;
  picker: any;

  toggleCalendar() {
    this.showCalendar = !this.showCalendar;

    if (this.showCalendar) {
      setTimeout(() => this.initCalendar(), 0);
    }
  }

  initCalendar() {
    if (!this.calendarRef) return;

    if (this.picker) {
      this.picker.destroy();
    }

    this.picker = flatpickr(this.calendarRef.nativeElement, {
      inline: true,
      mode: 'range',
      dateFormat: 'Y-m-d',
      showMonths: 1,
      locale: { firstDayOfWeek: 0 },

      onReady: (_selectedDates, _dateStr, instance) => {
        const calendar = instance.calendarContainer;

        // 🔥 evitar duplicados si se reinicializa
        if (calendar.querySelector('.calendar-close-btn')) return;

        // 🔥 BOTÓN CERRAR
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.className = 'calendar-close-btn';

        closeBtn.onclick = () => {
          this.showCalendar = false;
        };

        // 👇 lo agregamos arriba a la derecha
        calendar.style.position = 'relative';
        calendar.appendChild(closeBtn);
      },

      onChange: (selectedDates: Date[]) => {
        if (selectedDates.length === 2) {
          this.fechaInicio = this.formatoFecha(selectedDates[0]);
          this.fechaFin = this.formatoFecha(selectedDates[1]);

          this.actualizarTextoFecha();
          this.cargarDatos();

          this.showCalendar = false;
        }
      }
    });
  }

  fechaTexto: string = '';

  abrirPicker = false;
  rangoFechas: any = null;
  tempInicio: string = '';
  tempFin: string = '';
  totalVentasAnterior = 0;
  crecimientoVentas = 0;

  procesarGraficas() {
    const ventasPorDia: any = {};
    const gananciaPorDia: any = {};

    this.ventas.forEach((v: any) => {
      const dia = v.fecha.split('T')[0];

      if (!ventasPorDia[dia]) {
        ventasPorDia[dia] = 0;
        gananciaPorDia[dia] = 0;
      }

      ventasPorDia[dia] += Number(v.total);
      gananciaPorDia[dia] += Number(v.total) - Number(v.costo);
    });

    this.renderCharts(ventasPorDia, gananciaPorDia);
  }

  calcularComparacion() {
    if (!this.fechaInicio || !this.fechaFin) return;

    const inicio = this.parseFechaLocal(this.fechaInicio);
    const fin = this.parseFechaLocal(this.fechaFin, true);

    const diff = fin.getTime() - inicio.getTime();

    const inicioAnterior = new Date(inicio.getTime() - diff);
    const finAnterior = new Date(fin.getTime() - diff);

    this.dataService.getVentas(
      this.formatoFecha(inicioAnterior),
      this.formatoFecha(finAnterior)
    ).then((ventasAnt: any[]) => {

      this.totalVentasAnterior = Math.round(
        ventasAnt.reduce((a, b) => a + Number(b.total), 0)
      );

      if (this.totalVentasAnterior > 0) {
        this.crecimientoVentas = Math.round(
          ((this.totalVentas - this.totalVentasAnterior) /
          this.totalVentasAnterior) * 100
        );
      }
    });
  }


  // 👉 cuando cambia fecha
  onFechaChange(event: any) {
    const value = event.detail.value;

    if (value?.from && value?.to) {
      this.tempInicio = value.from.split('T')[0];
      this.tempFin = value.to.split('T')[0];
    }
  }

  aplicarFechas() {
    if (!this.tempInicio || !this.tempFin) return;

    this.fechaInicio = this.tempInicio.split('T')[0];
    this.fechaFin = this.tempFin.split('T')[0];

    this.actualizarTextoFecha();
    this.cargarDatos();

    this.abrirPicker = false;
  }

  cerrarCalendario() {
    this.abrirPicker = false;
  }

  // 👉 cerrar y aplicar
  cerrarPicker() {
    this.abrirPicker = false;

    this.actualizarTextoFecha();
    this.cargarDatos();
  }

  setHoy() {
    const hoy = this.formatoFecha(new Date());

    this.fechaInicio = hoy;
    this.fechaFin = hoy;

    this.tempInicio = hoy;
    this.tempFin = hoy;

    this.actualizarTextoFecha();
    this.cargarDatos();
  }

  setSemana() {
    const hoy = new Date();
    const inicio = new Date();
    inicio.setDate(hoy.getDate() - 7);

    this.fechaInicio = this.formatoFecha(inicio);
    this.fechaFin = this.formatoFecha(hoy);

    this.tempInicio = this.fechaInicio;
    this.tempFin = this.fechaFin;

    this.actualizarTextoFecha();
    this.cargarDatos();
  }

  setMes() {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    this.fechaInicio = this.formatoFecha(inicio);
    this.fechaFin = this.formatoFecha(hoy);

    this.tempInicio = this.fechaInicio;
    this.tempFin = this.fechaFin;

    this.actualizarTextoFecha();
    this.cargarDatos();
  }

  private seleccionandoFin = false;

  // 👉 seleccionar inicio
  onFechaInicio(event: any) {
    this.fechaInicio = event.target.value;

    this.seleccionandoFin = true;

  }

  // 👉 seleccionar fin
  onFechaFin(event: any) {
    this.fechaFin = event.target.value;

    this.actualizarTextoFecha();
    this.cargarDatos();
  }

  // 🔥 helper: parsea "YYYY-MM-DD" como medianoche LOCAL, no UTC
  private parseFechaLocal(fechaStr: string, finDelDia = false): Date {
    return new Date(fechaStr + (finDelDia ? 'T23:59:59.999' : 'T00:00:00'));
  }

  // 👉 mostrar bonito
  actualizarTextoFecha() {
    if (!this.fechaInicio || !this.fechaFin) return;

    const opciones: any = { day: '2-digit', month: 'short' };

    const inicio = this.parseFechaLocal(this.fechaInicio)
      .toLocaleDateString('es-ES', opciones);
    const fin = this.parseFechaLocal(this.fechaFin)
      .toLocaleDateString('es-ES', opciones);

    this.fechaTexto = `${inicio} - ${fin}`;
  }


  filtro: string = 'mes';
  fechaInicio!: string;
  fechaFin!: string;

  cambiarFiltro() {
    const hoy = new Date();

    if (this.filtro === 'hoy') {
      this.fechaInicio = this.formatoFecha(hoy);
      this.fechaFin = this.formatoFecha(hoy);
    }

    if (this.filtro === 'semana') {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 7);

      this.fechaInicio = this.formatoFecha(inicio);
      this.fechaFin = this.formatoFecha(hoy);
    }

    if (this.filtro === 'mes') {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      this.fechaInicio = this.formatoFecha(inicio);
      this.fechaFin = this.formatoFecha(hoy);
    }

    this.cargarDatos();
  }

  formatoFecha(fecha: Date) {
    return fecha.toISOString().split('T')[0];
  }

  ventas: any[] = [];

  totalVentas = 0;
  totalGanancia = 0;
  ventasMes = 0;

  chartVentas: any;
  chartGanancia: any;

  onVentaInsert(nuevaVenta: any) {

    // 1. validar si entra en el rango actual
    const fechaVenta = new Date(nuevaVenta.fecha);
    const inicio = this.parseFechaLocal(this.fechaInicio);
    const fin = this.parseFechaLocal(this.fechaFin, true);

    if (fechaVenta < inicio || fechaVenta > fin) return;

    // 2. agregar al array
    this.ventas.push(nuevaVenta);

    // 3. actualizar KPIs (sin recalcular todo)
    this.totalVentas = Math.round(this.totalVentas + Number(nuevaVenta.total));
    this.totalGanancia = Math.round(
      this.totalGanancia + Number(nuevaVenta.total) - Number(nuevaVenta.costo)
    );

    // 4. actualizar gráficas incremental
    this.updateChartsIncremental(nuevaVenta);

    // 5. actualizar top productos
    this.updateTopProductos(nuevaVenta);
  }

  updateChartsIncremental(v: any) {

    const fecha = new Date(v.fecha);
    const key = `${fecha.getFullYear()}-${fecha.getMonth() + 1}`;

    // 👉 VENTAS (bar)
    const index = this.chartVentas.data.labels.indexOf(key);

    if (index !== -1) {
      this.chartVentas.data.datasets[0].data[index] += Number(v.total);
    } else {
      this.chartVentas.data.labels.push(key);
      this.chartVentas.data.datasets[0].data.push(Number(v.total));
    }

    this.chartVentas.update();

    // 👉 GANANCIA (line)
    const ganancia = Number(v.total) - Number(v.costo);

    const index2 = this.chartGanancia.data.labels.indexOf(key);

    if (index2 !== -1) {
      this.chartGanancia.data.datasets[0].data[index2] += ganancia;
    } else {
      this.chartGanancia.data.labels.push(key);
      this.chartGanancia.data.datasets[0].data.push(ganancia);
    }

    this.chartGanancia.update();

    // 👉 DONUT
    this.chartDonut.data.datasets[0].data = [
      this.totalGanancia,
      this.totalVentas - this.totalGanancia
    ];

    this.chartDonut.update();
  }

  updateTopProductos(v: any) {

    const nombre = v.productos?.elemento || 'Sin nombre';

    const existe = this.topProductos.find(p => p.nombre === nombre);

    if (existe) {
      existe.cantidad += v.cantidad;
    } else {
      this.topProductos.push({
        nombre,
        cantidad: v.cantidad,
        porcentaje: 0
      });
    }

    // recalcular porcentaje rápido
    const total = this.ventas.length;

    this.topProductos.forEach(p => {
      p.porcentaje = (p.cantidad / total) * 100;
    });

    this.topProductos.sort((a, b) => b.cantidad - a.cantidad);
    this.topProductos = this.topProductos.slice(0, 5);
  }

  async cargarDatos() {

    const ventas = await this.dataService.getVentas(
      this.fechaInicio,
      this.fechaFin
    );

    this.ventas = ventas;

     // KPIs
    this.totalVentas = Math.round(
      ventas.reduce((a: number, b: any) => a + Number(b.total), 0)
    );

    this.totalGanancia = Math.round(
      ventas.reduce(
        (a: number, b: any) => a + (Number(b.total) - Number(b.costo)),
        0
      )
    );

    // 👇 AGRUPAR DATOS PARA GRÁFICAS
    const ventasPorMes: any = {};
    const gananciaPorMes: any = {};

    ventas.forEach((v: any) => {
      const fecha = new Date(v.fecha);
      const key = `${fecha.getFullYear()}-${fecha.getMonth() + 1}`;

      if (!ventasPorMes[key]) {
        ventasPorMes[key] = 0;
        gananciaPorMes[key] = 0;
      }

      ventasPorMes[key] += Number(v.total);
      gananciaPorMes[key] += Number(v.total) - Number(v.costo);
    });

    // 👇 RENDER CHARTS
    this.renderCharts(ventasPorMes, gananciaPorMes);

    // 👇 TOP PRODUCTOS
    this.procesarTopProductos();

    // 👇 DONUT
    this.renderDonut();

    this.calcularComparacion();
    
    this.procesarGraficas();

  }

  chartDonut: any;

  renderDonut() {
    if (this.chartDonut) {
      this.chartDonut.destroy();
      this.chartDonut = null;
    }

    this.chartDonut = new Chart(this.donutChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Ganancia', 'Costo'],
        datasets: [{
          data: [
            this.totalGanancia,
            this.totalVentas - this.totalGanancia
          ]
        }]
      }
    });
  }

  topProductos: any[] = [];

  procesarTopProductos() {
    const mapa: any = {};

    this.ventas.forEach((v: any) => {
      const nombre = v.productos?.elemento || 'Sin nombre';

      if (!mapa[nombre]) {
        mapa[nombre] = 0;
      }

      mapa[nombre] += v.cantidad;
    });

  this.topProductos = Object.keys(mapa)
    .map(nombre => ({
      nombre,
      cantidad: mapa[nombre],
      porcentaje: (mapa[nombre] / this.ventas.length) * 100
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);
  }
  
  renderCharts(ventasData: any, gananciaData: any) {
    const labels = Object.keys(ventasData);

    // 🔥 destruir SIEMPRE antes
    if (this.chartVentas) {
      this.chartVentas.destroy();
      this.chartVentas = null;
    }

    if (this.chartGanancia) {
      this.chartGanancia.destroy();
      this.chartGanancia = null;
    }

    this.chartVentas = new Chart(this.ventasChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Ventas',
          data: Object.values(ventasData)
        }]
      }
    });

    this.chartGanancia = new Chart(this.gananciaChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Ganancia',
          data: Object.values(gananciaData)
        }]
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.cargarDatos();
    }, 200);
  }

  channel: any;

  ngOnInit() {

    // Escuchar la base de datos en vivo. Si cae una venta externa, el cel vibra/suena
    this.dataService.listenVentasRealtime((nuevaVenta) => {
      this.notiService.lanzarNotificacion(
        '🛒 Nueva venta en otra caja',
        `Se vendieron artículos por un total de $${nuevaVenta.total}`
      );
    });

    this.themeService.isDark$.subscribe(value => {
      this.isDark = value;
    });

    this.currentRoute = this.router.url;

    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    this.fechaInicio = this.formatoFecha(inicioMes);
    this.fechaFin = this.formatoFecha(hoy);

    this.actualizarTextoFecha();

    this.cargarDatos();

    // 🔥 Eliminar canal previo si existe
    const existingChannel = this.dataService.supabaseService.supabase
      .getChannels()
      .find(c => c.topic === 'realtime:ventas-live');

    if (existingChannel) {
      this.dataService.supabaseService.supabase.removeChannel(existingChannel);
    }

    // 🔥 Crear canal correctamente
    this.channel = this.dataService.supabaseService.supabase
      .channel('ventas-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ventas'
        },
        (payload) => {
          this.onVentaInsert(payload.new);
        }
      )
      .subscribe();
  }

  // 🔥 IMPORTANTE
  ngOnDestroy() {
    if (this.channel) {
      this.dataService.supabaseService.supabase.removeChannel(this.channel);
    }
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }

  darkMode = false;
  isDark = false;

  constructor(private router: Router, 
    private dataService: DataService, 
    public themeService: ThemeService,
    public auth: AuthService,
    private notiService: NotificationService
  ) {
    /* 👇 REGISTRAR ICONOS */
    addIcons({
      analyticsOutline,
      cubeOutline,
      chatbubbleOutline,
      peopleOutline,
      settingsOutline,
      logOutOutline,
      sunnyOutline,
      moonOutline,
      calendarOutline,
      receiptOutline,
      cashOutline
    });
  }

  toggleDark(event: any) {
    this.isDark = event.target.checked;

    if (this.isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }

    localStorage.setItem('darkMode', this.isDark ? 'true' : 'false');
  }

  logout() {
    localStorage.clear();
    this.router.navigateByUrl('/');
  }
}