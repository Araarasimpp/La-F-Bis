/**
 * Umbral de "stock bajo", configurable en Configuración.
 * Por defecto 1: en esta tienda lo normal es tener 1 unidad de cada repuesto,
 * así que solo se alerta cuando queda 1 o menos.
 */
export const CLAVE_STOCK_MINIMO = 'stock_minimo';

export function umbralStock(): number {
  const guardado = localStorage.getItem(CLAVE_STOCK_MINIMO);
  const valor = Number(guardado);
  return guardado !== null && Number.isFinite(valor) && valor >= 0 ? valor : 1;
}
