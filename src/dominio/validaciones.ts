/*
 * Préstamos de biblioteca — Matías Nicolás Echeveste Cardozo
 * Validación de cédula de identidad uruguaya e ISBN-13.
 */

const PESOS_CEDULA = [2, 9, 8, 7, 6, 3, 4]

/** Verifica el dígito de control de una cédula uruguaya (7 u 8 dígitos, sin puntos ni guion). */
export function cedulaValida(cedula: string): boolean {
  if (!/^\d{7,8}$/.test(cedula)) return false
  const digitos = cedula.padStart(8, '0').split('').map(Number)
  const control = digitos.pop()!
  const suma = digitos.reduce((acc, d, i) => acc + d * PESOS_CEDULA[i]!, 0)
  return (10 - (suma % 10)) % 10 === control
}

/** Verifica un ISBN-13 (admite guiones). */
export function isbnValido(isbn: string): boolean {
  const limpio = isbn.replace(/-/g, '')
  if (!/^97[89]\d{10}$/.test(limpio)) return false
  const suma = limpio
    .split('')
    .map(Number)
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
  return suma % 10 === 0
}
