/*
 * Préstamos de biblioteca — Matías Nicolás Echeveste Cardozo
 * Implementación del repositorio sobre PostgreSQL con consultas parametrizadas.
 */
import type pg from 'pg'
import type { Libro, Prestamo, Repositorio, Socio } from './repositorio.js'

const PRESTAMO = `id, libro_id AS "libroId", socio_id AS "socioId", to_char(desde, 'YYYY-MM-DD') AS desde,
  to_char(vence, 'YYYY-MM-DD') AS vence, to_char(devuelto_el, 'YYYY-MM-DD') AS "devueltoEl"`

export class RepositorioPostgres implements Repositorio {
  constructor(private readonly pool: pg.Pool) {}

  private async uno<T>(sql: string, valores: unknown[] = []): Promise<T | undefined> {
    const { rows } = await this.pool.query(sql, valores)
    return rows[0] as T | undefined
  }
  private async varios<T>(sql: string, valores: unknown[] = []): Promise<T[]> {
    return (await this.pool.query(sql, valores)).rows as T[]
  }

  listarLibros() {
    return this.varios<Libro & { disponibles: number }>(
      `SELECT l.*, l.ejemplares - COUNT(p.id)::int AS disponibles
         FROM libros l LEFT JOIN prestamos p ON p.libro_id = l.id AND p.devuelto_el IS NULL
        GROUP BY l.id ORDER BY l.titulo`,
    )
  }
  async crearLibro(d: Omit<Libro, 'id'>) {
    return (await this.uno<Libro>(
      'INSERT INTO libros (isbn, titulo, autor, ejemplares) VALUES ($1, $2, $3, $4) RETURNING *',
      [d.isbn, d.titulo, d.autor, d.ejemplares],
    ))!
  }
  buscarLibro(id: number) {
    return this.uno<Libro>('SELECT * FROM libros WHERE id = $1', [id])
  }
  buscarLibroPorIsbn(isbn: string) {
    return this.uno<Libro>('SELECT * FROM libros WHERE isbn = $1', [isbn])
  }
  async crearSocio(d: Omit<Socio, 'id'>) {
    return (await this.uno<Socio>('INSERT INTO socios (cedula, nombre) VALUES ($1, $2) RETURNING *', [d.cedula, d.nombre]))!
  }
  buscarSocio(id: number) {
    return this.uno<Socio>('SELECT * FROM socios WHERE id = $1', [id])
  }
  buscarSocioPorCedula(cedula: string) {
    return this.uno<Socio>('SELECT * FROM socios WHERE cedula = $1', [cedula])
  }
  prestamosAbiertosDeSocio(socioId: number) {
    return this.varios<Prestamo>(`SELECT ${PRESTAMO} FROM prestamos WHERE socio_id = $1 AND devuelto_el IS NULL`, [socioId])
  }
  async prestamosAbiertosDeLibro(libroId: number) {
    const fila = await this.uno<{ n: number }>(
      'SELECT COUNT(*)::int AS n FROM prestamos WHERE libro_id = $1 AND devuelto_el IS NULL',
      [libroId],
    )
    return fila?.n ?? 0
  }
  async crearPrestamo(d: Omit<Prestamo, 'id' | 'devueltoEl'>) {
    return (await this.uno<Prestamo>(
      `INSERT INTO prestamos (libro_id, socio_id, desde, vence) VALUES ($1, $2, $3, $4) RETURNING ${PRESTAMO}`,
      [d.libroId, d.socioId, d.desde, d.vence],
    ))!
  }
  buscarPrestamo(id: number) {
    return this.uno<Prestamo>(`SELECT ${PRESTAMO} FROM prestamos WHERE id = $1`, [id])
  }
  async cerrarPrestamo(id: number, fecha: string) {
    return (await this.uno<Prestamo>(`UPDATE prestamos SET devuelto_el = $2 WHERE id = $1 RETURNING ${PRESTAMO}`, [id, fecha]))!
  }
  vencidos(hoy: string) {
    return this.varios<Prestamo>(
      `SELECT ${PRESTAMO} FROM prestamos WHERE devuelto_el IS NULL AND vence < $1 ORDER BY vence`,
      [hoy],
    )
  }
}
