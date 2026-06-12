const express = require('express');
const router = express.Router();

const prediccionesController = require('../controllers/prediccionesController');

router.get('/tickers', prediccionesController.getTickersPredicciones);

router.get('/promedio-movil/:ticker', prediccionesController.getPromedioMovil);

router.get('/regresion-lineal/:ticker', prediccionesController.getRegresionLineal);

router.get('/completa/:ticker', prediccionesController.getPrediccionCompleta);

module.exports = router;