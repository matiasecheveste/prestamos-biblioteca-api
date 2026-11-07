-- Préstamos de biblioteca — Matías Nicolás Echeveste Cardozo
-- Esquema de la base de datos (PostgreSQL 16).

CREATE TABLE IF NOT EXISTS libros (
  id          SERIAL PRIMARY KEY,
  isbn        VARCHAR(13) NOT NULL UNIQUE,
  titulo      TEXT        NOT NULL,
  autor       TEXT        NOT NULL,
  ejemplares  INTEGER     NOT NULL CHECK (ejemplares >= 0)
);

CREATE TABLE IF NOT EXISTS socios (
  id      SERIAL PRIMARY KEY,
  cedula  VARCHAR(8) NOT NULL UNIQUE,
  nombre  TEXT       NOT NULL
);

CREATE TABLE IF NOT EXISTS prestamos (
  id           SERIAL PRIMARY KEY,
  libro_id     INTEGER NOT NULL REFERENCES libros(id),
  socio_id     INTEGER NOT NULL REFERENCES socios(id),
  desde        DATE    NOT NULL DEFAULT CURRENT_DATE,
  vence        DATE    NOT NULL,
  devuelto_el  DATE,
  CHECK (vence >= desde)
);

CREATE INDEX IF NOT EXISTS prestamos_abiertos_socio ON prestamos (socio_id) WHERE devuelto_el IS NULL;
CREATE INDEX IF NOT EXISTS prestamos_abiertos_libro ON prestamos (libro_id) WHERE devuelto_el IS NULL;
