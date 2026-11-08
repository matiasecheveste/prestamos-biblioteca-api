/*
 * Préstamos de biblioteca — Matías Nicolás Echeveste Cardozo
 * Pruebas unitarias de validaciones y reglas.
 */
import { describe, expect, it } from 'vitest'
import { diasDeAtraso, hoyEn, multa, sumarDias } from '../src/dominio/reglas.js'
import { cedulaValida, isbnValido } from '../src/dominio/validaciones.js'

describe('cédula uruguaya', () => {
  it('acepta cédulas con dígito de control correcto', () => {
    expect(cedulaValida('12345672')).toBe(true)
    expect(cedulaValida('1234567')).toBe(false)
    expect(cedulaValida('11111111')).toBe(true)
    expect(cedulaValida('12345670')).toBe(false)
  })
  it('rechaza formatos inválidos', () => {
    expect(cedulaValida('1.234.567-2')).toBe(false)
    expect(cedulaValida('abc')).toBe(false)
  })
})

describe('ISBN-13', () => {
  it('valida el dígito de control', () => {
    expect(isbnValido('978-0-306-40615-7')).toBe(true)
    expect(isbnValido('9780306406158')).toBe(false)
    expect(isbnValido('1234567890123')).toBe(false)
  })
})

describe('fechas y multas', () => {
  it('suma días cruzando meses', () => {
    expect(sumarDias('2026-01-25', 14)).toBe('2026-02-08')
  })
  it('calcula atraso y multa', () => {
    expect(diasDeAtraso('2026-03-01', '2026-02-28')).toBe(0)
    expect(diasDeAtraso('2026-03-01', '2026-03-04')).toBe(3)
    expect(multa('2026-03-01', '2026-03-04')).toBe(30)
  })
})

describe('hoyEn', () => {
  it('usa la fecha de Montevideo aunque el servidor esté en UTC', () => {
    // 8 de noviembre 01:30 UTC = 7 de noviembre 22:30 en Uruguay (UTC−3).
    expect(hoyEn('America/Montevideo', new Date('2026-11-08T01:30:00Z'))).toBe('2026-11-07')
    expect(hoyEn('UTC', new Date('2026-11-08T01:30:00Z'))).toBe('2026-11-08')
  })
})
