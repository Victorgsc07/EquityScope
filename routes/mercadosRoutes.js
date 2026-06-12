const express = require('express');
const router = express.Router();
const mercadosController = require('../controllers/mercadosController');

router.get('/', mercadosController.getMercados);
router.get('/:id', mercadosController.getMercadoById);

module.exports = router;
