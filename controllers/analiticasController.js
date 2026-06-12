const AnaliticaModel = require('../models/AnaliticaModel');

const handle = (fn, errorMessage) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (error) { res.status(500).json({ message: errorMessage, error: error.message }); }
};

const resumen = handle(() => AnaliticaModel.resumen(), 'Error al obtener el resumen general');
const mayorSubida = handle(() => AnaliticaModel.mayorSubida(), 'Error al obtener la empresa con mayor subida');
const topMayoresSubidas = handle((req) => AnaliticaModel.topMayoresSubidas(req.query.limit || 5), 'Error al obtener el top de mayores subidas');
const mayorCaida = handle(() => AnaliticaModel.mayorCaida(), 'Error al obtener la mayor caída');
const topMayoresCaidas = handle((req) => AnaliticaModel.topMayoresCaidas(req.query.limit || 5), 'Error al obtener el top de mayores caídas');
const mayorVariacion = handle(() => AnaliticaModel.mayorVariacion(), 'Error al obtener la acción con mayor variación');
const accionesMasVolatiles = handle((req) => AnaliticaModel.accionesMasVolatiles(req.query.limit || 5), 'Error al obtener acciones más volátiles');
const accionesMasEstables = handle((req) => AnaliticaModel.accionesMasEstables(req.query.limit || 5), 'Error al obtener acciones más estables');
const mayorPrecioHistorico = handle(() => AnaliticaModel.mayorPrecioHistorico(), 'Error al obtener el mayor precio histórico');
const accionMasCaraActual = handle(() => AnaliticaModel.accionMasCaraActual(), 'Error al obtener la acción más cara actual');
const accionMasBarataActual = handle(() => AnaliticaModel.accionMasBarataActual(), 'Error al obtener la acción más barata actual');
const mayorVolumen = handle(() => AnaliticaModel.mayorVolumen(), 'Error al obtener la empresa con mayor volumen');
const promedioPrecioPorEmpresa = handle(() => AnaliticaModel.promedioPrecioPorEmpresa(), 'Error al obtener el promedio por empresa');
const rendimientoPorSector = handle(() => AnaliticaModel.rendimientoPorSector(), 'Error al obtener rendimiento por sector');
const rendimientoPorMercado = handle(() => AnaliticaModel.rendimientoPorMercado(), 'Error al obtener rendimiento por mercado');
const historialPorTicker = handle((req) => AnaliticaModel.historialPorTicker(req.params.ticker.toUpperCase()), 'Error al obtener historial por ticker');
const compararEmpresas = handle((req) => AnaliticaModel.compararEmpresas(req.query.tickers || ''), 'Error al comparar empresas');
const buscar = handle((req) => AnaliticaModel.buscar(req.query.texto || ''), 'Error al buscar empresas');

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
