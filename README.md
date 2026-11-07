# API de préstamos de biblioteca

API REST que gestiona el catálogo, los socios y los préstamos de una biblioteca, con las reglas habituales:
plazo de 14 días, máximo de tres préstamos abiertos por socio, bloqueo si hay préstamos vencidos y multa por
día de atraso.

**Tecnologías:** Node.js 22, Express 5, TypeScript estricto, PostgreSQL 16, Zod, JSON Web Tokens, Vitest,
Supertest, Docker y GitHub Actions.

## Qué demuestra

- **Arquitectura en capas:** las rutas dependen de una interfaz `Repositorio` con dos implementaciones: PostgreSQL
  (consultas parametrizadas) y memoria (pruebas y demostración sin base de datos).
- **Validación de entrada con Zod**, con errores 400 que indican el campo y el motivo.
- **Validaciones del dominio uruguayo:** dígito de control de la cédula de identidad e ISBN-13.
- **Autenticación JWT** (HS256 fijado al verificar) y comparación de claves en tiempo constante.
- **Manejo de errores centralizado** con códigos HTTP coherentes (400, 401, 404, 409, 500).
- **Pruebas** unitarias y de integración HTTP; la CI además aplica el esquema SQL sobre un PostgreSQL real y
  construye la imagen Docker.

## Rutas

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/salud` | público | Estado del servicio |
| POST | `/sesion` | público | Devuelve un token para el personal (`{ "clave": "..." }`) |
| GET | `/libros` | público | Catálogo con ejemplares disponibles |
| POST | `/libros` | token | Alta de libro (`isbn`, `titulo`, `autor`, `ejemplares`) |
| POST | `/socios` | token | Alta de socio (`cedula`, `nombre`) |
| POST | `/prestamos` | token | Nuevo préstamo (`libroId`, `socioId`) |
| POST | `/prestamos/:id/devolucion` | token | Registra la devolución y calcula la multa |
| GET | `/prestamos/vencidos` | token | Préstamos abiertos con plazo vencido |

## Uso

```bash
npm install
npm test                 # pruebas unitarias y de integración
JWT_SECRETO=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
CLAVE_BIBLIOTECARIO=demo npm run dev   # sin DATABASE_URL usa el repositorio en memoria
```

Con Docker y PostgreSQL:

```bash
cp .env.example .env     # completar los valores
docker compose up --build
```

Ejemplo:

```bash
TOKEN=$(curl -s localhost:3000/sesion -H 'content-type: application/json' -d '{"clave":"demo"}' | jq -r .token)
curl -s localhost:3000/libros -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"isbn":"978-0-306-40615-7","titulo":"Física","autor":"Autor","ejemplares":2}'
```

## Estructura

```
src/app.ts             Rutas, validación, autenticación y errores
src/dominio/           Reglas de negocio y validaciones (cédula, ISBN)
src/repositorio*.ts    Contrato e implementaciones (memoria y PostgreSQL)
sql/                   Esquema de la base de datos
tests/                 Pruebas con Vitest y Supertest
```

## Autoría

Desarrollado por **Matías Nicolás Echeveste Cardozo**. Licencia MIT.
