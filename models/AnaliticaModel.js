const db = require('../config/db');

const rendimientoBaseQuery = `
  WITH precios_ordenados AS (
    SELECT
      e.id_empresa,
      e.ticker,
      e.nombre,
      s.nombre_sector,
      m.nombre_mercado,
      p.fecha,
      p.precio_cierre,
      ROW_NUMBER() OVER (PARTITION BY e.id_empresa ORDER BY p.fecha ASC) AS rn_inicio,
      ROW_NUMBER() OVER (PARTITION BY e.id_empresa ORDER BY p.fecha DESC) AS rn_fin
    FROM empresas e
    JOIN sectores s ON e.id_sector = s.id_sector
    JOIN mercados m ON e.id_mercado = m.id_mercado
    JOIN precios_acciones p ON e.id_empresa = p.id_empresa
  ), resumen AS (
    SELECT
      id_empresa,
      ticker,
      nombre,
      nombre_sector,
      nombre_mercado,
      MAX(CASE WHEN rn_inicio = 1 THEN fecha END) AS fecha_inicial,
      MAX(CASE WHEN rn_fin = 1 THEN fecha END) AS fecha_final,
      MAX(CASE WHEN rn_inicio = 1 THEN precio_cierre END) AS precio_inicial,
      MAX(CASE WHEN rn_fin = 1 THEN precio_cierre END) AS precio_final
    FROM precios_ordenados
    GROUP BY id_empresa, ticker, nombre, nombre_sector, nombre_mercado
  )
  SELECT
    *,
    ROUND(precio_final - precio_inicial, 2) AS cambio_absoluto,
    ROUND(((precio_final - precio_inicial) / precio_inicial) * 100, 2) AS cambio_porcentual
  FROM resumen
`;

const resumen = async () => {
  const [[empresas]] = await db.query('SELECT COUNT(*) AS total_empresas FROM empresas');
  const [[precios]] = await db.query('SELECT COUNT(*) AS total_registros_precios FROM precios_acciones');
  const [[sectores]] = await db.query('SELECT COUNT(*) AS total_sectores FROM sectores');
  const [[mercados]] = await db.query('SELECT COUNT(*) AS total_mercados FROM mercados');
  const [[rango]] = await db.query('SELECT MIN(fecha) AS fecha_inicial, MAX(fecha) AS fecha_final FROM precios_acciones');
  return { ...empresas, ...precios, ...sectores, ...mercados, ...rango };
};

const mayorSubida = async () => {
  const [rows] = await db.query(`${rendimientoBaseQuery} ORDER BY cambio_porcentual DESC LIMIT 1`);
  return rows[0];
};

const topMayoresSubidas = async (limit = 5) => {
  const [rows] = await db.query(`${rendimientoBaseQuery} ORDER BY cambio_porcentual DESC LIMIT ?`, [Number(limit)]);
  return rows;
};

const mayorCaida = async () => {
  const [rows] = await db.query(`${rendimientoBaseQuery} ORDER BY cambio_porcentual ASC LIMIT 1`);
  return rows[0];
};

const topMayoresCaidas = async (limit = 5) => {
  const [rows] = await db.query(`${rendimientoBaseQuery} ORDER BY cambio_porcentual ASC LIMIT ?`, [Number(limit)]);
  return rows;
};

const mayorVariacion = async () => {
  const [rows] = await db.query(`
    SELECT e.nombre, e.ticker,
           ROUND(MAX(p.precio_maximo), 2) AS mayor_precio,
           ROUND(MIN(p.precio_minimo), 2) AS menor_precio,
           ROUND(MAX(p.precio_maximo) - MIN(p.precio_minimo), 2) AS variacion_absoluta,
           ROUND(((MAX(p.precio_maximo) - MIN(p.precio_minimo)) / MIN(p.precio_minimo)) * 100, 2) AS variacion_porcentual
    FROM empresas e
    JOIN precios_acciones p ON e.id_empresa = p.id_empresa
    GROUP BY e.id_empresa, e.nombre, e.ticker
    ORDER BY variacion_porcentual DESC
    LIMIT 1
  `);
  return rows[0];
};

const accionesMasVolatiles = async (limit = 5) => {
  const [rows] = await db.query(`
    SELECT e.nombre, e.ticker,
           ROUND(AVG((p.precio_maximo - p.precio_minimo) / p.precio_apertura * 100), 2) AS volatilidad_promedio_diaria_porcentaje,
           ROUND(MAX(p.precio_maximo) - MIN(p.precio_minimo), 2) AS rango_total
    FROM empresas e
    JOIN precios_acciones p ON e.id_empresa = p.id_empresa
    GROUP BY e.id_empresa, e.nombre, e.ticker
    ORDER BY volatilidad_promedio_diaria_porcentaje DESC
    LIMIT ?
  `, [Number(limit)]);
  return rows;
};

const accionesMasEstables = async (limit = 5) => {
  const [rows] = await db.query(`
    SELECT e.nombre, e.ticker,
           ROUND(AVG((p.precio_maximo - p.precio_minimo) / p.precio_apertura * 100), 2) AS volatilidad_promedio_diaria_porcentaje,
           ROUND(MAX(p.precio_maximo) - MIN(p.precio_minimo), 2) AS rango_total
    FROM empresas e
    JOIN precios_acciones p ON e.id_empresa = p.id_empresa
    GROUP BY e.id_empresa, e.nombre, e.ticker
    ORDER BY volatilidad_promedio_diaria_porcentaje ASC
    LIMIT ?
  `, [Number(limit)]);
  return rows;
};

