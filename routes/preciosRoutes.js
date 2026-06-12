const express = require('express');
const router = express.Router();
const preciosController = require('../controllers/preciosController');

router.get('/', preciosController.getPrecios);
router.get('/:id', preciosController.getPrecioById);
router.post('/', preciosController.createPrecio);
router.put('/:id', preciosController.updatePrecio);
router.delete('/:id', preciosController.deletePrecio);

module.exports = router;
