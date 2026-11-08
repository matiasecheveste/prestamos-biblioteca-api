/*
 * Préstamos de biblioteca — Matías Nicolás Echeveste Cardozo
 * Aplicación Express: rutas, validación de entrada con Zod, autenticación JWT y manejo de errores.
 */
import { timingSafeEqual } from 'node:crypto'
import express, { type NextFunction, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { DIAS_PRESTAMO, ErrorDeNegocio, hoyEn, MAXIMO_PRESTAMOS_ABIERTOS, multa, sumarDias } from './dominio/reglas.js'
import { cedulaValida, isbnValido } from './dominio/validaciones.js'
import type { Repositorio } from './repositorio.js'

export interface Configuracion {
  repositorio: Repositorio
  jwtSecreto: string
  claveBibliotecario: string
  hoy?: () => string
}

const esquemaLibro = z.object({
  isbn: z.string().refine(isbnValido, 'ISBN-13 inválido').transform((s) => s.replace(/-/g, '')),
  titulo: z.string().trim().min(1).max(200),
  autor: z.string().trim().min(1).max(120),
  ejemplares: z.number().int().min(1).max(500),
})
const esquemaSocio = z.object({
  cedula: z.string().regex(/^\d{7,8}$/, 'Cédula sin puntos ni guion').refine(cedulaValida, 'Dígito de control incorrecto'),
  nombre: z.string().trim().min(2).max(120),
})
const esquemaPrestamo = z.object({ libroId: z.number().int().positive(), socioId: z.number().int().positive() })
const esquemaSesion = z.object({ clave: z.string().min(1) })
const id = z.coerce.number().int().positive()

function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function crearApp({ repositorio: repo, jwtSecreto, claveBibliotecario, hoy = () => hoyEn() }: Configuracion) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '10kb' }))

  const autenticado = (req: Request, _res: Response, next: NextFunction) => {
    const [tipo, token] = (req.headers.authorization ?? '').split(' ')
    if (tipo !== 'Bearer' || !token) throw new ErrorDeNegocio('Falta el token de acceso', 401)
    try {
      jwt.verify(token, jwtSecreto, { algorithms: ['HS256'] })
    } catch {
      throw new ErrorDeNegocio('Token inválido o vencido', 401)
    }
    next()
  }

  app.get('/salud', (_req, res) => {
    res.json({ estado: 'ok' })
  })

  app.post('/sesion', (req, res) => {
    const { clave } = esquemaSesion.parse(req.body)
    if (!iguales(clave, claveBibliotecario)) throw new ErrorDeNegocio('Credenciales incorrectas', 401)
    const token = jwt.sign({ rol: 'bibliotecario' }, jwtSecreto, { algorithm: 'HS256', expiresIn: '8h' })
    res.json({ token })
  })

  app.get('/libros', async (_req, res) => {
    res.json(await repo.listarLibros())
  })

  app.post('/libros', autenticado, async (req, res) => {
    const datos = esquemaLibro.parse(req.body)
    if (await repo.buscarLibroPorIsbn(datos.isbn)) throw new ErrorDeNegocio('Ya existe un libro con ese ISBN')
    res.status(201).json(await repo.crearLibro(datos))
  })

  app.post('/socios', autenticado, async (req, res) => {
    const datos = esquemaSocio.parse(req.body)
    if (await repo.buscarSocioPorCedula(datos.cedula)) throw new ErrorDeNegocio('La cédula ya está registrada')
    res.status(201).json(await repo.crearSocio(datos))
  })

  app.post('/prestamos', autenticado, async (req, res) => {
    const { libroId, socioId } = esquemaPrestamo.parse(req.body)
    const libro = await repo.buscarLibro(libroId)
    if (!libro) throw new ErrorDeNegocio('Libro inexistente', 404)
    if (!(await repo.buscarSocio(socioId))) throw new ErrorDeNegocio('Socio inexistente', 404)

    const abiertos = await repo.prestamosAbiertosDeSocio(socioId)
    const desde = hoy()
    if (abiertos.some((p) => p.vence < desde)) throw new ErrorDeNegocio('El socio tiene préstamos vencidos')
    if (abiertos.length >= MAXIMO_PRESTAMOS_ABIERTOS) {
      throw new ErrorDeNegocio(`Máximo de ${MAXIMO_PRESTAMOS_ABIERTOS} préstamos simultáneos`)
    }
    if ((await repo.prestamosAbiertosDeLibro(libroId)) >= libro.ejemplares) throw new ErrorDeNegocio('Sin ejemplares disponibles')

    res.status(201).json(await repo.crearPrestamo({ libroId, socioId, desde, vence: sumarDias(desde, DIAS_PRESTAMO) }))
  })

  app.post('/prestamos/:id/devolucion', autenticado, async (req, res) => {
    const prestamo = await repo.buscarPrestamo(id.parse(req.params.id))
    if (!prestamo) throw new ErrorDeNegocio('Préstamo inexistente', 404)
    if (prestamo.devueltoEl) throw new ErrorDeNegocio('El préstamo ya fue devuelto')
    const fecha = hoy()
    const cerrado = await repo.cerrarPrestamo(prestamo.id, fecha)
    res.json({ ...cerrado, multa: multa(prestamo.vence, fecha) })
  })

  app.get('/prestamos/vencidos', autenticado, async (_req, res) => {
    res.json(await repo.vencidos(hoy()))
  })

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta inexistente' })
  })

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Datos inválidos', detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })) })
    } else if (err instanceof ErrorDeNegocio) {
      res.status(err.estado).json({ error: err.message })
    } else if (err instanceof SyntaxError) {
      res.status(400).json({ error: 'JSON mal formado' })
    } else {
      console.error(err)
      res.status(500).json({ error: 'Error interno' })
    }
  })

  return app
}
