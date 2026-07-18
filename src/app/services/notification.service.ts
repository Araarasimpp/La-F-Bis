import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor() {
    this.solicitarPermisos();
  }

  // 🔐 Solicita permiso al usuario al abrir la app (Requisito Android 13+)
  async solicitarPermisos() {
    const info = await LocalNotifications.checkPermissions();
    if (info.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
  }

  // 🔔 FUNCIÓN GENÉRICA PARA LANZAR NOTIFICACIONES
  async lanzarNotificacion(titulo: string, mensaje: string, idCustom: number = 1) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: titulo,
            body: mensaje,
            id: idCustom, // ID único para que no se encima con otras
            schedule: { at: new Date(Date.now() + 500) }, // Se ejecuta 500ms después
            sound: 'default', // Sonido por defecto del celular
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (error) {
      console.error('Error al lanzar notificación local:', error);
    }
  }

  // 🚨 NOTIFICACIÓN ESPECÍFICA: STOCK BAJO
  notificarStockBajo(producto: string, stockRestante: number) {
    this.lanzarNotificacion(
      '⚠️ Alerta de Inventario',
      `El producto "${producto}" tiene un stock bajo. Quedan solo ${stockRestante} unidades.`,
      Math.floor(Math.random() * 10000)
    );
  }

  // 💰 NOTIFICACIÓN ESPECÍFICA: EXITO DE VENTA
  notificarVentaExitosa(total: number) {
    this.lanzarNotificacion(
      '✅ Venta Registrada',
      `Se ha procesado una nueva venta por un valor total de $${total.toLocaleString()}`,
      Math.floor(Math.random() * 10000)
    );
  }
}