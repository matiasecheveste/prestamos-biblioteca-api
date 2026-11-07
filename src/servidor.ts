/*
 * Préstamos de biblioteca — Matías Nicolás Echeveste Cardozo
 * Punto de entrada: lee la configuración del entorno y levanta el servidor HTTP.
 */
import pg from 'pg'
import { crearApp } from './app.js'
import { RepositorioEnMemoria } from './repositorio.js'
import { RepositorioPostgres } from './repositorio-pg.js'

function requerida(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`)
  return valor
}

const jwtSecreto = requerida('JWT_SECRETO')
if (jwtSecreto.length < 32) throw new Error('JWT_SECRETO debe tener al menos 32 caracteres')

const repositorio = process.env.DATABASE_URL
  ? new RepositorioPostgres(new pg.Pool({ connectionString: process.env.DATABASE_URL }))
  : new RepositorioEnMemoria()

const app = crearApp({ repositorio, jwtSecreto, claveBibliotecario: requerida('CLAVE_BIBLIOTECARIO') })
const puerto = Number(process.env.PUERTO ?? 3000)
app.listen(puerto, () => {
  console.log(`API de préstamos escuchando en el puerto ${puerto} (${process.env.DATABASE_URL ? 'PostgreSQL' : 'memoria'})`)
})
