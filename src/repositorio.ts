/*
 * Préstamos de biblioteca — Matías Nicolás Echeveste Cardozo
 * Contrato de persistencia e implementación en memoria (usada en pruebas y demostraciones).
 */

export interface Libro { id: number; isbn: string; titulo: string; autor: string; ejemplares: number }
export interface Socio { id: number; cedula: string; nombre: string }
export interface Prestamo {
  id: number
  libroId: number
  socioId: number
  desde: string
  vence: string
  devueltoEl: string | null
}

export interface Repositorio {
  listarLibros(): Promise<(Libro & { disponibles: number })[]>
  crearLibro(datos: Omit<Libro, 'id'>): Promise<Libro>
  buscarLibro(id: number): Promise<Libro | undefined>
  buscarLibroPorIsbn(isbn: string): Promise<Libro | undefined>
  crearSocio(datos: Omit<Socio, 'id'>): Promise<Socio>
  buscarSocio(id: number): Promise<Socio | undefined>
  buscarSocioPorCedula(cedula: string): Promise<Socio | undefined>
  prestamosAbiertosDeSocio(socioId: number): Promise<Prestamo[]>
  prestamosAbiertosDeLibro(libroId: number): Promise<number>
  crearPrestamo(datos: Omit<Prestamo, 'id' | 'devueltoEl'>): Promise<Prestamo>
  buscarPrestamo(id: number): Promise<Prestamo | undefined>
  cerrarPrestamo(id: number, fecha: string): Promise<Prestamo>
  vencidos(hoy: string): Promise<Prestamo[]>
}

export class RepositorioEnMemoria implements Repositorio {
  private libros: Libro[] = []
  private socios: Socio[] = []
  private prestamos: Prestamo[] = []

  async listarLibros() {
    return Promise.all(
      this.libros.map(async (l) => ({ ...l, disponibles: l.ejemplares - (await this.prestamosAbiertosDeLibro(l.id)) })),
    )
  }
  async crearLibro(datos: Omit<Libro, 'id'>) {
    const libro = { id: this.libros.length + 1, ...datos }
    this.libros.push(libro)
    return libro
  }
  async buscarLibro(id: number) {
    return this.libros.find((l) => l.id === id)
  }
  async buscarLibroPorIsbn(isbn: string) {
    return this.libros.find((l) => l.isbn === isbn)
  }
  async crearSocio(datos: Omit<Socio, 'id'>) {
    const socio = { id: this.socios.length + 1, ...datos }
    this.socios.push(socio)
    return socio
  }
  async buscarSocio(id: number) {
    return this.socios.find((s) => s.id === id)
  }
  async buscarSocioPorCedula(cedula: string) {
    return this.socios.find((s) => s.cedula === cedula)
  }
  async prestamosAbiertosDeSocio(socioId: number) {
    return this.prestamos.filter((p) => p.socioId === socioId && p.devueltoEl === null)
  }
  async prestamosAbiertosDeLibro(libroId: number) {
    return this.prestamos.filter((p) => p.libroId === libroId && p.devueltoEl === null).length
  }
  async crearPrestamo(datos: Omit<Prestamo, 'id' | 'devueltoEl'>) {
    const prestamo: Prestamo = { id: this.prestamos.length + 1, devueltoEl: null, ...datos }
    this.prestamos.push(prestamo)
    return prestamo
  }
  async buscarPrestamo(id: number) {
    return this.prestamos.find((p) => p.id === id)
  }
  async cerrarPrestamo(id: number, fecha: string) {
    const p = this.prestamos.find((x) => x.id === id)!
    p.devueltoEl = fecha
    return p
  }
  async vencidos(hoy: string) {
    return this.prestamos.filter((p) => p.devueltoEl === null && p.vence < hoy)
  }
}
