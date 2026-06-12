const PrecioModel = require('../models/PrecioModel');

const getPrecios = async (req, res) => {
  try { res.json(await PrecioModel.getAll()); }
  catch (error) { res.status(500).json({ message: 'Error al obtener precios', error: error.message }); }
};

const getPrecioById = async (req, res) => {
  try {
    const precio = await PrecioModel.getById(req.params.id);
    if (!precio) return res.status(404).json({ message: 'Registro de precio no encontrado' });
    res.json(precio);
  } catch (error) { res.status(500).json({ message: 'Error al obtener precio', error: error.message }); }
};

const createPrecio = async (req, res) => {
  try { res.status(201).json(await PrecioModel.create(req.body)); }
  catch (error) { res.status(500).json({ message: 'Error al crear precio', error: error.message }); }
};

const updatePrecio = async (req, res) => {
  try {
    const precio = await PrecioModel.update(req.params.id, req.body);
    if (!precio) return res.status(404).json({ message: 'Registro de precio no encontrado' });
    res.json(precio);
  } catch (error) { res.status(500).json({ message: 'Error al actualizar precio', error: error.message }); }
};

const deletePrecio = async (req, res) => {
  try {
    const affectedRows = await PrecioModel.remove(req.params.id);
    if (affectedRows === 0) return res.status(404).json({ message: 'Registro de precio no encontrado' });
    res.json({ message: 'Precio eliminado correctamente' });
  } catch (error) { res.status(500).json({ message: 'Error al eliminar precio', error: error.message }); }
};

module.exports = { getPrecios, getPrecioById, createPrecio, updatePrecio, deletePrecio };
