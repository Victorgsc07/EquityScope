-- Base de datos para proyecto de Bolsa de Valores con estructura lista para datos reales
-- Los precios históricos se importan con scripts/importarDatosRealesStooq.js
DROP DATABASE IF EXISTS bolsa_valores;
CREATE DATABASE bolsa_valores CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bolsa_valores;

CREATE TABLE sectores (
  id_sector INT AUTO_INCREMENT PRIMARY KEY,
  nombre_sector VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(255)
);

CREATE TABLE mercados (
  id_mercado INT AUTO_INCREMENT PRIMARY KEY,
  nombre_mercado VARCHAR(100) NOT NULL UNIQUE,
  pais VARCHAR(80) NOT NULL,
  moneda VARCHAR(10) NOT NULL
);

CREATE TABLE empresas (
  id_empresa INT AUTO_INCREMENT PRIMARY KEY,
  ticker VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  id_sector INT NOT NULL,
  id_mercado INT NOT NULL,
  pais VARCHAR(80) NOT NULL,
  fecha_fundacion DATE,
  FOREIGN KEY (id_sector) REFERENCES sectores(id_sector),
  FOREIGN KEY (id_mercado) REFERENCES mercados(id_mercado)
);

CREATE TABLE precios_acciones (
  id_precio INT AUTO_INCREMENT PRIMARY KEY,
  id_empresa INT NOT NULL,
  fecha DATE NOT NULL,
  precio_apertura DECIMAL(12,2) NOT NULL,
  precio_cierre DECIMAL(12,2) NOT NULL,
  precio_maximo DECIMAL(12,2) NOT NULL,
  precio_minimo DECIMAL(12,2) NOT NULL,
  volumen BIGINT NOT NULL DEFAULT 0,
  FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE,
  UNIQUE KEY uk_empresa_fecha (id_empresa, fecha)
);

CREATE TABLE dividendos (
  id_dividendo INT AUTO_INCREMENT PRIMARY KEY,
  id_empresa INT NOT NULL,
  fecha_pago DATE NOT NULL,
  dividendo_por_accion DECIMAL(10,4) NOT NULL,
  FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE
);

CREATE INDEX idx_precios_fecha ON precios_acciones(fecha);
CREATE INDEX idx_empresas_ticker ON empresas(ticker);

INSERT INTO sectores (id_sector, nombre_sector, descripcion) VALUES
(1, 'Tecnología', 'Empresas enfocadas en software, hardware, semiconductores y servicios digitales'),
(2, 'Automotriz', 'Empresas fabricantes de automóviles, movilidad y transporte'),
(3, 'Financiero', 'Bancos, aseguradoras y servicios financieros'),
(4, 'Consumo discrecional', 'Empresas de comercio, retail y productos no esenciales'),
(5, 'Consumo básico', 'Empresas de alimentos, bebidas y productos esenciales'),
(6, 'Telecomunicaciones', 'Empresas de telefonía, datos y comunicación'),
(7, 'Materiales', 'Empresas de construcción, cemento, minería y materias primas'),
(8, 'Entretenimiento', 'Empresas de streaming, medios y entretenimiento digital');

INSERT INTO mercados (id_mercado, nombre_mercado, pais, moneda) VALUES
(1, 'NASDAQ', 'Estados Unidos', 'USD'),
(2, 'NYSE', 'Estados Unidos', 'USD'),
(3, 'BMV', 'México', 'MXN');

INSERT INTO empresas (id_empresa, ticker, nombre, id_sector, id_mercado, pais, fecha_fundacion) VALUES
(1, 'AAPL', 'Apple Inc.', 1, 1, 'Estados Unidos', '1976-04-01'),
(2, 'MSFT', 'Microsoft Corporation', 1, 1, 'Estados Unidos', '1975-04-04'),
(3, 'NVDA', 'NVIDIA Corporation', 1, 1, 'Estados Unidos', '1993-04-05'),
(4, 'TSLA', 'Tesla Inc.', 2, 1, 'Estados Unidos', '2003-07-01'),
(5, 'AMZN', 'Amazon.com Inc.', 4, 1, 'Estados Unidos', '1994-07-05'),
(6, 'GOOGL', 'Alphabet Inc.', 1, 1, 'Estados Unidos', '1998-09-04'),
(7, 'JPM', 'JPMorgan Chase & Co.', 3, 2, 'Estados Unidos', '2000-12-01'),
(8, 'WMT', 'Walmart Inc.', 5, 2, 'Estados Unidos', '1962-07-02'),
(9, 'KO', 'The Coca-Cola Company', 5, 2, 'Estados Unidos', '1892-01-29'),
(10, 'NFLX', 'Netflix Inc.', 8, 1, 'Estados Unidos', '1997-08-29'),
(11, 'META', 'Meta Platforms Inc.', 1, 1, 'Estados Unidos', '2004-02-04'),
(12, 'DIS', 'The Walt Disney Company', 8, 2, 'Estados Unidos', '1923-10-16');

CREATE OR REPLACE VIEW vista_ultimos_precios AS
SELECT p.*
FROM precios_acciones p
JOIN (
  SELECT id_empresa, MAX(fecha) AS fecha_reciente
  FROM precios_acciones
  GROUP BY id_empresa
) ult ON p.id_empresa = ult.id_empresa AND p.fecha = ult.fecha_reciente;

USE bolsa_valores;

USE bolsa_valores;

SELECT COUNT(*) AS empresas FROM empresas;
