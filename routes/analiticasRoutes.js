const express = require('express');
const router = express.Router();
const analiticasController = require('../controllers/analiticasController');

router.get('/resumen', analiticasController.resumen);
router.get('/mayor-subida', analiticasController.mayorSubida);
router.get('/top-mayores-subidas', analiticasController.topMayoresSubidas);
router.get('/mayor-caida', analiticasController.mayorCaida);
router.get('/top-mayores-caidas', analiticasController.topMayoresCaidas);
router.get('/mayor-variacion', analiticasController.mayorVariacion);
router.get('/acciones-mas-volatiles', analiticasController.accionesMasVolatiles);
router.get('/acciones-mas-estables', analiticasController.accionesMasEstables);
router.get('/mayor-precio-historico', analiticasController.mayorPrecioHistorico);
router.get('/accion-mas-cara-actual', analiticasController.accionMasCaraActual);
router.get('/accion-mas-barata-actual', analiticasController.accionMasBarataActual);
router.get('/mayor-volumen', analiticasController.mayorVolumen);
router.get('/promedio-precio-por-empresa', analiticasController.promedioPrecioPorEmpresa);
router.get('/rendimiento-por-sector', analiticasController.rendimientoPorSector);
router.get('/rendimiento-por-mercado', analiticasController.rendimientoPorMercado);
router.get('/historial/:ticker', analiticasController.historialPorTicker);
router.get('/comparar', analiticasController.compararEmpresas);
router.get('/buscar', analiticasController.buscar);

module.exports = router;
