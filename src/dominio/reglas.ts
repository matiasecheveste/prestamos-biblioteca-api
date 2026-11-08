/*
 * Préstamos de biblioteca — Matías Nicolás Echeveste Cardozo
 * Reglas de negocio de los préstamos.
 */

export const MAXIMO_PRESTAMOS_ABIERTOS = 3
export const DIAS_PRESTAMO = 14
export const MULTA_POR_DIA = 10 // pesos uruguayos

export class ErrorDeNegocio extends Error {
  constructor(
    message: string,
    readonly estado = 409,
  ) {
    super(message)
  }
}

/** Fecha AAAA-MM-DD en la zona horaria de la biblioteca (por defecto Montevideo), sin depender de la del servidor. */
export function hoyEn(zona = 'America/Montevideo', ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export function diasDeAtraso(vence: string, devueltoEl: string): number {
  const ms = Date.parse(`${devueltoEl}T00:00:00Z`) - Date.parse(`${vence}T00:00:00Z`)
  return Math.max(0, Math.round(ms / 86_400_000))
}

export function multa(vence: string, devueltoEl: string): number {
  return diasDeAtraso(vence, devueltoEl) * MULTA_POR_DIA
}
