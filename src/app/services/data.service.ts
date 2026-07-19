import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(public supabaseService: SupabaseService) {}

  listenVentasRealtime(callback: (payload: any) => void) {
    return this.supabaseService.supabase
      .channel('ventas-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ventas' },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  }

  // 🔍 OBTENER PRODUCTOS
  async getProductos() {
    const { data, error } = await this.supabaseService.supabase
      .from('productos')
      .select(`
        id,
        elemento,
        marca,
        precio,
        costo,
        stock,
        codigo,
        codigo_barras,
        numero_inventario,
        proveedor,
        moto,
        porcentaje_ganancia,
        imagen_url,
        categoria_id,
        ubicacion,
        categorias_repuestos ( nombre )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    return data;
  }

    // ==========================================
  // 🏍️ MÓDULO: HISTORIAL DE MOTOS (TALLER)
  // ==========================================

  // ➕ 1. REGISTRAR ENTRADA AL TIERRA / HISTORIAL
  async agregarHistorialMoto(historial: {
    placa: string;
    descripcion_servicio: string;
    repuestos_utilizados: any[];
    total_servicio: number;
  }) {
    const { data: userData } = await this.supabaseService.supabase.auth.getUser();
    
    const { data, error } = await this.supabaseService.supabase
      .from('historial_motos')
      .insert([
        {
          placa: historial.placa.trim().toUpperCase(), // Siempre en mayúsculas
          descripcion_servicio: historial.descripcion_servicio,
          repuestos_utilizados: historial.repuestos_utilizados,
          total_servicio: historial.total_servicio,
          vendedor_id: userData?.user?.id
        }
      ])
      .select();

    if (error) {
      console.error('Error insertando historial de moto:', error);
      throw error;
    }
    return data;
  }

  // 🔍 2. CONSULTAR HISTORIAL COMPLETO POR PLACA
  async getHistorialPorPlaca(placa: string) {
    if (!placa) return [];

    const { data, error } = await this.supabaseService.supabase
      .from('historial_motos')
      .select('*')
      .eq('placa', placa.trim().toUpperCase())
      .order('fecha', { ascending: false }); // Las más recientes primero

    if (error) {
      console.error('Error obteniendo historial de la placa:', error);
      return [];
    }
    return data;
  }

  async buscarProductosGlobal(texto: string) {

    if (!texto) return this.getProductos();

    const palabras = texto
      .toLowerCase()
      .trim()
      .split(' ')
      .filter(p => p);

    // 🔥 Construimos filtro dinámico
    let query = this.supabaseService.supabase
      .from('productos')
      .select(`
        *,
        categorias_repuestos ( nombre )
      `);

    palabras.forEach(p => {
      query = query.or(`
        elemento.ilike.%${p}%,
        marca.ilike.%${p}%,
        codigo.ilike.%${p}%,
        proveedor.ilike.%${p}%,
        moto.ilike.%${p}%,
        numero_inventario.ilike.%${p}%
      `);
    });

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return [];
    }

    return data;
  }

  async filtrarProductos({
    stock,
    categoria,
    precioMin,
    precioMax
  }: any) {

    let query = this.supabaseService.supabase
      .from('productos')
      .select(`*, categorias_repuestos(nombre)`);

    // 📦 STOCK
    if (stock === 'bajo') query = query.lte('stock', 5);
    if (stock === 'sin') query = query.eq('stock', 0);

    // 💰 PRECIO
    if (precioMin) query = query.gte('precio', precioMin);
    if (precioMax) query = query.lte('precio', precioMax);

    // 🏷️ CATEGORIA
    if (categoria) query = query.eq('categoria_id', categoria);

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return [];
    }

    return data;
  }

  // ✏️ EDITAR
  async actualizarProducto(id: string, producto: any, file?: File) {

    if (file) {
      const url = await this.subirImagen(file);
      producto.imagen_url = url;
    }

    const costo = Number(producto.costo) || 0;
    const precio = Number(producto.precio) || 0;

    producto.porcentaje_ganancia =
      costo > 0 ? ((precio - costo) / costo) * 100 : 0;

    if (!producto.codigo_barras || producto.codigo_barras.trim() === '') {
    producto.codigo_barras = null;
    }

    if (!producto.imagen_url || producto.imagen_url.trim() === '') {
      producto.imagen_url = null;
    }

    delete producto.categorias_repuestos; // 🔥 ELIMINAR RELACIÓN ANIDADA

    const { error } = await this.supabaseService.supabase
      .from('productos')
      .update(producto) // 🔥 UPDATE
      .eq('id', id);    // 🔥 CLAVE

    if (error) console.error('ERROR UPDATE:', error);
  }

  async actualizarStock(id: string, stock: number) {
    const { error } = await this.supabaseService.supabase
      .from('productos')
      .update({ stock })
      .eq('id', id);

    if (error) console.error(error);
  }

  // ➕ CREAR CON IMAGEN
  async crearProducto(producto: any, file?: File) {

    if (file) {
      const url = await this.subirImagen(file);
      producto.imagen_url = url;
    }

    const costo = Number(producto.costo) || 0;
    const precio = Number(producto.precio) || 0;

    producto.porcentaje_ganancia =
      costo > 0 ? ((precio - costo) / costo) * 100 : 0;

    // 🔥 FIX: convertir strings vacíos en null para no violar UNIQUE constraints
      if (!producto.codigo_barras || producto.codigo_barras.trim() === '') {
        producto.codigo_barras = null;
      }

      if (!producto.imagen_url || producto.imagen_url.trim() === '') {
        producto.imagen_url = null;
      }

    // 🔥 SOLUCIÓN AL BUG: Si el id viene nulo, indefinido o vacío, lo eliminamos del objeto
    if (!producto.id) {
      delete producto.id;
    }

    delete producto.categorias_repuestos;

    const { data, error } = await this.supabaseService.supabase
      .from('productos')
      .insert([producto])
      .select();

    if (error) {
      console.error('ERROR INSERT:', error);
      throw error;
    }

    return data;
  }

  async eliminarProducto(id: string) {

  return await this.supabaseService.supabase
    .from('productos')
    .delete()
    .eq('id', id);

}

  // 📷 SUBIR IMAGEN
  async subirImagen(file: File) {
    const nombre = `${Date.now()}-${file.name}`;

    const { data, error } = await this.supabaseService.supabase
      .storage
      .from('productos')
      .upload(nombre, file);

    if (error) {
      console.error(error);
      return null;
    }

    const { data: publicUrl } = this.supabaseService.supabase
      .storage
      .from('productos')
      .getPublicUrl(nombre);

    return publicUrl.publicUrl;
  }

  async getProductoById(id: string) {

    const { data } = await this.supabaseService.supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single();

    return data;
  }

  // ==========================================
  // 📂 MÓDULO: CATEGORÍAS DE REPUESTOS
  // ==========================================

  async getCategorias() {
    const { data, error } = await this.supabaseService.supabase
      .from('categorias_repuestos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error obteniendo categorías:', error);
      return [];
    }
    return data;
  }

  async crearCategoria(nombre: string) {
    const { data, error } = await this.supabaseService.supabase
      .from('categorias_repuestos')
      .insert([{ nombre: nombre.trim() }])
      .select();

    if (error) {
      console.error('Error creando categoría:', error);
      throw error;
    }
    return data;
  }

  async actualizarCategoria(id: string, nombre: string) {
    const { error } = await this.supabaseService.supabase
      .from('categorias_repuestos')
      .update({ nombre: nombre.trim() })
      .eq('id', id);

    if (error) {
      console.error('Error actualizando categoría:', error);
      throw error;
    }
  }

  async eliminarCategoria(id: string) {
    const { error } = await this.supabaseService.supabase
      .from('categorias_repuestos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando categoría:', error);
      throw error;
    }
  }

  async getVentas(fechaInicio?: string, fechaFin?: string) {

    let query = this.supabaseService.supabase
      .from('ventas')
      .select('*, productos(*)');

    if (fechaInicio && fechaFin) {

      // 🧠 convertir a fecha LOCAL (Colombia)
      const inicioLocal = new Date(fechaInicio + 'T00:00:00');
      const finLocal = new Date(fechaFin + 'T23:59:59');

      // 🔥 convertir a UTC (lo que usa Supabase)
      const inicioUTC = new Date(inicioLocal.getTime() - inicioLocal.getTimezoneOffset() * 60000);
      const finUTC = new Date(finLocal.getTime() - finLocal.getTimezoneOffset() * 60000);

      query = query
        .gte('fecha', inicioUTC.toISOString())
        .lte('fecha', finUTC.toISOString());
    }

    const { data, error } = await query.order('fecha', { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }

    return data;
  }

}