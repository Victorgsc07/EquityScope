const MercadoModel = require('../models/MercadoModel');

const getMercados = async (req, res) => {
  try { res.json(await MercadoModel.getAll()); }
  catch (error) { res.status(500).json({ message: 'Error al obtener mercados', error: error.message }); }
};

const getMercadoById = async (req, res) => {
  try {
    const mercado = await MercadoModel.getById(req.params.id);
    if (!mercado) return res.status(404).json({ message: 'Mercado no encontrado' });
    res.json(mercado);
  } catch (error) { res.status(500).json({ message: 'Error al obtener mercado', error: error.message }); }
};

module.exports = { getMercados, getMercadoById };