const mayorPrecioHistorico = async () => {
  const [rows] = await db.query(`
    SELECT e.nombre, e.ticker, p.fecha, p.precio_maximo
    FROM empresas e
    JOIN precios_acciones p ON e.id_empresa = p.id_empresa
    ORDER BY p.precio_maximo DESC
    LIMIT 1
  `);
  return rows[0];
};

const accionMasCaraActual = async () => {
  const [rows] = await db.query(`
    SELECT e.nombre, e.ticker, p.fecha, p.precio_cierre
    FROM precios_acciones p
    JOIN empresas e ON p.id_empresa = e.id_empresa
    JOIN (
      SELECT id_empresa, MAX(fecha) AS fecha_reciente
      FROM precios_acciones
      GROUP BY id_empresa
    ) ult ON p.id_empresa = ult.id_empresa AND p.fecha = ult.fecha_reciente
    ORDER BY p.precio_cierre DESC
    LIMIT 1
  `);
  return rows[0];
};

const accionMasBarataActual = async () => {
  const [rows] = await db.query(`
    SELECT e.nombre, e.ticker, p.fecha, p.precio_cierre
    FROM precios_acciones p
    JOIN empresas e ON p.id_empresa = e.id_empresa
    JOIN (
      SELECT id_empresa, MAX(fecha) AS fecha_reciente
      FROM precios_acciones
      GROUP BY id_empresa
    ) ult ON p.id_empresa = ult.id_empresa AND p.fecha = ult.fecha_reciente
    ORDER BY p.precio_cierre ASC
    LIMIT 1
  `);
  return rows[0];
};

const mayorVolumen = async () => {
  const [rows] = await db.query(`
    SELECT e.nombre, e.ticker, SUM(p.volumen) AS volumen_total
    FROM empresas e
    JOIN precios_acciones p ON e.id_empresa = p.id_empresa
    GROUP BY e.id_empresa, e.nombre, e.ticker
    ORDER BY volumen_total DESC
    LIMIT 1
  `);
  return rows[0];
};

const promedioPrecioPorEmpresa = async () => {
  const [rows] = await db.query(`
    SELECT e.nombre, e.ticker,
           ROUND(AVG(p.precio_cierre), 2) AS precio_promedio_cierre,
           ROUND(MIN(p.precio_cierre), 2) AS menor_cierre,
           ROUND(MAX(p.precio_cierre), 2) AS mayor_cierre
    FROM empresas e
    JOIN precios_acciones p ON e.id_empresa = p.id_empresa
    GROUP BY e.id_empresa, e.nombre, e.ticker
    ORDER BY precio_promedio_cierre DESC
  `);
  return rows;
};

const rendimientoPorSector = async () => {
  const [rows] = await db.query(`
    WITH rendimientos AS (
      ${rendimientoBaseQuery}
    )
    SELECT nombre_sector,
           ROUND(AVG(cambio_porcentual), 2) AS rendimiento_promedio_sector,
           COUNT(*) AS total_empresas
    FROM rendimientos
    GROUP BY nombre_sector
    ORDER BY rendimiento_promedio_sector DESC
  `);
  return rows;
};

const rendimientoPorMercado = async () => {
  const [rows] = await db.query(`
    WITH rendimientos AS (
      ${rendimientoBaseQuery}
    )
    SELECT nombre_mercado,
           ROUND(AVG(cambio_porcentual), 2) AS rendimiento_promedio_mercado,
           COUNT(*) AS total_empresas
    FROM rendimientos
    GROUP BY nombre_mercado
    ORDER BY rendimiento_promedio_mercado DESC
  `);
  return rows;
};

const historialPorTicker = async (ticker) => {
  const [rows] = await db.query(`
    SELECT e.ticker, e.nombre, p.fecha, p.precio_apertura, p.precio_cierre,
           p.precio_maximo, p.precio_minimo, p.volumen
    FROM empresas e
    JOIN precios_acciones p ON e.id_empresa = p.id_empresa
    WHERE e.ticker = ?
    ORDER BY p.fecha ASC
  `, [ticker]);
  return rows;
};

const compararEmpresas = async (tickers) => {
  const cleanTickers = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  if (cleanTickers.length === 0) return [];

  const placeholders = cleanTickers.map(() => '?').join(',');
  const [rows] = await db.query(`
    WITH rendimientos AS (
      ${rendimientoBaseQuery}
    )
    SELECT *
    FROM rendimientos
    WHERE ticker IN (${placeholders})
    ORDER BY cambio_porcentual DESC
  `, cleanTickers);
  return rows;
};

const buscar = async (texto) => {
  const like = `%${texto}%`;
  const [rows] = await db.query(`
    SELECT e.id_empresa, e.ticker, e.nombre, e.pais, s.nombre_sector, m.nombre_mercado
    FROM empresas e
    JOIN sectores s ON e.id_sector = s.id_sector
    JOIN mercados m ON e.id_mercado = m.id_mercado
    WHERE e.nombre LIKE ? OR e.ticker LIKE ? OR s.nombre_sector LIKE ? OR m.nombre_mercado LIKE ?
    ORDER BY e.nombre
  `, [like, like, like, like]);
  return rows;
};

module.exports = {
  resumen,
  mayorSubida,
  topMayoresSubidas,
  mayorCaida,
  topMayoresCaidas,
  mayorVariacion,
  accionesMasVolatiles,
  accionesMasEstables,
  mayorPrecioHistorico,
  accionMasCaraActual,
  accionMasBarataActual,
  mayorVolumen,
  promedioPrecioPorEmpresa,
  rendimientoPorSector,
  rendimientoPorMercado,
  historialPorTicker,
  compararEmpresas,
  buscar
};
