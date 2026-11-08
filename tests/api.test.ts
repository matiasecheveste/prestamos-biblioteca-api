/*
 * Préstamos de biblioteca — Matías Nicolás Echeveste Cardozo
 * Pruebas de integración de la API con Supertest sobre el repositorio en memoria.
 */
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { crearApp } from '../src/app.js'
import { RepositorioEnMemoria } from '../src/repositorio.js'

const CLAVE = 'clave-de-prueba'
let fecha = '2026-03-01'
let app: ReturnType<typeof crearApp>
let token: string

const auth = () => ({ Authorization: `Bearer ${token}` })

beforeEach(async () => {
  fecha = '2026-03-01'
  app = crearApp({
    repositorio: new RepositorioEnMemoria(),
    jwtSecreto: 'x'.repeat(32),
    claveBibliotecario: CLAVE,
    hoy: () => fecha,
  })
  token = (await request(app).post('/sesion').send({ clave: CLAVE })).body.token
})

async function libro(ejemplares = 1) {
  return (await request(app).post('/libros').set(auth()).send({ isbn: '978-0-306-40615-7', titulo: 'Física', autor: 'Autor', ejemplares })).body
}
async function socio(cedula = '12345672') {
  return (await request(app).post('/socios').set(auth()).send({ cedula, nombre: 'Ana Pérez' })).body
}

describe('autenticación', () => {
  it('rechaza claves incorrectas y rutas protegidas sin token', async () => {
    expect((await request(app).post('/sesion').send({ clave: 'otra' })).status).toBe(401)
    expect((await request(app).post('/libros').send({})).status).toBe(401)
    expect((await request(app).post('/libros').set({ Authorization: 'Bearer basura' }).send({})).status).toBe(401)
  })
})

describe('libros y socios', () => {
  it('crea un libro y lo lista con disponibilidad', async () => {
    const l = await libro(2)
    expect(l.isbn).toBe('9780306406157')
    const lista = await request(app).get('/libros')
    expect(lista.body).toEqual([expect.objectContaining({ id: l.id, disponibles: 2 })])
  })
  it('valida la entrada y devuelve los campos con error', async () => {
    const r = await request(app).post('/socios').set(auth()).send({ cedula: '12345670', nombre: 'A' })
    expect(r.status).toBe(400)
    expect(r.body.detalles.map((d: { campo: string }) => d.campo).sort()).toEqual(['cedula', 'nombre'])
  })
  it('impide duplicados', async () => {
    await socio()
    expect((await request(app).post('/socios').set(auth()).send({ cedula: '12345672', nombre: 'Otra' })).status).toBe(409)
  })
})

describe('préstamos', () => {
  it('presta, controla disponibilidad y cobra multa por atraso', async () => {
    const l = await libro(1)
    const s1 = await socio('12345672')
    const s2 = await socio('11111111')
    const p = await request(app).post('/prestamos').set(auth()).send({ libroId: l.id, socioId: s1.id })
    expect(p.status).toBe(201)
    expect(p.body.vence).toBe('2026-03-15')

    const sinStock = await request(app).post('/prestamos').set(auth()).send({ libroId: l.id, socioId: s2.id })
    expect(sinStock.status).toBe(409)

    fecha = '2026-03-18'
    expect((await request(app).get('/prestamos/vencidos').set(auth())).body).toHaveLength(1)
    const dev = await request(app).post(`/prestamos/${p.body.id}/devolucion`).set(auth())
    expect(dev.body).toMatchObject({ devueltoEl: '2026-03-18', multa: 30 })
    expect((await request(app).post(`/prestamos/${p.body.id}/devolucion`).set(auth())).status).toBe(409)
  })
  it('limita los préstamos simultáneos por socio', async () => {
    const l = await libro(10)
    const s = await socio()
    for (let i = 0; i < 3; i++) await request(app).post('/prestamos').set(auth()).send({ libroId: l.id, socioId: s.id })
    const cuarto = await request(app).post('/prestamos').set(auth()).send({ libroId: l.id, socioId: s.id })
    expect(cuarto.status).toBe(409)
    expect(cuarto.body.error).toMatch(/Máximo/)
  })
  it('responde 404 a recursos y rutas inexistentes', async () => {
    expect((await request(app).post('/prestamos').set(auth()).send({ libroId: 9, socioId: 9 })).status).toBe(404)
    expect((await request(app).get('/nada')).status).toBe(404)
  })
})

describe('pedidos mal formados', () => {
  it('responde 400 ante JSON inválido y 413 ante cuerpos demasiado grandes, sin errores internos', async () => {
    const malformado = await request(app).post('/sesion').set('Content-Type', 'application/json').send('{"clave":')
    expect(malformado.status).toBe(400)
    const grande = await request(app).post('/sesion').send({ clave: 'x'.repeat(20_000) })
    expect(grande.status).toBe(413)
    expect(grande.body.error).toBe('El cuerpo del pedido es demasiado grande')
  })
})
