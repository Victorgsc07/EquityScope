const express = require('express');
const router = express.Router();
const sectoresController = require('../controllers/sectoresController');

router.get('/', sectoresController.getSectores);
router.get('/:id', sectoresController.getSectorById);

module.exports = router;
